import jwt
from django.conf import settings
from django.http import HttpResponse
from django.contrib.auth import get_user_model

User = get_user_model()


def verify_sso_token(token):
    try:
        jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return True
    except jwt.ExpiredSignatureError:
        return HttpResponse("Token expired", status=401)
    except jwt.InvalidTokenError as e:
        return HttpResponse(f"Invalid token: {str(e)}", status=401)
