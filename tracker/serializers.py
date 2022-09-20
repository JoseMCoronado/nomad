from rest_framework import serializers

from tracker.models import Expense, ExpenseCategory


class BaseModelSerializer(serializers.ModelSerializer):
    object_type = serializers.SerializerMethodField(
        method_name="get_object_type", read_only=True
    )

    def get_object_type(self, obj):
        return obj.__class__.__name__.lower()

    class Meta:
        fields = ["object_type", "id"]


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
            # "category_detail",
            "category_name",
            "category_url",
            "state",
        ]
