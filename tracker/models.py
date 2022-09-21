from django.db import models


class ConfigParameter(models.Model):
    key = models.CharField(max_length=255)
    value = models.CharField(max_length=255)
    create_date = models.DateTimeField(auto_now_add=True)
    write_date = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "config_parameter"


class PlaidItem(models.Model):

    access_token = models.CharField(max_length=255)
    item_id = models.CharField(max_length=255)
    request_id = models.CharField(max_length=255)
    create_date = models.DateTimeField(auto_now_add=True)
    write_date = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "plaid_item"


class ExpenseCategory(models.Model):

    name = models.CharField(max_length=255)
    plaid_id = models.CharField(max_length=255, default="")
    create_date = models.DateTimeField(auto_now_add=True)
    write_date = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tracker_expense_category"
        ordering = ["name"]


class Expense(models.Model):

    transaction_id = models.CharField(
        db_index=True,
        max_length=255,  # unique=True
    )
    category_id = models.ForeignKey(
        ExpenseCategory, on_delete=models.PROTECT, related_name="expense_ids"
    )
    name = models.CharField(max_length=255, db_index=True)
    plaid_account_id = models.CharField(max_length=255, default="")
    plaid_merchant_name = models.CharField(max_length=255, default="")
    plaid_payment_channel = models.CharField(max_length=255, default="")
    plaid_iso_currency_code = models.CharField(max_length=255, default="")
    date = models.DateField()
    amount = models.DecimalField(max_digits=9, decimal_places=2)
    create_date = models.DateTimeField(auto_now_add=True)
    write_date = models.DateTimeField(auto_now=True)
    state = models.CharField(
        max_length=255,
        choices=[
            ("pending", "Pending"),
            ("done", "Done"),
            ("ignore", "Ignore"),
        ],
        default="pending",
    )

    class Meta:
        db_table = "tracker_expense"
        ordering = ["-date"]
