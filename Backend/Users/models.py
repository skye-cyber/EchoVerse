from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from utils.model_utils import BaseModel


class EchoVerseUser(BaseModel, AbstractUser):
    email_verified = models.BooleanField(default=False)

    def __str__(self):
        return self.username

    class Meta:
        app_label = "Users"
        db_table = "Users"
        verbose_name = "User"
        verbose_name_plural = "Users"


class VerificationToken(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="verification_tokens",
    )
    v_token = models.CharField(max_length=6, blank=True, null=True)
    expiry = models.DateTimeField()

    def is_expired(self):
        return timezone.now() > self.expiry

    def __str__(self):
        return f"{self.token}"


class ResetToken(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reset_tokens"
    )
    r_token = models.CharField(max_length=255, blank=True)
    expiry = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} - ResetToken"
