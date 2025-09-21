from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models.py import EchoVerseUser, VerificationToken, ResetToken


@admin.register(EchoVerseUser)
class EchoVerseUserAdmin(UserAdmin):
    model = EchoVerseUser
    list_display = "username"
    readonly_fields = ("email_verified",)
    search_fields = ["username"]


@admin.register(VerificationToken)
class VerificationTokenAdmin(admin.ModelAdmin):
    model = VerificationToken
    list_display = ("token", "expiry", "is_expired")
    readonly_fields = ("is_expired",)


@admin.register(ResetToken)
class ResetTokenAdmin(admin.ModelAdmin):
    model = ResetToken
    list_display = ("token", "expiry")
