from django.db import models
from django.conf import settings


class TTSModel(models.Model):
    name = models.CharField(max_length=100)
    language = models.CharField(max_length=50)
    gender = models.CharField(
        max_length=10, choices=[("male", "Male"), ("female", "Female")]
    )
    is_premium = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class TTSSession(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True
    )
    input_text = models.TextField()
    model = models.ForeignKey(TTSModel, on_delete=models.CASCADE)
    speed = models.FloatField(default=1.0)
    pitch = models.FloatField(default=1.0)
    audio_file = models.FileField(upload_to="tts_audio/")
    created_at = models.DateTimeField(auto_now_add=True)
