from django.urls import path
from .views import healthcheck, create_person, create

urlpatterns = [
    path("health/", healthcheck),
    path("people/create/", create_person),
    # path("dayblocks/create/", create_dayblock)
]
