import os
import requests

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL")
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "AURA")

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def send_email(to_email: str, subject: str, body: str):
    """
    Send a plain-text transactional email via Brevo's HTTPS API.

    This deliberately avoids raw SMTP (smtplib) because hosts like Render
    block outbound SMTP ports (25/465/587) on all plans as an anti-abuse
    measure. Brevo's API runs entirely over HTTPS (port 443), which is
    never blocked, so this works identically in local dev and on Render.
    """
    if not BREVO_API_KEY or not BREVO_SENDER_EMAIL:
        raise RuntimeError("BREVO_API_KEY or BREVO_SENDER_EMAIL is not configured")

    payload = {
        "sender": {"name": BREVO_SENDER_NAME, "email": BREVO_SENDER_EMAIL},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": body,
    }
    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
    }

    response = requests.post(BREVO_API_URL, json=payload, headers=headers, timeout=15)
    if response.status_code >= 300:
        raise RuntimeError(f"Brevo API error {response.status_code}: {response.text}")