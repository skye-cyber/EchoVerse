from django.urls import path
from . import views


app_name = "Studio"

urlpatterns = [
    path("ttsfy/text/", views.TextTTSfy.as_view(), name="text_tts"),
    path("ttsfy/file/", views.FileTTSfy, name="file_tts"),
    path(
        "ttsfy/status/<int:task_id>/",
        views.TaskStatusView.as_view(),
        name="task_status",
    ),
    path("tts/voices/", views.list_voices, name="list_voices"),
    path("tts/voices/create/", views.create_voice, name="create_voice"),
    path("tts/voices/delete/<str:voice_id>/", views.delete_voice, name="delete_voice"),
    path(
        "session/run/<int:session_id>/",
        views.SessionManager.as_view(),
        name="run_session",
    ),
    path(
        "session/delete/<int:session_id>/",
        views.SessionManager.as_view(),
        name="delete_session",
    ),
    path("sessions/fetch/", views.SessionManager.as_view(), name="fetch_sessions"),
    path("tts/history/", views.SessionManager.as_view(), name="get_history"),
    # Utils,
    path(
        "session/<int:session_id>/file/blob/",
        views.File2Blob.as_view(),
        name="get_file_blob",
    ),
    path(
        "session/<int:session_id>/file/download/",
        views.FileDownload.as_view(),
        name="get_file_blob",
    ),
]
