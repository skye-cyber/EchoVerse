from django.shortcuts import render
from .models import EchoVerseUser, VerificationToken, ResetToken
from .serializers import EchoVerseUserSerializer
from django.db import transaction, OperationalError
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.http import JsonResponse

# from django.urls import reverse
from rest_framework import status, viewsets, generics, permissions
from rest_framework.views import APIView
from django.utils.decorators import method_decorator
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.renderers import JSONRenderer
import logging
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.exceptions import NotAuthenticated, ValidationError
from rest_framework.response import Response
from django.views.decorators.http import require_GET, require_POST
from django.contrib.auth.password_validation import validate_password
from TTSStudio.models import TTSSession
from django.utils import timezone
import random
from datetime import timedelta
from rest_framework_simplejwt.tokens import RefreshToken
from .utils import (
    send_email_link,
    send_email_code,
    send_pr_email,
    flushSession,
    get_tokens_for_user,
)

logger = logging.getLogger(__name__)
User = get_user_model()


class SignupAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logger.debug(f"Incoming request data: {request.data}")

        data = {
            "username": request.data.get("username"),
            "email": request.data.get("email"),
            "password1": request.data.get("password1"),
            "password2": request.data.get("password2"),
        }

        if EchoVerseUser.objects.filter(email=data["username"]).exists():
            return JsonResponse(
                {
                    "status": "fail",
                    "message": "Validation failure",
                    "errors": {"email": ["Email already taken"]},
                    "code": status.HTTP_400_BAD_REQUEST,
                }
            )
        if data.get("email", None):
            if EchoVerseUser.objects.filter(email=data["email"]).exists():
                return JsonResponse(
                    {
                        "status": "fail",
                        "message": "Validation failure",
                        "errors": {"username": ["Username already taken"]},
                        "code": status.HTTP_400_BAD_REQUEST,
                    }
                )

        try:
            validate_password(
                data["password1"], user=EchoVerseUser(username=data["username"])
            )

        except ValidationError as e:
            return JsonResponse(
                {
                    "status": "fail",
                    "message": "Validation failure",
                    "errors": {"password1": e.messages},
                    "code": status.HTTP_400_BAD_REQUEST,
                }
            )

        if data["password1"] != data["password2"]:
            return JsonResponse(
                {
                    "status": "fail",
                    "message": "Validation failure",
                    "errors": {"password2": ["Passwords do not match"]},
                    "code": status.HTTP_400_BAD_REQUEST,
                }
            )

        serializer = EchoVerseUserSerializer(data=data)
        if not serializer.is_valid():
            return JsonResponse(
                {
                    "status": "error",
                    "message": "Validation failure",
                    "errors": serializer.errors,
                    "code": status.HTTP_400_BAD_REQUEST,
                }
            )

        user = serializer.save()
        login(request, user)
        return JsonResponse(
            {
                "status": "success",
                "message": "Validation Ok",
                "redirect": "Dashboard",
                "code": status.HTTP_200_OK,
            }
        )


@csrf_exempt  # This MUST be outermost
@require_POST
def UserLogin(request):
    import json

    try:
        data = json.loads(request.body.decode())
    except Exception:
        return JsonResponse({"status": "error", "message": "Invalid JSON"}, status=400)

    form = AuthenticationForm(request, data=data)
    if form.is_valid() or (data.get("eu") and data.get("password")):
        cd = form.cleaned_data if form.is_valid() else data
        eu = cd["eu"]
        password = cd["password"]

        isEmail = "@" in eu

        user = (
            authenticate(request, email=eu, password=password)
            if isEmail
            else authenticate(request, username=eu, password=password)
        )

        if user is None:
            return JsonResponse(
                {
                    "status": "error",
                    "message": "Invalid credentials.",
                    "code": status.HTTP_400_BAD_REQUEST,
                }
            )

        if not user.is_active:
            return JsonResponse(
                {
                    "status": "error",
                    "message": "Account is disabled.",
                    "code": status.HTTP_401_UNAUTHORIZED,
                }
            )

        # login user (session)
        login(request, user)

        # issue JWT tokens
        # refresh = RefreshToken.for_user(user)
        # access_token = str(refresh.access_token)

        tokens = get_tokens_for_user(user)

        # print("Auth Status:", user.is_authenticated, user.is_anonymous)
        return JsonResponse(
            {
                "status": "success",
                "message": "Login successful",
                "verified": user.email_verified,
                "email": user.email,
                "redirect": "Dashboard",
                "auth": user.is_authenticated,
                "code": status.HTTP_200_OK,
                "auth_data": {
                    "username": user.username,
                    "roles": ["user"],
                    "access": tokens["access"],
                    "refresh": tokens["refresh"],
                },
            }
        )

    return JsonResponse(
        {
            "status": "error",
            "message": "Invalid form data",
            "errors": form.errors,
            "code": status.HTTP_400_BAD_REQUEST,
        }
    )


@require_GET
@login_required
def UserLogout(request):
    logout(request)
    # flushSession->  # Ensure the session data is cleared
    request.session.flush()
    return JsonResponse(
        {
            "status": "success",
            "message": "Logout successful!",
            "redirect": "Login",
        }
    )


