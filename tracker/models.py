from django.db import models


class ExpenseCategory(models.Model):

    name = models.CharField(max_length=255)
    create_date = models.DateTimeField(auto_now_add=True)
    write_date = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tracker_expense_category"


class Expense(models.Model):

    transaction_id = models.CharField(
        db_index=True,
        max_length=255,  # unique=True
    )
    category_id = models.ForeignKey(ExpenseCategory, on_delete=models.PROTECT)
    name = models.CharField(max_length=255, db_index=True)
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
