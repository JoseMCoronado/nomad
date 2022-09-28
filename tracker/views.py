import json
import requests
from datetime import datetime, timedelta

from django.shortcuts import render
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth

from rest_framework import status
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import api_view
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.pagination import PageNumberPagination

from django_filters.rest_framework import DjangoFilterBackend

from tracker.models import (
    Expense,
    ExpenseCategory,
    PlaidItem,
    ConfigParameter,
    ConfigCountry,
    ConfigState,
    ConfigCity,
    TrackerStay,
    ExpenseItem,
)
from tracker.serializers import (
    ExpenseSerializer,
    ExpenseCategorySerializer,
    PlaidItemSerializer,
    ConfigParameterSerializer,
    ConfigCountrySerializer,
    ConfigStateSerializer,
    ConfigCitySerializer,
    TrackerStaySerializer,
    ExpenseItemSerializer,
)

import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.item_public_token_exchange_request import (
    ItemPublicTokenExchangeRequest,
)
from plaid.model.products import Products
from plaid.model.country_code import CountryCode


class CityPagination(PageNumberPagination):
    page_size = 200


class ExpensePagination(PageNumberPagination):
    page_size = 500


class ConfigCountryViewSet(ModelViewSet):
    queryset = ConfigCountry.objects.all()
    serializer_class = ConfigCountrySerializer


class ConfigStateViewSet(ModelViewSet):
    queryset = ConfigState.objects.all()
    serializer_class = ConfigStateSerializer


class ConfigCityViewSet(ModelViewSet):
    queryset = ConfigCity.objects.prefetch_related("state_id__country_id").all()
    serializer_class = ConfigCitySerializer
    pagination_class = CityPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["state_id"]
    search_fields = ["name"]
    ordering_fields = ["name", "write_date"]

    def get_serializer_context(self):
        return {"request": self.request}


class TrackerStayViewSet(ModelViewSet):
    queryset = TrackerStay.objects.select_related("city_id").all()
    serializer_class = TrackerStaySerializer


class ExpenseItemViewSet(ModelViewSet):
    queryset = ExpenseItem.objects.select_related("expense_id__stay_id__city_id").all()
    serializer_class = ExpenseItemSerializer

    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = [
        "expense_id",
        "amount",
        "date",
    ]
    search_fields = ["expense_id"]


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
    filterset_fields = [
        "category_id",
        "amount",
        "date",
        "transaction_id",
        "state",
        "stay_id",
    ]
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


