from django.shortcuts import render
from django.db.models import Sum
from django.db.models.functions import TruncMonth
from tracker.models import Expense


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
