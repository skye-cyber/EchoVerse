from django.contrib import admin
from .models import TTSModel, TTSSession


@admin.register(TTSModel)
class TTSModelAdmin(admin.ModelAdmin):
    model = TTSModel
    list_display = (
        "name",
        "language",
        "gender",
        "is_premium",
        "created_at",
    )
    # fieldsets = UserAdmin.fieldsets + ((None, {"fields": ("name", "is_premium")}),)
    search_fields = ["name", "language", "gender"]


@admin.register(TTSSession)
class TTSSessionAdmin(admin.ModelAdmin):
    model = TTSSession
    list_display = (
        "user__username",
        "model__name",
        "created_at",
    )
    # fieldsets = UserAdmin.fieldsets + ((None, {"fields": ("user__username", "model__name")}),)
    search_fields = ["user__username", "model__name"]
