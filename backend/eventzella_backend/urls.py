from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path

from ml_api import views as ml_views


def favicon(_request):
    return HttpResponse(status=204)


urlpatterns = [
    path("favicon.ico", favicon),
    path("metrics/", ml_views.metrics),
    path("admin/", admin.site.urls),
    path("api/", include("ml_api.urls")),
    path("api/enterprise/", include("enterprise.urls")),
]
