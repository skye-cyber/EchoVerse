from django.core.files.storage import FileSystemStorage
import os
from django.utils.timezone import now
from urllib.parse import urljoin
from django.conf import settings


class EchoVerseStorage(FileSystemStorage):
    def get_upload_path(self):
        """Generate a date-based upload path (e.g., uploads/2025/03/22/)."""
        current_date = now()
        year = str(current_date.year)
        month = f"{current_date.month:02d}"
        day = f"{current_date.day:02d}"
        return os.path.join(settings.MEDIA_ROOT, "echoverse_editor", year, month, day)

    def get_upload_url(self):
        """Generate the corresponding URL (e.g., /media/isele_editor/2025/03/22/)."""
        current_date = now()
        year = str(current_date.year)
        month = f"{current_date.month:02d}"
        day = f"{current_date.day:02d}"
        return urljoin(settings.MEDIA_URL, f"echoverse_editor/{year}/{month}/{day}/")

    def __init__(self, *args, **kwargs):
        # Initialize with dynamic paths
        super().__init__(
            location=self.get_upload_path(),
            base_url=self.get_upload_url(),
            *args,
            **kwargs,
        )

    def path(self, name):
        """Override to ensure the correct dynamic path is used."""
        return os.path.join(self.get_upload_path(), name)

    def url(self, name):
        """Override to ensure the correct dynamic URL is returned."""
        return urljoin(self.get_upload_url(), name)
