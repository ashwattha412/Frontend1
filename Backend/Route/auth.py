import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bcrypt
import secrets
import smtplib
from email.mime.text import MIMEText
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from Schema.Schema import SignUpRequest, SignInRequest, ChangePasswordRequest, ResendVerificationRequest
from Database.Supabase import supabase

router = APIRouter(prefix="/auth", tags=["Auth"])

HEARTBEAT_STALE_SECONDS = 45

VERIFICATION_TOKEN_HOURS = 24

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "AURA")
BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL", "http://localhost:8000")


def _send_verification_email(to_email: str, token: str):
    verify_link = f"{BACKEND_PUBLIC_URL}/auth/verify-email?token={token}"
    subject = "Verify your AURA account"
    body = (
        f"Welcome to AURA!\n\n"
        f"Please confirm this is your email address by clicking the link below:\n"
        f"{verify_link}\n\n"
        f"This link expires in {VERIFICATION_TOKEN_HOURS} hours. "
        f"If you didn't create this account, you can safely ignore this email."
    )
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_USER}>"
    msg["To"] = to_email

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, [to_email], msg.as_string())


@router.post("/signup")
def signup(user: SignUpRequest):
    existing_by_email = supabase.table("registration_table").select("*").eq("email", user.email).execute()
    existing_by_phone = supabase.table("registration_table").select("*").eq("phone", user.phone).execute()

    email_row = existing_by_email.data[0] if existing_by_email.data else None
    phone_row = existing_by_phone.data[0] if existing_by_phone.data else None

    # A verified account already owns this email -> hard block
    if email_row and email_row.get("is_verified"):
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please log in.")

    # A verified account already owns this phone (and it isn't the same account as the email match) -> hard block
    if phone_row and phone_row.get("is_verified") and (not email_row or phone_row["id"] != email_row["id"]):
        raise HTTPException(status_code=400, detail="An account with this phone number already exists. Please log in.")

    # Email and phone belong to two DIFFERENT unverified accounts -> ambiguous, don't silently merge or overwrite either
    if email_row and phone_row and email_row["id"] != phone_row["id"]:
        raise HTTPException(
            status_code=400,
            detail="This email and phone number belong to two different pending signups. "
                    "Please use a matching email and phone, or try resending verification for one of them."
        )

    existing_row = email_row or phone_row  # if set, this is the SAME unverified account for both fields

    hashed_pwd = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    token = secrets.token_urlsafe(32)
    token_expires = (datetime.now(timezone.utc) + timedelta(hours=VERIFICATION_TOKEN_HOURS)).isoformat()

    if existing_row:
        # An unverified account with this exact email+phone already exists (e.g. they
        # never clicked the link, or the 24h window expired). Refresh their details
        # and send a brand new verification link instead of permanently blocking them.
        supabase.table("registration_table").update({
            "name": user.name,
            "phone": user.phone,
            "age": user.age,
            "password": hashed_pwd,
            "profession": user.profession,
            "verification_token": token,
            "verification_token_expires": token_expires,
        }).eq("id", existing_row["id"]).execute()

        try:
            _send_verification_email(user.email, token)
        except Exception as exc:
            raise HTTPException(
                status_code=201,
                detail=f"Details updated, but verification email failed to send: {exc}"
            )

        return {
            "message": "An unverified account with this email already existed — we've sent a new verification link.",
            "user_id": existing_row["id"]
        }

    result = supabase.table("registration_table").insert({
        "name": user.name, "email": user.email, "phone": user.phone,
        "age": user.age, "password": hashed_pwd, "profession": user.profession,
        "is_verified": False,
        "verification_token": token,
        "verification_token_expires": token_expires,
    }).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create user")

    try:
        _send_verification_email(user.email, token)
    except Exception as exc:
        # Account is created either way — surface the email problem separately
        # so the frontend can tell the user their account exists but the
        # verification email failed to send.
        raise HTTPException(
            status_code=201,
            detail=f"Account created, but verification email failed to send: {exc}"
        )

    return {
        "message": "Signup successful. Please check your email to verify your account.",
        "user_id": result.data[0]["id"]
    }


