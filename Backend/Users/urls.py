from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .utils import flushSession, set_csrf_token


app_name = "Users"

urlpatterns = [
    path("user/register/", views.SignupAPIView.as_view(), name="register_user"),
    path("user/login/", views.UserLogin, name="login_user"),
    path("user/logout/", views.UserLogout, name="logout_user"),
    # ====== Email verification=======
    path(
        "auth/verify/link/<str:uidb64>/<str:token>/",
        views.verify_email,
        name="verify-email",
    ),
    path(
        "auth/send/email/link/",
        views.EmailVerifcationLink.as_view(),
        name="send-email-link",
    ),
    path(
        "auth/send/email/code/",
        views.EmailVerifcationCode.as_view(),
        name="send-email-code",
    ),
    path("auth/verify/code/", views.verify_code, name="verify-code"),
    # ====== PR =======
    path(
        "security/password/request-rest/",
        views.RequestPR.as_view(),
        name="request-password-reset",
    ),
    path(
        "security/password/reset/",
        views.ResetPassword.as_view(),
        name="reset-password",
    ),
    # ======= Data Fetch api's======
    path("security/csrf/", set_csrf_token, name="set_csrf"),
    path("user/authentication/", views.CheckUserAuth, name="check_auth"),
    path("user/profile/", views.GetUserDataView.as_view(), name="fetch_user_profile"),
    path("session/flush/", flushSession, name="flush_session"),
]

# path('users', views.UserViewSet, name='fetch-all-users'),
