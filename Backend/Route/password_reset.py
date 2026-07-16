import os
import random
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException
import bcrypt

from Schema.Schema import ForgotPasswordRequest, ResetPasswordRequest
from Database.Supabase import supabase
from Utils.email_utils import send_email

router = APIRouter(prefix="/auth", tags=["Password Reset"])

OTP_EXPIRY_MINUTES = 10


def _send_otp_email(to_email: str, otp: str):
    subject = "Your AURA password reset code"
    body = (
        f"Your one-time password reset code is: {otp}\n\n"
        f"This code expires in {OTP_EXPIRY_MINUTES} minutes. "
        f"If you didn't request this, you can safely ignore this email."
    )
    send_email(to_email, subject, body)


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    """Step 1: user submits their email, we email them a 6-digit code."""
    user_result = supabase.table("registration_table").select("id").eq("email", payload.email).execute()

    # Always return the same message whether or not the email exists,
    # so we don't leak which emails are registered.
    if not user_result.data:
        return {"message": "If that email is registered, a code has been sent."}

    user_id = user_result.data[0]["id"]

    otp = f"{random.randint(0, 999999):06d}"
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)).isoformat()

    # invalidate any previous unused codes for this user
    supabase.table("password_reset_otp").update({"used": True}).eq("user_id", user_id).eq("used", False).execute()

    supabase.table("password_reset_otp").insert({
        "user_id": user_id,
        "otp_code": otp,
        "expires_at": expires_at,
        "used": False,
    }).execute()

    try:
        _send_otp_email(payload.email, otp)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {exc}") from exc

    return {"message": "If that email is registered, a code has been sent."}


@router.post("/reset-password-otp")
def reset_password_otp(payload: ResetPasswordRequest):
    """Step 2: user submits email + code + new password in one go."""
    user_result = supabase.table("registration_table").select("id").eq("email", payload.email).execute()
    if not user_result.data:
        raise HTTPException(status_code=400, detail="Invalid code or email")
    user_id = user_result.data[0]["id"]

    otp_result = (
        supabase.table("password_reset_otp")
        .select("*")
        .eq("user_id", user_id)
        .eq("otp_code", payload.otp)
        .eq("used", False)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not otp_result.data:
        raise HTTPException(status_code=400, detail="Invalid code or email")

    otp_row = otp_result.data[0]
    expires_at = datetime.fromisoformat(otp_row["expires_at"])
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Code has expired, please request a new one")

    new_hashed = bcrypt.hashpw(payload.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    supabase.table("registration_table").update({"password": new_hashed}).eq("id", user_id).execute()
    supabase.table("password_reset_otp").update({"used": True}).eq("id", otp_row["id"]).execute()

    return {"message": "Password reset successful"}