# email/service.py
import httpx
from server.core.config import settings
from server.core.logging_config import get_logger
from server.email.templates import (
    otp_email_html,
    invite_email_html,
    completion_email_html,
    creator_notification_email_html,
)

logger = get_logger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"
FROM_ADDRESS = "SurveyAgent <hello@getsurveyagent.com>"


async def _send_email(to_email: str, subject: str, html: str) -> dict:
    """Send an email via Resend API. Raises on failure."""
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — skipping email send")
        return {"id": "skipped", "message": "RESEND_API_KEY not configured"}

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": FROM_ADDRESS,
                "to": [to_email],
                "subject": subject,
                "html": html,
            },
        )
        response.raise_for_status()
        result = response.json()
        logger.info(f"Email sent to {to_email} — id: {result.get('id')}")
        return result


async def send_otp_email(to_email: str, otp_code: str, user_name: str) -> dict:
    """Send OTP verification email."""
    html = otp_email_html(user_name, otp_code)
    return await _send_email(to_email, "Your SurveyAgent verification code", html)


async def send_completion_email(to_email: str, respondent_name: str, survey_title: str) -> dict:
    """Send thank-you email to respondent after interview completion."""
    html = completion_email_html(respondent_name, survey_title)
    return await _send_email(to_email, f"Thanks for completing: {survey_title}", html)


async def send_creator_notification(
    to_email: str,
    creator_name: str,
    survey_title: str,
    respondent_name: str | None,
    respondent_email: str | None,
    questions_covered: int,
    total_questions: int,
) -> dict:
    """Send notification email to survey creator when an interview is completed."""
    html = creator_notification_email_html(
        creator_name, survey_title, respondent_name, respondent_email,
        questions_covered, total_questions,
    )
    return await _send_email(to_email, f"New response: {survey_title}", html)


async def send_invite_email(to_email: str, invite_token: str, org_name: str, inviter_name: str) -> dict:
    """Send org invite email with join link."""
    invite_url = f"{settings.FRONTEND_URL}/invite/{invite_token}"
    html = invite_email_html(org_name, inviter_name, invite_url)
    return await _send_email(to_email, f"You've been invited to join {org_name} on SurveyAgent", html)
