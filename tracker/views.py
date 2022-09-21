import json
from datetime import datetime

from django.shortcuts import render
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth

from rest_framework import status
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import api_view
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.pagination import PageNumberPagination

from django_filters.rest_framework import DjangoFilterBackend

from tracker.models import Expense, ExpenseCategory, PlaidItem, ConfigParameter
from tracker.serializers import (
    ExpenseSerializer,
    ExpenseCategorySerializer,
    PlaidItemSerializer,
    ConfigParameterSerializer,
)

import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.item_public_token_exchange_request import (
    ItemPublicTokenExchangeRequest,
)
from plaid.model.products import Products
from plaid.model.country_code import CountryCode


class ExpensePagination(PageNumberPagination):
    page_size = 500


class ConfigParameterViewSet(ModelViewSet):
    queryset = ConfigParameter.objects.all()
    serializer_class = ConfigParameterSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["key"]


class PlaidItemViewSet(ModelViewSet):
    queryset = PlaidItem.objects.all()
    serializer_class = PlaidItemSerializer


class ExpenseViewSet(ModelViewSet):
    queryset = Expense.objects.select_related("category_id").all()
    serializer_class = ExpenseSerializer
    pagination_class = ExpensePagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category_id", "amount", "date", "transaction_id", "state"]
    search_fields = ["name", "transaction_id", "category_id__name"]
    ordering_fields = ["amount", "write_date"]

    def get_serializer_context(self):
        return {"request": self.request}


class ExpenseCategoryViewSet(ModelViewSet):
    queryset = ExpenseCategory.objects.annotate(
        expenses_count=Count("expense_ids")
    ).all()
    serializer_class = ExpenseCategorySerializer

    def destroy(self, request, *args, **kwargs):
        if Expense.objects.filter(category_id=kwargs["pk"]).count() > 0:
            return Response(
                {
                    "error": "Category cannot be deleted because it is associated to an expense."
                },
                status=status.HTTP_405_METHOD_NOT_ALLOWED,
            )
        return super().destroy(request, *args, **kwargs)


def generate_plaid_client():
    client_id = ConfigParameter.objects.filter(key="PLAID_CLIENT_ID")[0].value
    secret = ConfigParameter.objects.filter(key="PLAID_SECRET")[0].value
    plaid_env = ConfigParameter.objects.filter(key="PLAID_ENV")[0].value

    configuration = plaid.Configuration(
        host=plaid_env,
        api_key={
            "clientId": client_id,
            "secret": secret,
        },
    )
    api_client = plaid.ApiClient(configuration)
    client = plaid_api.PlaidApi(api_client)
    return client, client_id


@api_view(["GET", "POST"])
def testEndpoint(request, *args, **kwargs):
    if request.method == "GET":
        message = "%s" % ("ok")
        return Response(message)
    if request.method == "POST":
        return Response(request.data)


@api_view(["POST"])
def plaidLinkToken(request):
    if request.method == "POST":
        client, client_id = generate_plaid_client()
        request = LinkTokenCreateRequest(
            products=[Products("transactions")],
            client_name="Nomad",
            country_codes=[CountryCode("US")],
            language="en",
            user=LinkTokenCreateRequestUser(client_user_id=client_id),
        )
        response = client.link_token_create(request)
        return Response(response.to_dict())


@api_view(["POST"])
def plaidExchangeToken(request):
    if request.method == "POST":
        public_token = request.data["public_token"]
        client, client_id = generate_plaid_client()
        exchange_request = ItemPublicTokenExchangeRequest(public_token=public_token)
        response = client.item_public_token_exchange(exchange_request)
        create_dict = {
            "access_token": response["access_token"],
            "item_id": response["item_id"],
            "request_id": response["request_id"],
        }
        PlaidItem.objects.create(**create_dict)
        return Response("Bank Link Successfully Created")


@api_view(["GET"])
def getPlaidTransactions(request):
    if request.method == "GET":
        message = ""
        client, client_id = generate_plaid_client()
        plaid_items = PlaidItem.objects.all()
        transaction_count = 0
        for item in plaid_items:
            request = TransactionsGetRequest(
                access_token=item.access_token,
                start_date=datetime.strptime("2022-01-01", "%Y-%m-%d").date(),
                end_date=datetime.strptime("2022-01-15", "%Y-%m-%d").date(),
            )
            try:
                response = client.transactions_get(request)
                response_dict = response.to_dict()
                message += "Link Success ID %s\n" % (item.id)
            except plaid.ApiException as e:
                response_dict = json.loads(e.body)
                message += "Link Error ID %s: %s\n" % (
                    item.id,
                    str(response_dict),
                )

            for transaction in response_dict["transactions"]:
                transaction_count += 1
                expenese_category = ExpenseCategory.objects.filter(id=7)[0]
                expense = Expense.objects.filter(
                    transaction_id=transaction["transaction_id"]
                )
                values = {
                    "transaction_id": transaction["transaction_id"],
                    "category_id": expenese_category,
                    "name": transaction["name"],
                    "plaid_account_id": transaction["account_id"],
                    "plaid_merchant_name": transaction["merchant_name"],
                    "plaid_payment_channel": transaction["payment_channel"],
                    "plaid_iso_currency_code": transaction["iso_currency_code"],
                    "date": transaction["date"],
                    "amount": transaction["amount"],
                    "state": "pending",
                }
                if expense and expense[0].state not in ["ignore"]:
                    expense.update(**values)
                else:
                    Expense.objects.create(**values)
        message += "%s Lines Synced" % (transaction_count)
        return Response(message)


def dashboard(self):
    expense_set = (
        Expense.objects.filter(amount__gte=0)
        .order_by("-date")
        .values("date", "transaction_id", "category_id__name", "name", "amount")
    )
    category_metrics = {
        "expenses_sum": Sum("amount"),
    }
    category_set = (
        expense_set.values("category_id__name")
        .annotate(**category_metrics)
        .order_by("category_id__name")
    )
    month_set = (
        Expense.objects.filter(amount__gte=0)
        .annotate(month=TruncMonth("date"))
        .values("month")
        .annotate(total=Sum("amount"))
    )

    dashboard_values = {
        "expenses": list(expense_set),
        "categories": list(category_set),
        "months": list(month_set),
    }

    return render(self, "dashboard.html", dashboard_values)
