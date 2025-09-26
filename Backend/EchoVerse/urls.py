"""
URL configuration for EchoVerse project.
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("Users.urls")),
    path("studio/", include("TTSStudio.urls")),
    # path("", include("Subscription.urls")),
    # path("", include("Converter.urls")),
    # path("", include("Core.urls")),
]
