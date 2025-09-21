from django.contrib import admin
from .models import Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    model = Subscription
    list_display = (
        "user__username",
        "plan",
        "characters_used",
        "characters_limit",
        "renews_on",
    )
    # fieldsets = UserAdmin.fieldsets + ((None, {"fields": ("characters_used", "characters_limit")}),)
    search_fields = ["user__username", "plan", "characters_used", "characters_limit"]
