import os
import base64
import requests
from email.mime.text import MIMEText

GMAIL_CLIENT_ID = os.getenv("GMAIL_CLIENT_ID")
GMAIL_CLIENT_SECRET = os.getenv("GMAIL_CLIENT_SECRET")
GMAIL_REFRESH_TOKEN = os.getenv("GMAIL_REFRESH_TOKEN")
GMAIL_SENDER_EMAIL = os.getenv("GMAIL_SENDER_EMAIL")
GMAIL_SENDER_NAME = os.getenv("GMAIL_SENDER_NAME", "AURA")

TOKEN_URL = "https://oauth2.googleapis.com/token"
SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"


def _get_access_token() -> str:
    response = requests.post(TOKEN_URL, data={
        "client_id": GMAIL_CLIENT_ID,
        "client_secret": GMAIL_CLIENT_SECRET,
        "refresh_token": GMAIL_REFRESH_TOKEN,
        "grant_type": "refresh_token",
    }, timeout=15)
    if response.status_code != 200:
        raise RuntimeError(f"Failed to refresh Gmail access token: {response.status_code} {response.text}")
    return response.json()["access_token"]


def send_email(to_email: str, subject: str, body: str):
    """
    Send a plain-text email via the Gmail API, authenticated as our own
    real Gmail account (via OAuth), rather than through a third-party
    relay pretending to be a Gmail sender.

    Because Google itself is sending this on behalf of a real, authorized
    Gmail account, it is not subject to the third-party sender-domain
    authentication requirements that block services like Brevo/SendGrid
    when they try to send "as" a free Gmail address to Gmail/Yahoo/Outlook
    recipients. It also runs entirely over HTTPS, so it isn't affected by
    Render's outbound SMTP port blocking either.
    """
    if not all([GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER_EMAIL]):
        raise RuntimeError("Gmail API credentials are not fully configured")

    access_token = _get_access_token()

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = f"{GMAIL_SENDER_NAME} <{GMAIL_SENDER_EMAIL}>"
    msg["To"] = to_email

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")

    response = requests.post(
        SEND_URL,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        json={"raw": raw},
        timeout=15,
    )
    if response.status_code >= 300:
        raise RuntimeError(f"Gmail API send error {response.status_code}: {response.text}")