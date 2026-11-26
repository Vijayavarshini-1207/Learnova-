import json
import os
import re
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

try:
    from google import genai
except ImportError:  # The API still starts; AI routes explain the missing dependency.
    genai = None

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
DB_PATH = Path(os.getenv("LEARNOVA_DB_PATH", BASE_DIR / "learnova.db"))
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

app = FastAPI(title="Learnova API", version="1.0.0", description="Backend for the Learnova student study assistant.")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def db_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with db_connection() as connection:
        connection.execute("""CREATE TABLE IF NOT EXISTS quiz_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            score INTEGER NOT NULL,
            total INTEGER NOT NULL,
            created_at TEXT NOT NULL
        )""")
        connection.execute("""CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kind TEXT NOT NULL,
            title TEXT NOT NULL,
            created_at TEXT NOT NULL
        )""")


init_db()


def require_gemini():
    if not API_KEY:
        raise HTTPException(status_code=503, detail="Gemini API key is not configured. Add GEMINI_API_KEY to backend/.env and restart the backend.")
    if genai is None:
        raise HTTPException(status_code=503, detail="The Google Gen AI package is missing. Run pip install -r requirements.txt in the backend folder.")
    return genai.Client(api_key=API_KEY)


def generate_text(prompt: str) -> str:
    client = require_gemini()
    try:
        response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
        text = getattr(response, "text", None)
        if not text:
            raise ValueError("The AI service returned an empty response.")
        return text.strip()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {exc}") from exc


def record_activity(kind: str, title: str):
    with db_connection() as connection:
        connection.execute(
            "INSERT INTO activities(kind, title, created_at) VALUES (?, ?, ?)",
            (kind, title[:180], datetime.now().strftime("%d %b %Y, %I:%M %p")),
        )


class SummaryRequest(BaseModel):
    text: str = Field(min_length=1, max_length=100000)
    mode: str = "short"


class QuizRequest(BaseModel):
    text: str = Field(min_length=1, max_length=50000)
    difficulty: str = "medium"
    count: int = Field(default=5, ge=1, le=10)


class ExplainRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=2000)
    level: str = "beginner"


class PlanRequest(BaseModel):
    subjects: str = Field(min_length=1, max_length=10000)
    hours_per_day: float = Field(default=2, ge=0.5, le=16)
    days: int = Field(default=7, ge=1, le=30)
    exam_date: Optional[str] = None


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=10000)


