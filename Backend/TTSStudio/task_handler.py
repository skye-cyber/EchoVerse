from celery import shared_task
from django.core.files.base import File
from .models import TTSSession
from .processor import Processor
import os

import logging

log = logging.getLogger("EchoVerse")


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 10},
)
def process_text(self, sess_id):
    session = TTSSession.objects.get(id=sess_id)
    session.status = "processing"
    session.error_message = None
    session.save(update_fields=["status", "error_message"])

    try:
        log.info(f"📄 Starting ssid: {session.id}")

        file_result = Processor(
            session.input_text,
            session.voice or "default",
            session.speed,
            session.pitch,
            session.energy,
        ).SingleThreadProcessor()

        with open(file_result, "rb") as f:
            session.audio_file.save(os.path.basename(file_result), File(f), save=False)

        session.status = "completed"
        session.error_message = None
        session.save()
        log.info(f"✅ Completed task. File: {file_result}")

    except Exception as e:
        log.error(f"Error in ssid {session.id}: {e}")
        session.status = "error"
        session.error_message = str(e)[:500]
        session.save(update_fields=["status", "error_message"])
        raise self.retry(exc=e)