@api_view(["GET"])
def get_dates(request, *args, **kwargs):
    if request.method == "GET":
        heatmap_data = request.GET.get("viewHeatmapState", "expenses")
        heatmap_expense_data = request.GET.get("viewHeatmapExpensesState", "all")
        all_expense_data = heatmap_expense_data in ["all", "none"]
        non_misc_budget = 166
        misc_budget = 196
        budget = 0
        budget_message = ""
        if heatmap_data == "expenses":
            if heatmap_expense_data in ["all", "transportation", "lodging", "business"]:
                budget_message += "T.L.B. Budget: %s<br/>" % (non_misc_budget,)
                budget += non_misc_budget
            if heatmap_expense_data in ["all", "misc"]:
                budget_message += "Misc Budget: %s<br/>" % (misc_budget,)
                budget += misc_budget
        dateList = []
        stays = list(
            TrackerStay.objects.select_related(
                "city_id", "city_id__state_id", "city_id__state_id__country_id"
            ).all()
        )
        if not all_expense_data:
            expenses = list(
                ExpenseItem.objects.select_related("expense_id__category_id").filter(
                    expense_id__expense_classification=heatmap_expense_data
                )
            )
        else:
            expenses = list(
                ExpenseItem.objects.select_related("expense_id__category_id").all()
            )
        date_start_list = [x.date_start for x in stays]
        date_end_list = [x.date_end for x in stays]
        date = min(date_start_list)
        latest = max(date_end_list)
        now = datetime.now().date()
        booking_threshold_min = now + timedelta(days=30)
        booking_threshold_max = now + timedelta(days=60)
        absolute_latest = max((now + timedelta(days=730)), latest)
        schengen_count = 0
        while date < absolute_latest:
            schengen_diff = 0
            message = ""
            transport_msg = lodging_msg = ""
            message += budget_message
            if schengen_count > 0:
                schengen_diff = -1
            city_stay = False
            expense_list = [
                expobj.amount
                for expobj in filter(
                    lambda expense: date == expense.date,
                    expenses,
                )
            ]
            amount = sum(expense_list)
            count = 0
            if heatmap_data == "expenses":
                if budget <= 0:
                    if abs(amount) > 100:
                        count = 9
                    elif abs(amount) > 50:
                        count = 8
                    elif abs(amount) > 25:
                        count = 7
                    elif abs(amount) > 0:
                        count = 6
                else:
                    ratio = amount / budget
                    if ratio >= 2:
                        count = 9
                    elif ratio >= 1.75:
                        count = 8
                    elif ratio >= 1.5:
                        count = 7
                    elif ratio >= 1.25:
                        count = 6
                    elif ratio >= 1:
                        count = 5
                    elif ratio >= 0.75:
                        count = 4
                    elif ratio >= 0.5:
                        count = 3
                    elif ratio >= 0.25:
                        count = 2
                    elif ratio > 0:
                        count = 1

            stay_list = []
            if stays:
                stay_list = [
                    stayobj
                    for stayobj in filter(
                        lambda stay: date >= stay.date_start and date <= stay.date_end,
                        stays,
                    )
                ]

                if stay_list:
                    if heatmap_data == "booking":
                        count = min(len(stay_list), 2)
                        if count > 1:
                            transport_msg = "United UA8607 6 PM"
                            lodging_msg = "Wyndham San Diego Bayside Conf #521857430"
                    if any(
                        [
                            s.city_id.state_id.country_id.schengen_country
                            for s in stay_list
                        ]
                    ):
                        schengen_diff = 1
                    city_stay = " / ".join(
                        [
                            "%s %s"
                            % (
                                s.city_id.state_id.country_id.unicodeFlag,
                                s.city_id.name,
                            )
                            for s in stay_list
                        ]
                    )
                else:
                    if heatmap_data == "booking":
                        if date < datetime.now().date():
                            count = 0
                        elif booking_threshold_min > date:
                            count = 3
                        elif booking_threshold_max > date:
                            count = 4

            schengen_count += schengen_diff
            if not city_stay:
                city_stay = "Not Booked"
            if heatmap_data == "schengen":
                message += "Schengen Days: %s<br/>" % (schengen_count)
                if schengen_count >= 90:
                    count = 7
                elif schengen_count >= 75:
                    count = 6
                elif schengen_count >= 60:
                    count = 5
                elif schengen_count >= 45:
                    count = 4
                elif schengen_count >= 30:
                    count = 3
                elif schengen_count >= 15:
                    count = 2
                elif schengen_count > 0:
                    count = 1
            if date == now:
                count = -1
            date_string = "%s %s" % (date.strftime("%m/%d/%y"), date.strftime("%A"))
            budget_diff = budget - amount
            stay_record = False
            if stay_list:
                stay_record = stay_list[-1].id
            dateDict = {
                "date": date,
                "dateString": date_string,
                "cityStay": city_stay,
                "stayId": stay_record,
                "totalAmount": amount,
                "budget": budget,
                "budgetDiff": budget_diff,
                "count": count,
                "schengenCount": schengen_count,
                "transportMsg": transport_msg,
                "lodgingMsg": lodging_msg,
                "message": message,
            }
            dateList.append(dateDict)
            date += timedelta(days=1)
        return Response(dateList)


@api_view(["GET"])
def getCountries(request, *args, **kwargs):
    if request.method == "GET":
        url = "https://countriesnow.space/api/v0.1/countries/info?returns=currency,flag,unicodeFlag,dialCode,iso3"
        r = requests.get(url)
        countries = r.json()
        schengen_countries = [
            "Germany",
            "Austria",
            "Belgium",
            "Czech Republic",
            "Denmark",
            "Estonia",
            "Finland",
            "Franc",
            "Greec",
            "Hungary",
            "Iceland",
            "Italy",
            "Latvia",
            "Liechtenstein",
            "Lithuania",
            "Luxembourg",
            "Malta",
            "Netherlands",
            "Norway",
            "Poland",
            "Portugal",
            "Slovakia",
            "Slovenia",
            "Spain",
            "Sweden",
            "Switzerland",
        ]
        for country in countries["data"]:
            country_record = ConfigCountry.objects.filter(name=country["name"])
            schengen = False
            if country["name"] in schengen_countries:
                schengen = True
            values = {
                "name": country["name"],
                "currency": country["currency"] if "currency" in country else "",
                "unicodeFlag": country["unicodeFlag"]
                if "unicodeFlag" in country
                else "",
                "flag": country["flag"] if "flag" in country else "",
                "dialcode": country["dialCode"] if "dialCode" in country else "",
                "schengen_country": schengen,
            }
            if country_record:
                country_record.update(**values)
            else:
                ConfigCountry.objects.create(**values)
        return Response(len(countries))


