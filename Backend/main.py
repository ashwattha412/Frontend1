import os
from dotenv import load_dotenv
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from Route.auth import router as auth_router
from Route.sessions import router as sessions_router
from Route.messages import router as messages_router
from Route.journal import router as journals_router
from Database.Supabase import supabase

load_dotenv(override=True)

AURA_URL = os.getenv("AURA_URL", "https://mayank214-aura.hf.space/generate")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app = FastAPI(
    title="Mental Health Chatbot API",
    description="Backend API for signup, signin and chatbot",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(sessions_router)
app.include_router(messages_router)
app.include_router(journals_router)


@app.get("/")
def home():
    return {"message": "API is running"}


class ChatRequest(BaseModel):
    session_id: int
    user_id: int
    content: str


def _call_aura(message: str, session_id: int, user_id: int) -> dict:
    aura_session_id = f"user_{user_id}_session_{session_id}"
    try:
        response = requests.post(
            AURA_URL,
            json={"message": message, "session_id": aura_session_id},
            timeout=90,
        )
        response.raise_for_status()
        bot_reply = response.json()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"AURA service unavailable: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="Invalid response from AURA service") from exc

    required = ("response", "emotion", "emotion_score", "stress_level", "stress_score")
    missing = [key for key in required if key not in bot_reply]
    if missing:
        raise HTTPException(
            status_code=502,
            detail=f"AURA response missing fields: {', '.join(missing)}",
        )
    return bot_reply


@app.post("/chat")
def chat(req: ChatRequest):
    session = supabase.table("session_table").select("user_id").eq("id", req.session_id).execute()
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.data[0]["user_id"] != req.user_id:
        raise HTTPException(status_code=403, detail="Session does not belong to user")

    bot_reply = _call_aura(req.content, req.session_id, req.user_id)

    try:
        supabase.table("message_table").insert({
            "session_id": req.session_id,
            "user_id": req.user_id,
            "sender": "user",
            "content": req.content,
            "emotions_label": bot_reply["emotion"],
            "emotions_score": bot_reply["emotion_score"],
            "stress_level": bot_reply["stress_level"],
            "stress_score": bot_reply["stress_score"],
        }).execute()

        supabase.table("message_table").insert({
            "session_id": req.session_id,
            "user_id": req.user_id,
            "sender": "bot",
            "content": bot_reply["response"],
        }).execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save messages: {exc}") from exc

    return {"reply": bot_reply}


@app.get("/history/{session_id}")
def history(session_id: int):
    result = (
        supabase.table("message_table")
        .select("*")
        .eq("session_id", session_id)
        .order("id")
        .execute()
    )
    return {"messages": result.data}
