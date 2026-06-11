from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import uvicorn

app = FastAPI(title="AURA Proxy Backend")

# Allow the React frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

HF_BASE_URL = "https://mayank214-aura.hf.space"

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default_session"

@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    try:
        # Forward the request to the Hugging Face model
        response = requests.post(f"{HF_BASE_URL}/generate", json={
            "message": req.message,
            "session_id": req.session_id
        })
        response.raise_for_status()
        
        # Returns exactly what HF responds with (contains 'response', 'emotion', 'stress', etc.)
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
