from django.db import models
from django.contrib.auth.models import User


class Subscription(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    plan = models.CharField(
        max_length=20,
        choices=[("free", "Free"), ("basic", "Basic"), ("premium", "Premium")],
    )
    characters_used = models.IntegerField(default=0)
    characters_limit = models.IntegerField()
    renews_on = models.DateField()