@api_view(["PATCH"])
@permission_classes([AllowAny])
def verify_email(request, uidb64, token):
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except Exception as e:
        logger.error(f"Verification failed: {str(e)}")
        return JsonResponse({"status": "error", "message": "Invalid link."}, status=400)

    if user.email_verified:
        return JsonResponse({"status": "success", "message": "Email already verified."})

    if default_token_generator.check_token(user, token):
        user.is_active = True
        user.email_verified = True
        user.save()
        login(request, user)

        return JsonResponse(
            {
                "status": "success",
                "message": "Email verified",
                "email": user.email,
                "redirect": "Dashboard",
            },
            status=200,
        )
    return JsonResponse(
        {"status": "error", "message": "Invalid or expired token"}, status=400
    )


class EmailVerifcationLink(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (
            request.data.get("email")
            or request.session.get("user_email")
            or request.session.get("email")
        )
        if not email:
            return JsonResponse(
                {"status": "error", "message": "Email is required"}, status=400
            )

        try:
            user = EchoVerseUser.objects.get(email=email)
        except EchoVerseUser.DoesNotExist:
            return JsonResponse(
                {"status": "error", "message": "User not found"}, status=404
            )

        send_email_link(user, request)
        return JsonResponse(
            {"status": "success", "message": "Verification email resent"}
        )


class EmailVerifcationCode(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (
            request.data.get("email")
            or request.session.get("user_email")
            or request.session.get("email")
        )
        if not email:
            return JsonResponse(
                {
                    "status": "error",
                    "message": "Email is required",
                    "code": status.HTTP_400_BAD_REQUEST,
                }
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return JsonResponse(
                {
                    "status": "error",
                    "message": "User not found",
                    "code": status.HTTP_404_NOT_FOUND,
                }
            )

        # Generate 6-digit code
        code = "{:06d}".format(random.randint(0, 999999))
        expiry = timezone.now() + timedelta(minutes=10)

        # Save or update VerificationToken
        try:
            with transaction.atomic():
                token, created = VerificationToken.objects.update_or_create(
                    user=user, defaults={"token": code, "expiry": expiry}
                )
        except OperationalError:
            return JsonResponse(
                {
                    "status": "error",
                    "message": "Database is locked, please try again later.",
                    "code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                }
            )

        try:
            saved_code = VerificationToken.objects.get(user=user)
            send_email_code(user, email, saved_code)
            redirect_to = "Dashboard" if user.email_verified else "verify-email-code"
        except Exception as e:
            return JsonResponse(
                {
                    "status": "error",
                    "email": user.email,
                    "message": f"Failed to send email: {str(e)}",
                    "code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                }
            )

        return JsonResponse(
            {
                "status": "success",
                "message": "Verification code sent successfully.",
                "code": status.HTTP_200_OK,
                "redirect": redirect_to,
            }
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_code(request):
    code = request.data.get("code")
    email = request.session.get("user_email") or request.data.get("user_email")

    if not code or not email:
        return JsonResponse(
            {"status": "error", "message": "Missing data.", "code": 400}
        )

    try:
        user = User.objects.get(email=email)
        token_entry = VerificationToken.objects.get(user=user)
    except (User.DoesNotExist, VerificationToken.DoesNotExist):
        return JsonResponse(
            {"status": "error", "message": "User or token not found.", "code": 404}
        )

    if token_entry.token == code:  # and token_entry.expiry > datetime.datetime.now():
        user.email_verified = True
        user.save()
        token_entry.token = None
        token_entry.save()

        return JsonResponse(
            {
                "status": "success",
                "email": email,
                "message": "Code verified",
                "redirect": "Dashboard",
            }
        )
    return JsonResponse(
        {"status": "error", "message": "Invalid or expired code.", "code": 400}
    )


# PR -> password Reset
class RequestPR(APIView):
    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response(
                {"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
            send_pr_email(user, email, request)
        except User.DoesNotExist:
            pass  # Don't reveal user existence

        return Response(
            {
                "message": "If an account with this email exists, a reset link has been sent."
            }
        )


class ResetPassword(APIView):
    def post(self, request):
        uidb64 = request.data.get("uid")
        token = request.data.get("token")
        password = request.data.get("password")

        if not (uidb64 and token and password):
            return Response(
                {"error": "Missing fields."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)

            if not default_token_generator.check_token(user, token):
                return Response(
                    {"error": "Invalid or expired token."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user.set_password(password)
            user.save()
            return Response({"message": "Password has been reset successfully."})

        except (User.DoesNotExist, ValueError, TypeError):
            return Response(
                {"error": "Invalid reset request."}, status=status.HTTP_400_BAD_REQUEST
            )


@api_view(["GET"])
@permission_classes([AllowAny])
def CheckUserAuth(request):
    print(f"CheckUserAuth called by user: {request.user}")
    if request.user.is_authenticated:
        print("Authenticated")
        return Response(
            {
                "status": "success",
                "message": "User is authenticated",
                "code": status.HTTP_200_OK,
            }
        )
    else:
        print("NotAuthenticated")
        return Response(
            {
                "status": "error",
                "message": "User is not authenticated",
                "code": status.HTTP_401_UNAUTHORIZED,
            }
        )


@api_view(["GET"])
@login_required
# @ensure_csrf_cookie
def user_profile(request):
    c_user = request.user
    user = User.objects.filter(username=c_user.username).first()

    user_sessions_count = TTSSession.objects.filter(user=user).count()

    roles = []
    if user.is_superuser:
        roles.append("admin")
    elif user.is_staff:
        roles.append("staff")
    else:
        roles.append("user")

    data = {
        "username": user.username,
        "email": user.email,
        "email_verified": user.email_verified,
        "session_count": user_sessions_count,
        "roles": roles,
        "account_status": "Active" if user.is_active else "Deactivated",
    }
    return JsonResponse(data=data)
