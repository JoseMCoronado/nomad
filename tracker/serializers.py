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
        ]


class TrackerStaySerializer(BaseModelSerializer):
    display_name = serializers.SerializerMethodField(
        method_name="_name_get", read_only=True
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
            # "category_detail",
            "category_name",
            "category_url",
            "state",
        ]


class ExpenseItemSerializer(BaseModelSerializer):
    class Meta:
        model = ExpenseItem
        fields = "__all__"
