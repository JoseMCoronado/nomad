from datetime import timedelta
from django.db import models

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver


class ConfigCountry(models.Model):
    name = models.CharField(max_length=255, db_index=True)
    schengen_country = models.BooleanField()
    currency = models.CharField(max_length=255)
    unicodeFlag = models.CharField(max_length=255)
    flag = models.CharField(max_length=255)
    dialcode = models.CharField(max_length=255)
    iso3 = models.CharField(max_length=255)
    iso2 = models.CharField(max_length=255)
    create_date = models.DateTimeField(auto_now_add=True)
    write_date = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "config_country"


class ConfigState(models.Model):
    name = models.CharField(max_length=255, db_index=True)
    state_code = models.CharField(max_length=255, db_index=True)
    country_id = models.ForeignKey(
        ConfigCountry, on_delete=models.PROTECT, related_name="state_ids"
    )
    create_date = models.DateTimeField(auto_now_add=True)
    write_date = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "config_state"


class ConfigCity(models.Model):
    name = models.CharField(max_length=255, db_index=True)
    state_id = models.ForeignKey(
        ConfigState, on_delete=models.PROTECT, related_name="city_ids"
    )
    create_date = models.DateTimeField(auto_now_add=True)
    write_date = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "config_city"


class TrackerStay(models.Model):
    date_start = models.DateField()
    date_end = models.DateField()
    city_id = models.ForeignKey(
        ConfigCity, on_delete=models.PROTECT, related_name="stay_ids"
    )
    create_date = models.DateTimeField(auto_now_add=True)
    write_date = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tracker_stay"
        ordering = ["date_start"]


class ConfigParameter(models.Model):
    key = models.CharField(max_length=255)
    value = models.CharField(max_length=255)

    class Meta:
        db_table = "config_parameter"


class PlaidItem(models.Model):
    transaction_sync_cursor = models.CharField(
        max_length=255,
        default="",
        null=True,
        blank=True,
    )
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

    splurge = models.BooleanField(default=False)
    transaction_id = models.CharField(
        db_index=True,
        max_length=255,  # unique=True
    )
    category_id = models.ForeignKey(
        ExpenseCategory, on_delete=models.PROTECT, related_name="expense_ids"
    )
    stay_id = models.ForeignKey(
        TrackerStay,
        on_delete=models.PROTECT,
        related_name="expense_ids",
        null=True,
        blank=True,
        default=None,
    )
    expense_classification = models.CharField(
        max_length=255,
        choices=[
            ("none", "Unclassified"),
            ("transportation", "Transportation"),
            ("lodging", "Lodging"),
            ("business", "Business"),
            ("misc", "Misc"),
        ],
        default="none",
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
        ordering = ["date"]


class TrackCategory(models.Model):
    name = models.CharField(max_length=255)
    create_date = models.DateTimeField(auto_now_add=True)
    write_date = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tracker_category"
        ordering = ["name"]


class ExpenseItem(models.Model):

    expense_id = models.ForeignKey(
        Expense, on_delete=models.PROTECT, related_name="item_ids"
    )
    date = models.DateField()
    amount = models.DecimalField(max_digits=9, decimal_places=2)
    create_date = models.DateTimeField(auto_now_add=True)
    write_date = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tracker_expense_item"
        ordering = ["date"]


@receiver(pre_save, sender=Expense)
def expense_presave_handler(sender, **kwargs):
    items = ExpenseItem.objects.filter(expense_id=kwargs["instance"]).all()
    items.delete()


@receiver(post_save, sender=Expense)
def expense_postsave_handler(sender, **kwargs):
    if kwargs["instance"].stay_id:
        date_start = kwargs["instance"].stay_id.date_start
        date_end = kwargs["instance"].stay_id.date_end
        diff_days = max((date_end - date_start).days, 1)
        print(date_start, date_end, diff_days)
        while date_start < date_end:
            create_dict = {
                "expense_id": kwargs["instance"],
                "date": date_start,
                "amount": (kwargs["instance"].amount / diff_days),
            }
            ExpenseItem.objects.create(**create_dict)
            date_start += timedelta(days=1)
    else:
        create_dict = {
            "expense_id": kwargs["instance"],
            "date": kwargs["instance"].date,
            "amount": kwargs["instance"].amount,
        }
        ExpenseItem.objects.create(**create_dict)
