from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from classification_services import detect_emotion, detect_stress
from llm_orchestrator import generate_buddy_response

app = FastAPI(
    title="AURA API",
    description="Adaptive Understanding of Responses and Affect — Emotionally intelligent chatbot API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # teammates can call from any origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store: { session_id: [{"role":..,"content":..}, ...] }
sessions: dict = {}

# ─── Request / Response Schemas ───────────────────────────────────────────────

class GenerateRequest(BaseModel):
    message: str
    session_id: str = "default"

class GenerateResponse(BaseModel):
    response: str
    emotion: str
    emotion_score: float
    stress_level: str
    stress_score: float
    session_id: str

class EmotionRequest(BaseModel):
    message: str

class StressRequest(BaseModel):
    message: str

# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "name": "AURA API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "POST /generate": "Main chat endpoint — send a message, get AURA's response",
            "POST /emotion":  "Classify emotion from text (28 GoEmotions categories)",
            "POST /stress":   "Detect stress level from text (MentalBERT)",
            "DELETE /session/{session_id}": "Clear a conversation session",
            "GET /health":    "Health check"
        }
    }

@app.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Load or create this session's conversation history
    history = sessions.get(req.session_id, [])

    # Run classifiers
    e_data = detect_emotion(req.message)
    s_data = detect_stress(req.message)

    # Generate response with memory
    reply = generate_buddy_response(
        user_message=req.message,
        e_label=e_data["emotion"],
        s_label=s_data["stress_level"],
        conversation_history=history
    )

    # Update and cap history at 20 messages (10 turns)
    history.append({"role": "user",      "content": req.message})
    history.append({"role": "assistant", "content": reply})
    sessions[req.session_id] = history[-20:]

    return GenerateResponse(
        response=reply,
        emotion=e_data["emotion"],
        emotion_score=round(e_data["emotion_score"], 3),
        stress_level=s_data["stress_level"],
        stress_score=round(s_data["stress_score"], 3),
        session_id=req.session_id
    )

@app.post("/emotion")
def emotion(req: EmotionRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    return detect_emotion(req.message)

@app.post("/stress")
def stress(req: StressRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    return detect_stress(req.message)

@app.delete("/session/{session_id}")
def clear_session(session_id: str):
    sessions.pop(session_id, None)
    return {"message": f"Session '{session_id}' cleared successfully."}

@app.get("/health")
def health():
    return {"status": "ok", "sessions_active": len(sessions)}
