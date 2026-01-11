from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from .views import healthcheck, create_person, upload_footage, list_people, get_all_individual_videos, footage_thumbnail, serve_video

urlpatterns = [
    path("health/", healthcheck),
    path("api/person/create/", create_person),
    path("api/footage/upload/", upload_footage, name="upload_footage"),
    path("api/footage/all/", get_all_individual_videos, name="get_all_individual_videos"),
    path("api/footage/thumb/<int:video_id>/", footage_thumbnail, name="footage_thumbnail"),
    path("api/footage/video/<int:video_id>/", serve_video, name="serve_video"),


    # 👇 ADD THIS LINE
    path("api/people/", list_people),
]


# 👇 ADD THIS AT THE VERY BOTTOM
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)