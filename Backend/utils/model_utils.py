from django.db import models

from utils.generate_ids import generate_unique_id


class BaseModel(models.Model):
    id = models.BigIntegerField(
        default=generate_unique_id, primary_key=True, unique=True, editable=False
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-updated_at", "-created_at"]

    def save(self, *args, **kwargs):
        """Override save to ensure unique ID is generated if not already set."""
        if not self.id:
            self.id = generate_unique_id()
        super().save(*args, **kwargs)