@router.get("/verify-email", response_class=HTMLResponse)
def verify_email(token: str):
    result = supabase.table("registration_table") \
        .select("id, verification_token_expires, is_verified") \
        .eq("verification_token", token) \
        .execute()

    if not result.data:
        return HTMLResponse("<h2>Invalid or already-used verification link.</h2>", status_code=400)

    db_user = result.data[0]

    if db_user["is_verified"]:
        return HTMLResponse("<h2>Your email is already verified. You can log in.</h2>")

    expires_at = datetime.fromisoformat(db_user["verification_token_expires"])
    if expires_at < datetime.now(timezone.utc):
        return HTMLResponse(
            "<h2>This verification link has expired. Please request a new one from the sign-in page.</h2>",
            status_code=400
        )

    supabase.table("registration_table").update({
        "is_verified": True,
        "verification_token": None,
        "verification_token_expires": None,
    }).eq("id", db_user["id"]).execute()

    return HTMLResponse("<h2>✅ Your email has been verified! You can now close this tab and log in.</h2>")


@router.post("/resend-verification")
def resend_verification(payload: ResendVerificationRequest):
    result = supabase.table("registration_table") \
        .select("id, is_verified") \
        .eq("email", payload.email) \
        .execute()

    # Don't reveal whether the email exists
    if not result.data:
        return {"message": "If that email is registered and unverified, a new link has been sent."}

    db_user = result.data[0]
    if db_user["is_verified"]:
        return {"message": "If that email is registered and unverified, a new link has been sent."}

    token = secrets.token_urlsafe(32)
    token_expires = (datetime.now(timezone.utc) + timedelta(hours=VERIFICATION_TOKEN_HOURS)).isoformat()

    supabase.table("registration_table").update({
        "verification_token": token,
        "verification_token_expires": token_expires,
    }).eq("id", db_user["id"]).execute()

    try:
        _send_verification_email(payload.email, token)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {exc}") from exc

    return {"message": "If that email is registered and unverified, a new link has been sent."}


@router.post("/signin")
def signin(user: SignInRequest):
    result = supabase.table("registration_table") \
        .select("*") \
        .or_(f"email.eq.{user.username},phone.eq.{user.username}") \
        .execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="User not found")
    db_user = result.data[0]
    if not bcrypt.checkpw(user.password.encode("utf-8"), db_user["password"].encode("utf-8")):
        raise HTTPException(status_code=401, detail="Wrong password")

    if not db_user.get("is_verified", False):
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before signing in. Check your inbox for the verification link."
        )

    log_id = None
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        # Try inserting WITH last_seen_at first (requires the column to exist)
        try:
            log_result = supabase.table("login_log").insert({
                "user_id": db_user["id"], "ip": user.ip,
                "lat": user.lat, "long": user.long,
                "last_seen_at": now_iso,
            }).execute()
        except Exception:
            # Fallback: column may not exist yet — insert without it
            log_result = supabase.table("login_log").insert({
                "user_id": db_user["id"], "ip": user.ip,
                "lat": user.lat, "long": user.long,
            }).execute()
        if log_result.data:
            log_id = log_result.data[0]["id"]
    except Exception as e:
        print(f"Warning: login log failed: {e}")

    return {
        "message": "Login successful",
        "name": db_user["name"],
        "user_id": db_user["id"],
        "log_id": log_id,
        "is_admin": db_user.get("is_admin", False),
    }


