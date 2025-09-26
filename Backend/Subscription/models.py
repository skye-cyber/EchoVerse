from django.db import models
from django.conf import settings


class Subscription(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscription"
    )
    plan = models.CharField(
        max_length=20,
        choices=[("free", "Free"), ("basic", "Basic"), ("premium", "Premium")],
    )
    characters_used = models.IntegerField(default=0)
    characters_limit = models.IntegerField()
    renews_on = models.DateField()
