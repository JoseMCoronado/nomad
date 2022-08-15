from django.contrib import admin
from . import models


@admin.register(models.ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ["id", "create_date", "write_date", "name"]
    search_fields = ["name"]
    list_editable = ["name"]
    list_per_page = 50


@admin.register(models.Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "create_date",
        "write_date",
        "date",
        "category_name",
        "transaction_id",
        "name",
        "amount",
        "state",
    ]
    search_fields = ["name", "transaction_id"]
    list_filter = ["date", "category_id__name"]
    list_editable = ["name", "amount"]
    list_per_page = 50
    list_select_related = ["category_id"]

    def category_name(self, expense):
        return expense.category_id.name
