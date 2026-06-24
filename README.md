<!--
  SOCIAL PREVIEW
  ────────────────────────────────────────────────────
  Title:       AURA — Adaptive Understanding of Responses and Affect
  Description: Emotionally intelligent mental health peer companion. Combines real-time emotion & stress classification with LLM orchestration to provide adaptive, empathetic conversations.
  ────────────────────────────────────────────────────
-->

<h1 align="center">
  🧠 AURA <sup><sub>v1.0.0</sub></sup>
</h1>

<p align="center">
  <b>Adaptive Understanding of Responses and Affect</b><br>
  An emotionally intelligent mental health peer companion.<br>
  Features real-time emotion tracking (GoEmotions) and mental distress detection (MentalBERT) to dynamically adapt LLM (Llama 3) responses.
</p>

<p align="center">
  <a href="https://reactjs.org/"><img src="https://img.shields.io/badge/frontend-React%20%7C%20Vite-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React Frontend"></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/backend-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI Backend"></a>
  <a href="https://huggingface.co/"><img src="https://img.shields.io/badge/AI-Hugging%20Face%20%7C%20Llama%203-FFD21E?style=flat-square&logo=huggingface&logoColor=black" alt="AI Engine"></a>
  <a href="https://supabase.com/"><img src="https://img.shields.io/badge/database-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Database"></a>
  <br>
  <img src="https://img.shields.io/badge/status-production%20ready-brightgreen?style=flat-square" alt="Production Ready">
  <img src="https://img.shields.io/badge/license-MIT-success?style=flat-square" alt="MIT License">
</p>

---

## Table of Contents

- [Emoji Legend](#emoji-legend)
- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Configuration Reference](#configuration-reference)
- [API Endpoints](#api-endpoints)
- [License](#license)

---

## Emoji Legend

| Icon | Designation | Context in AURA |
|------|-------------|------------------|
| 🧠 | Core Engine | AURA orchestration identity |
| 💬 | Chat Interface| Real-time messaging frontend |
| 🎭 | Emotion | GoEmotions 28-category tracking |
| ⚠️ | Distress | MentalBERT stress & crisis detection |
| 🛡️ | Safety | Crisis overrides and emotional safety protocols |
| 💾 | Memory | Supabase session storage and chat history |

---

## Overview

AURA (Adaptive Understanding of Responses and Affect) is a next-generation mental health chatbot designed to feel like a warm, peer companion. Unlike standard chatbots, AURA actively "listens" to the emotional undertones of the user's text. 

By passing every message through dual natural language processing classifiers—one for **Emotion** (28 distinct categories) and one for **Stress** (Anxiety, Depression, Suicidal, Normal)—AURA dynamically adjusts the tone, strategy, and boundaries of the core LLM (Llama 3) before it generates a response. If a user is detected in crisis (e.g., severe distress or suicidal ideation), AURA instantly overrides its standard conversational persona to prioritize de-escalation and emotional safety.

---

## Features

- **Dual-Layer Classification:** Every user message is analyzed for 28 GoEmotions categories (joy, grief, anger, etc.) and 4 mental health states (Normal, Anxiety, Depression, Suicidal).
- **Dynamic LLM Orchestration:** The underlying Llama 3 prompt is re-written on the fly based on the user's emotional state. 
- **Crisis Override:** Hardcoded safety layers immediately intercept severe distress signals, altering AURA's tone to be extremely gentle, validating, and grounding without sounding clinical.
- **Session Memory:** Full conversation persistence via Supabase, allowing AURA to remember context over long sessions.
- **Modern UI:** A beautiful, responsive React/Vite frontend utilizing Tailwind CSS and glassmorphism design principles.

---

## Architecture

AURA is split into a modern microservices architecture:

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         AURA DATA FLOW                                      │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │                                                                             │
 │  ┌──────────┐      ┌──────────┐      ┌───────────────┐      ┌──────────┐    │
 │  │ React UI │─────▶│ FastAPI  │─────▶│ backend-llm   │─────▶│ Llama 3  │    │
 │  │ (Vite)   │◀─────│ (Main)   │◀─────│ (FastAPI/HF)  │◀─────│ (Groq/HF)│    │
 │  └────┬─────┘      └────┬─────┘      └───────┬───────┘      └──────────┘    │
 │       │                 │                    │                              │
 │       ▼                 ▼                    ▼                              │
 │   User Input        Supabase DB        1. RoBERTa (Emotion)                 │
 │                     Auth & Memory      2. MentalBERT (Stress)               │
 │                                        3. Prompt Orchestrator               │
 └─────────────────────────────────────────────────────────────────────────────┘
```

### 1. Frontend (`/Frontend`)
A React single-page application that handles user authentication and the chat interface. It communicates directly with Supabase for Auth and the Main Backend for message routing.

### 2. Main Backend (`/Backend`)
A FastAPI server that acts as the secure middleman. It validates user sessions, stores chat history in Supabase, and proxies prompts securely to the LLM microservice.

### 3. AI Orchestrator (`/backend-llm`)
A dedicated Python microservice designed for deployment on Hugging Face Spaces or Render. It runs the NLP classification models and handles the logic mapping emotions to LLM prompts.

---

## Tech Stack

| Component | Technology | Function |
|-----------|-----------|----------|
| **Frontend** | React, Vite, TailwindCSS | High-performance, responsive UI |
| **Auth & DB** | Supabase, bcrypt | User management, session storage |
| **API Layer** | FastAPI, Uvicorn | High-speed async Python backends |
| **Emotion NLP** | `SamLowe/roberta-base-go_emotions` | 28-class emotion detection |
| **Stress NLP** | `ourafla/mental-health-bert-finetuned`| 4-class mental distress detection |
| **Generative AI**| `meta-llama/Meta-Llama-3-8B-Instruct` | Core conversational engine |

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- Supabase Project URL & Anon Key
- Hugging Face / Groq API Key

### 1. Setup Backend
```bash
cd Backend
python -m venv venv
venv\Scripts\activate  # (Windows) or source venv/bin/activate (Mac/Linux)
pip install -r requirements.txt
# Add .env with SUPABASE_URL, SUPABASE_KEY, AURA_URL
uvicorn main:app --host 127.0.0.1 --port 8000
```

### 2. Setup AI Orchestrator
```bash
cd backend-llm
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
# Add .env with HF_TOKEN
uvicorn server:app --host 0.0.0.0 --port 7860
```

### 3. Setup Frontend
```bash
cd Frontend
npm install
# Add .env with VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev
```

---

## Configuration Reference

### Environment Variables

**Backend (`Backend/.env`)**
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase service/anon key
- `AURA_URL`: URL to your `backend-llm` service (e.g. `http://localhost:7860/generate`)
- `CORS_ORIGINS`: Comma separated allowed origins for production

**AI Orchestrator (`backend-llm/.env`)**
- `HF_TOKEN`: Hugging Face API key for Inference endpoints

**Frontend (`Frontend/.env`)**
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anon key

---

## API Endpoints

### AI Orchestrator (`backend-llm`)
- `POST /generate`: Main chat endpoint. Requires `{"message": string, "session_id": string}`. Returns LLM response + emotion/stress scores.
- `POST /emotion`: Standalone text-to-emotion analysis.
- `POST /stress`: Standalone text-to-stress analysis.

### Main Backend
- `POST /auth/signup`: Create a new user.
- `POST /auth/login`: Authenticate and receive session token.
- `GET /sessions/user/{user_id}`: Fetch all chat sessions for a user.
- `POST /messages/chat`: Send a message and get an AURA reply.

---

## License

MIT License

Copyright (c) 2026 AURA Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
