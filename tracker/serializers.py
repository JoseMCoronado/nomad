from rest_framework import serializers
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
    PlanExpense,
    PlanExpenseItem,
)


class BaseModelSerializer(serializers.ModelSerializer):
    object_type = serializers.SerializerMethodField(
        method_name="get_object_type", read_only=True
    )

    def get_object_type(self, obj):
        return obj.__class__.__name__.lower()

    class Meta:
        fields = ["object_type", "id"]


class ConfigCountrySerializer(BaseModelSerializer):
    class Meta:
        model = ConfigCountry
        fields = "__all__"


class ConfigStateSerializer(BaseModelSerializer):
    class Meta:
        model = ConfigState
        fields = "__all__"


class ConfigCitySerializer(BaseModelSerializer):
    state_name = serializers.StringRelatedField(
        source="state_id.name",
        read_only=True,
    )
    country_name = serializers.StringRelatedField(
        source="state_id.country_id.name",
        read_only=True,
    )
    display_name = serializers.SerializerMethodField(
        method_name="_name_get", read_only=True
    )

    def _name_get(self, city):
        return "%s %s (%s)" % (
            city.state_id.country_id.unicodeFlag,
            city.name,
            city.state_id.name,
        )

    class Meta:
        model = ConfigCity
        fields = "__all__"


class ConfigParameterSerializer(BaseModelSerializer):
    class Meta:
        model = ConfigParameter
        fields = BaseModelSerializer.Meta.fields + [
            "key",
            "value",
        ]


class PlaidItemSerializer(BaseModelSerializer):
    class Meta:
        model = PlaidItem
        fields = BaseModelSerializer.Meta.fields + [
            "access_token",
            "item_id",
            "request_id",
            "transaction_sync_cursor",
        ]


class ExpenseCategorySerializer(BaseModelSerializer):

    expenses_count = serializers.IntegerField(read_only=True)
    category_url = serializers.HyperlinkedRelatedField(
        view_name="expensecategory-detail",
        source="id",
        read_only=True,
    )

    class Meta:
        model = ExpenseCategory
        fields = BaseModelSerializer.Meta.fields + [
            "name",
            "expenses_count",
            "category_url",
            "expense_classification",
            "ignore",
        ]


class TrackerStaySerializer(BaseModelSerializer):
    display_name = serializers.SerializerMethodField(
        method_name="_name_get", read_only=True
    )
    state_name = serializers.StringRelatedField(
        source="city_id.state_id.name",
        read_only=True,
    )
    country_name = serializers.StringRelatedField(
        source="city_id.state_id.country_id.name",
        read_only=True,
    )

    def _name_get(self, stay):
        return "%s %s (%s -> %s)" % (
            stay.city_id.state_id.country_id.unicodeFlag,
            stay.city_id.name,
            stay.date_start,
            stay.date_end,
        )

    class Meta:
        model = TrackerStay
        fields = "__all__"


class ExpenseSerializer(BaseModelSerializer):

    month = serializers.SerializerMethodField(
        method_name="get_date_month", read_only=True
    )
    year = serializers.SerializerMethodField(
        method_name="get_date_year", read_only=True
    )
    # category_detail = ExpenseCategorySerializer()
    category_name = serializers.StringRelatedField(
        source="category_id.name",
        read_only=True,
    )
    expense_url = serializers.HyperlinkedRelatedField(
        view_name="expense-detail",
        source="id",
        read_only=True,
    )
    category_url = serializers.HyperlinkedRelatedField(
        view_name="expensecategory-detail",
        source="category_id",
        read_only=True,
    )

    def get_date_year(self, expense):
        return expense.date.strftime("%Y")

    def get_date_month(self, expense):
        return expense.date.strftime("%B")

    class Meta:
        model = Expense
        fields = BaseModelSerializer.Meta.fields + [
            "expense_url",
            "transaction_id",
            "name",
            "date",
            "month",
            "year",
            "amount",
            "category_id",
            "stay_id",
            "expense_classification",
            "ignore",
            "spread_over",
            "spread_date_start",
            "spread_date_end",
            # "category_detail",
            "category_name",
            "category_url",
            "state",
        ]


class ExpenseItemSerializer(BaseModelSerializer):
    expense_classification = serializers.StringRelatedField(
        source="expense_id.expense_classification",
        read_only=True,
    )
    display_name = serializers.SerializerMethodField(
        method_name="_name_get", read_only=True
    )
    date_string = serializers.SerializerMethodField(
        method_name="_date_string_get", read_only=True
    )

    def _date_string_get(self, record):
        return "%s %s" % (record.date.strftime("%m/%d/%y"), record.date.strftime("%A"))

    def _name_get(self, record):
        name = "%s" % (record.expense_id.name)
        if record.expense_id.stay_id:
            stay = record.expense_id.stay_id
            name = "%s spread across => %s %s (%s -> %s)" % (
                name,
                stay.city_id.state_id.country_id.unicodeFlag,
                stay.city_id.name,
                stay.date_start,
                stay.date_end,
            )
        elif record.expense_id.spread_over:
            name = "%s spread across => %s -> %s" % (
                name,
                record.expense_id.spread_date_start,
                record.expense_id.spread_date_end,
            )
        return name

    class Meta:
        model = ExpenseItem
        fields = "__all__"


class PlanExpenseSerializer(BaseModelSerializer):
    display_name = serializers.SerializerMethodField(
        method_name="_name_get", read_only=True
    )

    def _name_get(self, record):
        name = "%s" % (record.name)
        if record.stay_id:
            stay = record.stay_id
            name = "%s spread across => %s %s (%s -> %s)" % (
                name,
                stay.city_id.state_id.country_id.unicodeFlag,
                stay.city_id.name,
                stay.date_start,
                stay.date_end,
            )
        elif record.spread_over:
            name = "%s spread across => %s -> %s" % (
                name,
                record.spread_date_start,
                record.spread_date_end,
            )
        return name

    class Meta:
        model = PlanExpense
        fields = "__all__"


class PlanExpenseItemSerializer(BaseModelSerializer):
    display_name = serializers.SerializerMethodField(
        method_name="_name_get", read_only=True
    )
    date_string = serializers.SerializerMethodField(
        method_name="_date_string_get", read_only=True
    )

    def _date_string_get(self, record):
        return "%s %s" % (record.date.strftime("%m/%d/%y"), record.date.strftime("%A"))

    def _name_get(self, record):
        name = "%s" % (record.plan_id.name)
        if record.plan_id.stay_id:
            stay = record.plan_id.stay_id
            name = "%s spread across => %s %s (%s -> %s)" % (
                name,
                stay.city_id.state_id.country_id.unicodeFlag,
                stay.city_id.name,
                stay.date_start,
                stay.date_end,
            )
        elif record.plan_id.spread_over:
            name = "%s spread across => %s -> %s" % (
                name,
                record.plan_id.spread_date_start,
                record.plan_id.spread_date_end,
            )
        return name

    class Meta:
        model = PlanExpenseItem
        fields = "__all__"
