import logging
from threading import RLock
from smtplib import SMTPException
from ssl import SSLError
from django.core.mail.backends.base import BaseEmailBackend
from django.conf import settings

from smtp2go.core import Smtp2goClient
from smtp2go.exceptions import Smtp2goBaseException


logger = logging.getLogger(__name__)


class Smtp2goAPIContentException(Smtp2goBaseException):
    pass


class EchoVerseUserEmailBackend(BaseEmailBackend):
    """
    smtp2go wrapper for Django's Email Backend with domain validation
    """

    def __init__(self, fail_silently=False, **kwargs):
        super(EchoVerseUserEmailBackend, self).__init__(fail_silently=fail_silently)
        self.smtp2go = Smtp2goClient()
        self.lock = RLock()
        # Define a default sender if not provided
        self.default_sender = getattr(
            settings, "DEFAULT_FROM_EMAIL", "noreply@somocloud.org"
        )

    def _get_payload(self, email_message):
        """
        Extracts parameters from Django's EmailMessage object with domain validation.
        Raises Smtp2goAPIContentException if a required parameter is missing or invalid.
        """
        # Get content from EmailMessage
        payload = {
            "sender": getattr(email_message, "from_email", None),
            "recipients": getattr(email_message, "to", None),
            "subject": getattr(email_message, "subject", None),
        }
        text = getattr(email_message, "body", None)
        html = self._get_html(email_message)

        # Validate sender domain
        if not payload["sender"]:
            payload["sender"] = self.default_sender
        elif (
            "@localhost" in payload["sender"].lower()
            or not "." in payload["sender"].split("@")[1]
        ):
            if not self.fail_silently:
                raise Smtp2goAPIContentException(
                    f'Invalid sender domain in {payload["sender"]}. Must use a public domain-name.'
                )
            payload["sender"] = self.default_sender

        if not self.fail_silently:
            # Raise exception if any required parameters are missing
            if not all(payload.values()) or not any([text, html]):
                raise Smtp2goAPIContentException(
                    "The following parameters are required: {0} and one or both of text or html".format(
                        payload.keys()
                    )
                )

        payload["text"], payload["html"] = text, html
        return payload

    def _get_html(self, email_message):
        alternatives, html = getattr(email_message, "alternatives", None), None
        if alternatives:
            try:
                html, __ = alternatives[0]
            except (IndexError, ValueError):
                pass
        return html

    def _smtp2go_send(self, payload):
        try:
            self.smtp2go.send(**payload)
        except Smtp2goBaseException as e:
            logger.error(f"SMTP2Go send failed: {e}")
            raise

    def send_messages(self, email_messages):
        """
        Wraps smtp2go Python API library
        """
        with self.lock:
            sent_count = 0
            for message in email_messages:
                try:
                    payload = self._get_payload(message)
                    self._smtp2go_send(payload)
                    sent_count += 1
                except (SMTPException, SSLError, Smtp2goBaseException) as e:
                    logger.error(f"Failed to send email: {e}")
                    if not self.fail_silently:
                        raise
            return sent_count