class SaveRequest(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    score: int = Field(ge=0)
    total: int = Field(ge=1)


@app.get("/")
def root():
    return {"app": "Learnova API", "status": "running", "docs": "/docs"}


@app.get("/api/dashboard")
def dashboard():
    with db_connection() as connection:
        quiz_rows = connection.execute("SELECT score, total FROM quiz_results").fetchall()
        activity_count = connection.execute("SELECT COUNT(*) FROM activities").fetchone()[0]
        activities = connection.execute("SELECT kind, title, created_at FROM activities ORDER BY id DESC LIMIT 6").fetchall()
    total_score = sum(row["score"] for row in quiz_rows)
    total_questions = sum(row["total"] for row in quiz_rows)
    average = round((total_score / total_questions) * 100) if total_questions else 0
    return {
        "activities": activity_count,
        "quizzes": len(quiz_rows),
        "average_score": average,
        "recent": [dict(row) for row in activities],
    }


@app.post("/api/summary")
def summarize(request: SummaryRequest):
    detail = "a concise summary with the key ideas and important terms" if request.mode == "short" else "a detailed, well-organized summary with headings, key points, and important terms"
    prompt = f"You are Learnova, a friendly study assistant. Summarize the following study notes as {detail}. Use clear student-friendly language. Do not add facts that are not in the notes.\n\nNOTES:\n{request.text}"
    result = generate_text(prompt)
    record_activity("Notes summary", "Summarized study notes")
    return {"summary": result}


@app.post("/api/file-summary")
async def summarize_file(file: UploadFile = File(...), mode: str = Form("short")):
    filename = (file.filename or "uploaded-file").lower()
    content = await file.read()
    if len(content) > 12 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Please upload a file smaller than 12 MB.")
    if filename.endswith(".txt"):
        text = content.decode("utf-8", errors="replace")
    elif filename.endswith(".pdf"):
        try:
            from pypdf import PdfReader
            import io
            reader = PdfReader(io.BytesIO(content))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Could not read this PDF: {exc}") from exc
    else:
        raise HTTPException(status_code=415, detail="Only PDF and TXT files are supported.")
    if not text.strip():
        raise HTTPException(status_code=400, detail="No readable text was found in this file.")
    result = summarize(SummaryRequest(text=text[:100000], mode=mode))
    return result


@app.post("/api/quiz")
def create_quiz(request: QuizRequest):
    prompt = f'''Create {request.count} multiple-choice questions based only on the study material below. Difficulty: {request.difficulty}.
Return ONLY valid JSON, with this exact shape:
{{"topic":"short topic name","questions":[{{"question":"...","options":["...","...","...","..."],"answer":"A","explanation":"..."}}]}}
Use answer values A, B, C, or D. Each question must have exactly four options. Keep explanations brief and student-friendly.
STUDY MATERIAL:\n{request.text}'''
    raw = generate_text(prompt)
    try:
        match = re.search(r"\{[\s\S]*\}", raw)
        if not match:
            raise ValueError("No JSON object found")
        payload = json.loads(match.group(0))
        questions = payload.get("questions", [])
        if not questions:
            raise ValueError("No questions were returned")
        for question in questions:
            if len(question.get("options", [])) != 4 or question.get("answer") not in ["A", "B", "C", "D"]:
                raise ValueError("The AI returned an invalid question format")
        record_activity("Quiz generated", payload.get("topic", "Practice quiz"))
        return payload
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not format the generated quiz. Please try again. Details: {exc}") from exc


@app.post("/api/explain")
def explain(request: ExplainRequest):
    prompt = f"You are Learnova, a patient tutor. Explain '{request.topic}' for a student at {request.level} level. Start with a simple meaning, then explain the main idea step by step, include one relatable example, and end with a short recap. Use plain language and avoid unnecessary jargon."
    result = generate_text(prompt)
    record_activity("Concept explained", request.topic)
    return {"explanation": result}


@app.post("/api/plan")
def create_plan(request: PlanRequest):
    prompt = f"Create a practical study plan for {request.days} days, with {request.hours_per_day} study hours per day. Subjects and topics: {request.subjects}. Exam date: {request.exam_date or 'not specified'}. Use a clear day-by-day schedule with realistic breaks, revision time, and short practice sessions. Keep the plan achievable and easy to follow."
    result = generate_text(prompt)
    record_activity("Study plan created", "Study plan for " + str(request.days) + " days")
    return {"plan": result}


@app.post("/api/chat")
def chat(request: ChatRequest):
    prompt = f"You are Learnova AI, a helpful and encouraging academic study companion. Answer the student's doubt clearly and accurately. Use simple language, show steps for calculations or programming questions, and ask a short clarifying question only if needed. If the question is outside academics, still respond politely.\n\nSTUDENT QUESTION: {request.message}"
    result = generate_text(prompt)
    record_activity("AI chat", request.message[:80])
    return {"reply": result}


@app.post("/api/save")
def save_quiz(request: SaveRequest):
    if request.score > request.total:
        raise HTTPException(status_code=400, detail="Score cannot be greater than the total number of questions.")
    now = datetime.now().strftime("%d %b %Y, %I:%M %p")
    with db_connection() as connection:
        connection.execute(
            "INSERT INTO quiz_results(title, score, total, created_at) VALUES (?, ?, ?, ?)",
            (request.title, request.score, request.total, now),
        )
        connection.execute(
            "INSERT INTO activities(kind, title, created_at) VALUES (?, ?, ?)",
            ("Quiz completed", request.title, now),
        )
    return {"saved": True}
