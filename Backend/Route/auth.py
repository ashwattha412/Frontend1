import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# pyrefly: ignore [missing-import]
import bcrypt

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from Schema.Schema import SignUpRequest, SignInRequest
from Database.Supabase import supabase

router = APIRouter(prefix="/auth", tags=["Auth"])


# -------------------------
# SIGN UP
# -------------------------
@router.post("/signup")
def signup(user: SignUpRequest):

    # check if user already exists
    existing = supabase.table("registration_table") \
        .select("*") \
        .or_(f"email.eq.{user.email},phone.eq.{user.phone}") \
        .execute()

    if existing.data:
        raise HTTPException(
            status_code=400,
            detail="User already exists"
        )
    hashed_pwd=bcrypt.hashpw(user.password.encode("utf-8"),bcrypt.gensalt()).decode("utf-8")
    # insert user into supabase
    result = supabase.table("registration_table").insert({
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "age": user.age,
        "password": hashed_pwd,
        "profession": user.profession
    }).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create user")

    return {"message": "Signup successful", "user_id": result.data[0]["id"]}


# -------------------------
# SIGN IN
# -------------------------
@router.post("/signin")
def signin(user: SignInRequest):

    result = supabase.table("registration_table") \
        .select("*") \
        .or_(f"email.eq.{user.username},phone.eq.{user.username}") \
        .execute()

    if not result.data:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    db_user = result.data[0]

    db_password = db_user["password"]
    password_correct = False
    try:
        password_correct = bcrypt.checkpw(user.password.encode("utf-8"), db_password.encode("utf-8"))
    except (ValueError, TypeError):
        # Malformed hash in DB — reject the login
        password_correct = False

    if not password_correct:
        raise HTTPException(
            status_code=401,
            detail="Wrong password"
        )
    
    log_id = None
    try:
        log_payload = {
            "user_id": db_user["id"],
            "ip": user.ip,
            "lat": user.lat,
            "long": user.long
        }
        log_result = supabase.table("login_log").insert(log_payload).execute()
        if log_result.data:
            log_id = log_result.data[0]["id"]
    except Exception as e:
        print(f"Warning: Failed to create login log {str(e)}")

    return {
        "message": "Login successful",
        "name": db_user["name"],
        "user_id": db_user["id"],
        "log_id": log_id
    }


# -------------------------
# GET ALL USERS
# -------------------------
@router.get("/users")
def get_users():
    result = supabase.table("registration_table").select("*").execute()

    if not result.data:
        return {"users": [], "message": "No users found"}

    # Strip passwords before returning
    users = [
        {key: val for key, val in user.items() if key != "password"}
        for user in result.data
    ]

    return {"users": users, "count": len(users)}



@router.post("/signout/{log_id}")
def signout(log_id:int):
    try:
        signout= supabase.table("login_log") \
            .update({"ended_at": datetime.now(timezone.utc).isoformat()}) \
            .eq("id", log_id) \
            .execute()
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record signout: {str(e)}")