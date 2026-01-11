from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from .views import healthcheck, create_person, upload_footage, list_people

urlpatterns = [
    path("health/", healthcheck),
    path("api/person/create/", create_person),
    path("api/footage/upload/", upload_footage, name="upload_footage"),

    # 👇 ADD THIS LINE
    path("api/people/", list_people),
]


# 👇 ADD THIS AT THE VERY BOTTOM
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)