@api_view(["GET"])
def getStates(request, *args, **kwargs):
    if request.method == "GET":
        url = "https://countriesnow.space/api/v0.1/countries/states"
        city_url = "https://countriesnow.space/api/v0.1/countries/state/cities"

        countries = ConfigCountry.objects.all()
        states_updated = 0
        cities_updated = 0
        for country in countries:
            msg = "%s: Processing" % (country.name)
            print(msg)
            data = {
                "country": country.name,
            }
            r = requests.post(url, data=data)
            data = r.json()
            if "data" in data:
                msg = "%s: Data found" % (country.name)
                print(msg)
                data = data["data"]
                country.iso2 = data["iso2"]
                country.iso3 = data["iso3"]
                country.save()
                msg = "%s: Updated Data" % (country.name)
                print(msg)
                for state in data["states"]:
                    msg = "%s - %s: Processing" % (country.name, state["name"])
                    print(msg)
                    states_updated += 1
                    state_record = ConfigState.objects.filter(
                        state_code=state["state_code"], name=state["name"]
                    )
                    values = {
                        "name": state["name"],
                        "country_id": country,
                        "state_code": state["state_code"]
                        if "state_code" in state
                        else "",
                    }
                    try:
                        if state_record:
                            state_record.update(**values)
                            state_record = state_record[0]
                        else:
                            state_record = ConfigState.objects.create(**values)
                    except Exception as e:
                        print(e)
                        continue
                    # Get cities
                    city_data = {
                        "country": country.name,
                        "state": state_record.name,
                    }
                    city_r = requests.post(city_url, data=city_data)
                    city_data = city_r.json()
                    if "data" in city_data:
                        for city in city_data["data"]:
                            cities_updated += 1
                            msg = "%s - %s - %s: Processing" % (
                                country.name,
                                state["name"],
                                city,
                            )
                            print(msg)
                            city_record = ConfigCity.objects.filter(
                                state_id=state_record, name=city
                            )
                            values = {
                                "name": city,
                                "state_id": state_record,
                            }
                            try:
                                if city_record:
                                    city_record.update(**values)
                                else:
                                    ConfigCity.objects.create(**values)
                            except Exception as e:
                                print(e)

        resp_msg = "Update Complete: States (%s) Cities (%s)" % (
            states_updated,
            cities_updated,
        )
        return Response(resp_msg)


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
def getPlaidTransactionsForDates(request):
    if request.method == "GET":
        message = ""
        client, client_id = generate_plaid_client()
        plaid_items = PlaidItem.objects.all()
        transaction_count = 0
        now = datetime.now().strftime("%Y-%m-%d")
        start_data = request.GET.get("start_date", now)
        end_date = request.GET.get("end_date", now)
        for item in plaid_items:
            request = TransactionsGetRequest(
                access_token=item.access_token,
                start_date=datetime.strptime(start_data, "%Y-%m-%d").date(),
                end_date=datetime.strptime(end_date, "%Y-%m-%d").date(),
                options=TransactionsGetRequestOptions(),
            )
            response = client.transactions_get(request)
            transactions = response["transactions"]
            while len(transactions) < response["total_transactions"]:
                request = TransactionsGetRequest(
                    access_token=item.access_token,
                    start_date=datetime.strptime(start_data, "%Y-%m-%d").date(),
                    end_date=datetime.strptime(end_date, "%Y-%m-%d").date(),
                    options=TransactionsGetRequestOptions(offset=len(transactions)),
                )
                response = client.transactions_get(request)
                transactions.extend(response["transactions"])

            for transaction in transactions:
                transaction_count += 1
                expenese_category = ExpenseCategory.objects.filter(
                    plaid_id=transaction["category_id"]
                )
                if expenese_category:
                    category_id = expenese_category[0]
                else:
                    categ_name = " - ".join(transaction["category"])
                    categ_values = {
                        "name": categ_name,
                        "plaid_id": transaction["category_id"],
                    }
                    category_id = ExpenseCategory.objects.create(**categ_values)
                expense = Expense.objects.filter(
                    transaction_id=transaction["transaction_id"]
                )
                values = {
                    "transaction_id": transaction["transaction_id"],
                    "category_id": category_id,
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
        message += "%s Line(s) Synced" % (transaction_count)
        return Response(message)


@api_view(["GET"])
def getPlaidTransactions(request):
    if request.method == "GET":
        message = ""
        client, client_id = generate_plaid_client()
        plaid_items = PlaidItem.objects.all()
        transaction_count = 0
        for item in plaid_items:
            cursor = item.transaction_sync_cursor
            added = []
            modified = []
            removed = []
            has_more = True
            try:
                while has_more:
                    request = TransactionsSyncRequest(
                        access_token=item.access_token,
                        cursor=cursor,
                    )
                    response = client.transactions_sync(request).to_dict()
                    added.extend(response["added"])
                    modified.extend(response["modified"])
                    removed.extend(response["removed"])
                    has_more = response["has_more"]
                    cursor = response["next_cursor"]
                    item.transaction_sync_cursor = cursor
                    item.save()
            except plaid.ApiException as e:
                response_dict = json.loads(e.body)
                message += "Link Error ID %s: %s\n" % (
                    item.id,
                    str(response_dict),
                )
            transaction_count += len(added)
            for transaction in added:
                expenese_category = ExpenseCategory.objects.filter(
                    plaid_id=transaction["category_id"]
                )
                if expenese_category:
                    category_id = expenese_category[0]
                else:
                    categ_name = " - ".join(transaction["category"])
                    categ_values = {
                        "name": categ_name,
                        "plaid_id": transaction["category_id"],
                    }
                    category_id = ExpenseCategory.objects.create(**categ_values)

                expense = Expense.objects.filter(
                    transaction_id=transaction["transaction_id"]
                )
                values = {
                    "transaction_id": transaction["transaction_id"],
                    "category_id": category_id,
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
        message += "Sync Completed %s Transactions" % (transaction_count)
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
