from django.shortcuts import render
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth

from rest_framework import status
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.pagination import PageNumberPagination

from django_filters.rest_framework import DjangoFilterBackend

from tracker.models import Expense, ExpenseCategory
from tracker.serializers import ExpenseSerializer, ExpenseCategorySerializer


class ExpensePagination(PageNumberPagination):
    page_size = 500


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
