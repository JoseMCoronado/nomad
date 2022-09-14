from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("expenses", views.ExpenseViewSet)
router.register("categories", views.ExpenseCategoryViewSet)

urlpatterns = [
    path(r"", include(router.urls)),
    path("dashboard", views.dashboard),
    path("dashboard/", views.dashboard),
]
