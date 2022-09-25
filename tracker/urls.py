from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("expenses", views.ExpenseViewSet)
router.register("categories", views.ExpenseCategoryViewSet)
router.register("plaiditem", views.PlaidItemViewSet)
router.register("config", views.ConfigParameterViewSet)
router.register("countries", views.ConfigCountryViewSet)
router.register("states", views.ConfigStateViewSet)
router.register("cities", views.ConfigCityViewSet)
router.register("stays", views.TrackerStayViewSet)
router.register("items", views.ExpenseItemViewSet)

urlpatterns = [
    path(r"", include(router.urls)),
    path("dashboard", views.dashboard),
    path("create_link_token", views.plaidLinkToken),
    path("exchange_public_token", views.plaidExchangeToken),
    path("get_plaid_transaction", views.getPlaidTransactions),
    path("testendpoint", views.testEndpoint),
    path("get_countries", views.getCountries),
    path("get_states", views.getStates),
    path("get_dates", views.get_dates),
]