@router.post("/change-password")
def change_password(payload: ChangePasswordRequest):
    result = supabase.table("registration_table").select("*").eq("id", payload.user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    db_user = result.data[0]
    if not bcrypt.checkpw(payload.current_password.encode("utf-8"), db_user["password"].encode("utf-8")):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    new_hashed = bcrypt.hashpw(payload.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    update_result = supabase.table("registration_table").update({"password": new_hashed}).eq("id", payload.user_id).execute()
    if not update_result.data:
        raise HTTPException(status_code=400, detail="Failed to update password")
    return {"message": "Password updated successfully"}


@router.get("/users")
def get_users():
    result = supabase.table("registration_table").select("*").execute()
    if not result.data:
        return {"users": [], "message": "No users found"}
    return {"users": [{k: v for k, v in u.items() if k != "password"} for u in result.data], "count": len(result.data)}


@router.post("/signout/{log_id}")
def signout(log_id: int):
    try:
        supabase.table("login_log").update({"ended_at": datetime.now(timezone.utc).isoformat()}).eq("id", log_id).execute()
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Signout failed: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# SINGLE-SESSION ENFORCEMENT
#
# REQUIRED DB MIGRATION (run once in Supabase SQL editor):
#   ALTER TABLE login_log ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
#
# Without this column the /active-session and /heartbeat endpoints below will
# still return valid JSON (not crash), but active_elsewhere will always be false.
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/active-session/{user_id}")
def active_session(user_id: int, exclude_log_id: int | None = None):
    """
    Returns whether another session is live for this user (not the caller's own).
    A session is "live" if ended_at IS NULL and last_seen_at is within HEARTBEAT_STALE_SECONDS.
    exclude_log_id must be the caller's own log_id to avoid self-detection.
    """
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(seconds=HEARTBEAT_STALE_SECONDS)).isoformat()
        query = supabase.table("login_log") \
            .select("id, ip, last_seen_at") \
            .eq("user_id", user_id) \
            .is_("ended_at", "null") \
            .gte("last_seen_at", cutoff)
        if exclude_log_id is not None:
            query = query.neq("id", exclude_log_id)
        result = query.order("last_seen_at", desc=True).execute()
        other = result.data[0] if result.data else None
        return {"active_elsewhere": other is not None, "other": other}
    except Exception as e:
        # Most common cause: last_seen_at column doesn't exist yet
        error_str = str(e)
        print(f"[active-session] error: {error_str}")
        if "last_seen_at" in error_str or "column" in error_str.lower():
            return {
                "active_elsewhere": False,
                "error": "DB column missing. Run: ALTER TABLE login_log ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;"
            }
        return {"active_elsewhere": False, "error": error_str}


@router.post("/heartbeat/{log_id}")
def heartbeat(log_id: int):
    """
    Refreshes last_seen_at. Returns active:false if the session was ended by /takeover.
    Returns active:true even if last_seen_at column is missing (graceful degradation).
    """
    try:
        result = supabase.table("login_log").select("id, ended_at").eq("id", log_id).execute()
        if not result.data:
            return {"active": False, "reason": "row_not_found"}
        if result.data[0]["ended_at"] is not None:
            return {"active": False, "reason": "session_ended"}
        # Update last_seen_at — if column doesn't exist this will fail, we catch it below
        supabase.table("login_log").update({
            "last_seen_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", log_id).execute()
        return {"active": True}
    except Exception as e:
        error_str = str(e)
        print(f"[heartbeat] error: {error_str}")
        if "last_seen_at" in error_str or "column" in error_str.lower():
            # Column missing — session is structurally alive, don't displace the user
            return {"active": True, "warning": "last_seen_at column missing — cross-device enforcement disabled"}
        return {"active": True}


@router.post("/takeover/{log_id}")
def takeover(log_id: int):
    """Ends all OTHER live sessions for this user, making log_id the sole active session."""
    current = supabase.table("login_log").select("id, user_id").eq("id", log_id).execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Session not found")
    user_id = current.data[0]["user_id"]
    supabase.table("login_log") \
        .update({"ended_at": datetime.now(timezone.utc).isoformat()}) \
        .eq("user_id", user_id) \
        .neq("id", log_id) \
        .is_("ended_at", "null") \
        .execute()
    return {"message": "Other sessions ended", "active_log_id": log_id}