#!/usr/bin/env python

import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "EchoVerse.settings")
app = Celery("EchoVerse")
app.config_from_object("django.conf:settings", namespace="CELERY")
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
# Ignore unkown tasks
# CELERY_IGNORE_RESULT = True
# task_ignore_result = True
# task_acks_late = True
# Specifically Ignore unregistered tasks
task_ignore_errors = ["NotRegistered"]
CELERY_TASK_DEFAULT_QUEUE = "EchoVerse"

app.autodiscover_tasks()

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Africa/Nairobi",
    enable_utc=True,
)


"""
Run command
# celery -A EchoVerse worker -l info -Q EchoVerse --concurrency=2


# Flush Celery broker
 - redis-cli flushall -> backend only

 - redis-cli -n 0 flushdb -> nuke all keys:
 - rabbitmqctl purge_queue celery -> RabbitMQ backend
"""
