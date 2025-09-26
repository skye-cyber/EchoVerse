from django.db import models
from django.conf import settings
from utils.model_utils import BaseModel
import os


class TTSModel(BaseModel, models.Model):
    name = models.CharField(max_length=100)
    language = models.CharField(default="en-us", max_length=50)
    gender = models.CharField(
        max_length=10, choices=[("male", "Male"), ("female", "Female")]
    )
    is_premium = models.BooleanField(default=False)


class Voice(BaseModel, models.Model):
    name = models.CharField(max_length=100)
    language = models.CharField(
        default="en-us",
        choices=[("en-us", "english-us"), ("en-br", "english-britain")],
        max_length=50,
    )
    file = models.FileField(upload_to="voices/")
    gender = models.CharField(
        max_length=10, choices=[("male", "Male"), ("female", "Female")]
    )
    is_premium = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.file:
            raise Exception("Path to the voice file is required.")
        """Override save to ensure unique ID is generated if not already set."""
        # if Path(self.file.path).parent.is_relative_to(settings.BASE_DIR / "voices"):
        super().save(*args, **kwargs)
        # else:
        #   print(self.file)
        #  raise Exception("Voice file must be in the voices directory")


class TTSSession(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("error", "Error"),
        ("failed", "Failed"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True
    )
    input_text = models.TextField()
    text_length = models.BigIntegerField(null=True, blank=True)
    voice = models.ForeignKey("Voice", on_delete=models.CASCADE, null=True, blank=True)
    model = models.ForeignKey("TTSModel", on_delete=models.CASCADE)
    speed = models.FloatField(default=1.0)
    pitch = models.FloatField(default=1.0)
    energy = models.FloatField(default=1.0)
    audio_file = models.FileField(upload_to="uploads/tts_audio/", null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="pending")
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.input_text:
            self.text_length = len(self.input_text)
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if (
            self.audio_file
            and self.audio_file.path
            and os.path.isfile(self.audio_file.path)
        ):
            os.remove(self.audio_file.path)
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"Session {self.id} [{self.status}]"

    @property
    def filename(self):
        return os.path.basename(self.audio_file.name) if self.audio_file else None
