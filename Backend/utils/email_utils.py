from django.core.mail import EmailMultiAlternatives
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from email.utils import formataddr
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def send_email(subject, to_email, template_name, context):
    """
    Sends an email using a template.

    :param subject: Email subject
    :param to_email: Recipient email address
    :param template_name: Name of the template file (e.g., 'emails/welcome_email.html')
    :param context: Context data for the template
    """
    from django.conf import settings

    # Render the HTML template
    html_content = render_to_string(template_name, context)
    # Strip the HTML tags for the plain text version
    text_content = strip_tags(html_content)

    from_name = "EchoVerse"
    # Create the email
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=formataddr((from_name, settings.DEFAULT_FROM_EMAIL)),
        to=[to_email],
    )
    email.attach_alternative(html_content, "text/html")
    email.send()


def send_admin_notification(subject, message):
    """
    Sends a notification email to administrators defined in settings.ADMINS.

    Args:
        subject (str): The subject of the notification email.
        message (str): The plain text message for the administrators.

    Returns:
        bool: True if the email was sent successfully, False otherwise.
    """
    admin_emails = [
        admin[1] for admin in settings.ADMINS
    ]  # Assuming settings.ADMINS is a list of (name, email) tuples
    if not admin_emails:
        logger.warning(
            "No admin emails configured in settings.ADMINS for notification."
        )
        return False

    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            admin_emails,
            fail_silently=False,
        )
        logger.info(f"Admin notification '{subject}' sent to {', '.join(admin_emails)}")
        return True
    except Exception as e:
        logger.error(
            f"Error sending admin notification email '{subject}': {e}", exc_info=True
        )
        return False
