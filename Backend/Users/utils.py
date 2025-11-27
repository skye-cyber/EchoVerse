from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.urls import reverse
from django.core.mail import EmailMessage
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse
from rest_framework.decorators import api_view
from django.http import HttpResponse
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import timedelta, datetime, timezone
from rest_framework import status


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)

    # custom refresh expiry (7 days)
    refresh.set_exp(from_time=datetime.now(tz=timezone.utc), lifetime=timedelta(days=7))

    # custom access expiry (24 hours)
    access_token = refresh.access_token
    access_token.set_exp(
        from_time=datetime.now(tz=timezone.utc), lifetime=timedelta(hours=24)
    )

    return {
        "refresh": str(refresh),
        "access": str(access_token),
    }


@ensure_csrf_cookie
@api_view(["GET"])
def set_csrf_token(request):
    _, token = set_test_cookie(request)
    return JsonResponse({"detail": "CSRF cookie set", "csrf": token})


def set_test_cookie(request):
    token = "cookie123"
    response = HttpResponse("Setting test cookie")
    response.set_cookie("test_cookie", token, samesite="None", secure=False)
    return response, token


def send_email_link(user, request):
    try:
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        frontend_base_url = getattr(settings, "FRONTEND_BASE_URL")
        verification_url = f"{frontend_base_url}/verify-email-link/{uid}/{token}"

        subject = "Verify your email"
        html_message = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .container {{ max-width: 600px; margin: auto; padding: 20px; }}
                .header {{ text-align: center; }}
                .message {{ margin-bottom: 20px; }}
                .button-container {{ text-align: center; }}
                .button {{ background-color: #007BFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }}
                .footer {{ text-align: center; color: #777; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Verify your email</h1>
                </div>
                <div class="message">
                    <p>Dear {user.username},</p>
                    <p>Thank you for registering! To activate your account, please click the button below:</p>
                </div>
                <div class="button-container">
                    <a href="{verification_url}" target="_blank" class="button">Verify Email</a>
                </div>
                <p>Alternatively click: <a href="{verification_url}">{verification_url}</a></p>
                <div class="footer">
                    <p>If you did not make this request, please ignore this email.</p>
                    <p>Best regards,<br>The skye-cyber Team</p>
                </div>
            </div>
        </body>
        </html>
        """

        email = EmailMessage(subject, html_message, "Provelt.hiring", [user.email])
        email.content_subtype = "html"
        email.send(fail_silently=False)
        return True
    except Exception as e:
        print(f"E: {e}")
        return False


def send_email_code(user, email, code):
    try:
        subject = "Verify your email"
        html_message = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);">
                <tr>
                    <td align="left" style="padding: 40px 20px;">
                        <h1 style="font-size: 24px; margin: 0; color: #20075b;">Verify Your Email</h1>
                        <p style="font-size: 16px; margin: 20px 0; color: #0d0d0d;">Dear {user.username},</p>
                        <p style="font-size: 16px; margin: 20px 0;">Thank you for registering! To activate your account, please use the code below:</p>
                        <div style="margin: 20px 0;">
                            <strong style="font-size: 20px; color: #3a0ca3;">{code}</strong>
                        </div>
                        <p style="font-size: 14px; margin: 20px 0; color: #6c757d;">If you did not initiate this verification process, please ignore this email.</p>
                        <p style="font-size: 14px; margin: 20px 0; color: #6c757d;">Thank you,<br>Proveit</p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        email = EmailMessage(subject, html_message, "EchoVerse", [user.email])
        email.content_subtype = "html"
        email.send(fail_silently=False)
        return True
    except Exception as e:
        print(f"CE: {e}")
        return False


def send_pr_email(user, email, request):
    try:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_link = request.build_absolute_uri(
            reverse("EmailVerification", kwargs={"uidb64": uid, "token": token})
        )
        subject = "Reset your password"
        html_message = f"""
          <html>
          <head>
              <style>
                  body {{ font-family: Arial, sans-serif; }}
                  .container {{ max-width: 600px; margin: auto; padding: 20px; }}
                  .header {{ text-align: center; }}
                  .message {{ margin-bottom: 20px; }}
                  .button-container {{ text-align: center; }}
                  .button {{ background-color: #007BFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }}
                  .footer {{ text-align: center; color: #777; }}
              </style>
          </head>
          <body>
              <div class="container">
                  <div class="header">
                      <h1>Password Reset</h1>
                  </div>
                  <div class="message">
                      <p>Dear {user.username},</p>
                      <p>Click the link below to reset your password:</p>
                  </div>
                  <div class="button-container">
                      <a href="{reset_link}" target="_blank" class="button">Reset Password</a>
                  </div>
                  <p>Alternatively click: <a href="{reset_link}">{reset_link}</a></p>
                  <div class="footer">
                      <p>If you did not make this request, please ignore this email.</p>
                      <p>Best regards,<br>The skye-cyber Team</p>
                  </div>
              </div>
          </body>
          </html>
          """
        email = EmailMessage(subject, html_message, "EchoVerse", [email])
        email.content_subtype = "html"
        email.send(fail_silently=False)
        return True
    except Exception as e:
        print(f"RE: {e}")
        return False


def flushSession(request):
    print(request.user)
    request.session.flush()  # Ensure the session data is cleared
    return JsonResponse(
        {"status": "success", "code": status.HTTP_200_OK}, status=status.HTTP_200_OK
    )
