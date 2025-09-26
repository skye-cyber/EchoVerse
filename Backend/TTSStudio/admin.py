import os
from django.contrib import admin
from django.utils.html import format_html
from django.conf import settings
from .models import TTSModel, TTSSession, Voice


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


@admin.register(Voice)
class VoiceAdmin(admin.ModelAdmin):
    model = Voice
    list_display = (
        "name",
        "language",
        "is_premium",
        "created_at",
    )
    # fieldsets = UserAdmin.fieldsets + ((None, {"fields": ("user__username", "model__name")}),)
    search_fields = ["id", "name", "language"]


@admin.register(TTSSession)
class TTSSessionAdmin(admin.ModelAdmin):
    model = TTSSession

    list_display = (
        "user",
        "model__name",
        "created_at",
        "status_badge",
    )
    search_fields = ["user__username", "model__name"]
    list_filter = ("created_at", "status")

    readonly_fields = (
        "created_at",
        "audio_file_link",
        "audio_download_link",
        "audio_preview",
        "error_message",
        "run_session",
        "status_badge",
    )

    fieldsets = (
        (
            "Text Info",
            {
                "classes": ("collapse",),
                "fields": ("input_text", "text_length"),
            },
        ),
        (
            "Audio Info",
            {
                "fields": (
                    "audio_file",
                    "created_at",
                    "audio_file_link",
                    "audio_download_link",
                    "status_badge",
                    "error_message",
                ),
            },
        ),
        (
            "Audio Preview",
            {
                "fields": ("audio_preview",),
            },
        ),
        (
            "Session Options",
            {
                "fields": ("run_session",),
            },
        ),
    )

    # === Custom display methods ===
    def status_badge(self, obj):
        color_map = {
            "pending": "#f0ad4e",
            "processing": "#5bc0de",
            "completed": "#5cb85c",
            "error": "#d9534f",
            "failed": "#d9534f",
        }
        color = color_map.get(obj.status, "#777")
        label = obj.get_status_display()
        return format_html(
            '<span style="padding:3px 8px; background-color:{}; color:white; border-radius:4px;">{}</span>',
            color,
            label,
        )

    status_badge.short_description = "Status"

    def audio_file_link(self, obj):
        if obj.audio_file:
            return format_html(
                "<a href='{}' target='_blank'>Open Audio</a>", obj.audio_file.url
            )
        return "No file"

    audio_file_link.short_description = "Audio Link"

    def audio_download_link(self, obj):
        if obj.audio_file:
            return format_html(
                "<a href='{}' download>Download Audio</a>", obj.audio_file.url
            )
        return "-"

    audio_download_link.short_description = "Download"

    def audio_preview(self, obj):
        if obj.audio_file:
            fpath = os.path.join(
                settings.BASE_DIR, obj.audio_file.url.split("/media/")[-1]
            )
            return format_html(
                "<audio src='{}' controls style='width:100%;'></audio>{}",
                fpath,
                fpath,
            )
        return "No preview available"

    audio_preview.short_description = "Audio Preview"

    def run_session(self, session):
        return format_html(
            '<a href="/studio/session/run/{}/" target="_blank">Run Now</a>',
            session.id,
        )

    actions = ["rerun_session"]

    @admin.action(description="Force re-run Selected Sessions")
    def rerun_session(self, request, queryset):
        from .task_handler import process_text

        for obj in queryset:
            obj.status = "pending"
            obj.audio_file = None
            obj.error_message = ""
            obj.save()
            process_text.delay(obj.pk)
        self.message_user(request, "Selected sessions are being reprocessed.")
