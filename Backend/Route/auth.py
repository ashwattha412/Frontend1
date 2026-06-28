import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException
from Schema.Schema import SignUpRequest, SignInRequest, ChangePasswordRequest
from Database.Supabase import supabase

router = APIRouter(prefix="/auth", tags=["Auth"])

HEARTBEAT_STALE_SECONDS = 45


@router.post("/signup")
def signup(user: SignUpRequest):
    existing = supabase.table("registration_table") \
        .select("*") \
        .or_(f"email.eq.{user.email},phone.eq.{user.phone}") \
        .execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="User already exists")
    hashed_pwd = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    result = supabase.table("registration_table").insert({
        "name": user.name, "email": user.email, "phone": user.phone,
        "age": user.age, "password": hashed_pwd, "profession": user.profession
    }).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create user")
    return {"message": "Signup successful", "user_id": result.data[0]["id"]}


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