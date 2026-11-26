from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from pypdf import PdfReader
from io import BytesIO
from .db import init_db, connect, log
from .ai import ask, parse_json

app = FastAPI(title="AI Study Assistant API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173","http://127.0.0.1:5173"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def startup():
    init_db()

def generate(prompt):
    try:
        return ask(prompt)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

class TextInput(BaseModel):
    text: str = Field(min_length=3, max_length=30000)
    mode: str = "short"

class QuizInput(BaseModel):
    text: str = Field(min_length=3, max_length=20000)
    difficulty: str = "medium"
    count: int = Field(default=5, ge=3, le=10)

class ExplainInput(BaseModel):
    concept: str = Field(min_length=2, max_length=1000)
    level: str = "beginner"

class PlanInput(BaseModel):
    subjects: str
    hours_per_day: float = 2
    days: int = 7
    exam_date: Optional[str] = None

class ChatInput(BaseModel):
    message: str = Field(min_length=1, max_length=5000)

@app.get("/")
def root():
    return {"message":"AI Study Assistant API is running"}

@app.post("/api/summarize")
def summarize(data: TextInput):
    style = "a concise summary" if data.mode == "short" else "a detailed summary"
    answer = generate(f"Create {style} of these study notes. Use clear student-friendly language, headings, key points, definitions and a short conclusion. Do not invent facts.\n\n{data.text}")
    log("Summary", "Notes summary")
    return {"summary":answer}

@app.post("/api/summarize-file")
async def summarize_file(file: UploadFile = File(...), mode: str = "short"):
    name = (file.filename or "").lower()
    raw = await file.read()
    if name.endswith(".pdf"):
        text = "\n".join(p.extract_text() or "" for p in PdfReader(BytesIO(raw)).pages)
    elif name.endswith(".txt"):
        text = raw.decode("utf-8", errors="ignore")
    else:
        raise HTTPException(400, "Upload a PDF or TXT file.")
    if len(text.strip()) < 20:
        raise HTTPException(400, "No readable text found. Scanned PDFs may need OCR.")
    return summarize(TextInput(text=text[:30000], mode=mode))

@app.post("/api/quiz")
def quiz(data: QuizInput):
    prompt = f"""Create {data.count} {data.difficulty} multiple-choice questions from the material.
Return ONLY JSON in this format:
{{"topic":"topic name","questions":[{{"question":"question","options":["A. option","B. option","C. option","D. option"],"answer":"A","explanation":"why"}}]}}
The answer must be A, B, C or D. Exactly four options per question.
MATERIAL:
{data.text}"""
    try:
        result = parse_json(generate(prompt))
        if not result.get("questions"):
            raise ValueError("No questions returned")
    except Exception as e:
        raise HTTPException(502, f"Could not process quiz response: {e}")
    log("Quiz", result.get("topic","Generated quiz"))
    return result

@app.post("/api/explain")
def explain(data: ExplainInput):
    answer = generate(f"Explain {data.concept} at {data.level} level. Use simple words, a relatable example, step-by-step explanation where useful, and a short recap. Be accurate.")
    log("Explanation", data.concept)
    return {"explanation":answer}

@app.post("/api/study-plan")
def study_plan(data: PlanInput):
    answer = generate(f"Create a practical {data.days}-day study plan. Subjects/topics: {data.subjects}. Available study time: {data.hours_per_day} hours per day. Exam date: {data.exam_date or 'not provided'}. Give day-wise time blocks, breaks, practice and revision. Keep daily study time within the limit and prioritize difficult topics.")
    log("Study plan", f"{data.days}-day plan")
    return {"plan":answer}

@app.post("/api/chat")
def chat(data: ChatInput):
    with connect() as con:
        rows = con.execute("SELECT role,message FROM chat ORDER BY id DESC LIMIT 8").fetchall()
    history = "\n".join(f"{r['role']}: {r['message']}" for r in reversed(rows))
    answer = generate(f"You are a friendly academic study assistant. Answer clearly and simply. If unsure, say so. Recent conversation:\n{history}\nStudent: {data.message}\nAssistant:")
    with connect() as con:
        con.execute("INSERT INTO chat(role,message) VALUES('user',?)", (data.message,))
        con.execute("INSERT INTO chat(role,message) VALUES('assistant',?)", (answer,))
    log("AI Chat", data.message[:80])
    return {"reply":answer}

@app.post("/api/quiz-result")
def save_result(topic: str, score: int, total: int):
    if total < 1 or score < 0 or score > total:
        raise HTTPException(400, "Invalid score")
    with connect() as con:
        con.execute("INSERT INTO quiz_results(topic,score,total) VALUES(?,?,?)", (topic[:180],score,total))
    return {"saved":True}

@app.get("/api/dashboard")
def dashboard():
    with connect() as con:
        activities = con.execute("SELECT COUNT(*) n FROM activity").fetchone()["n"]
        quizzes = con.execute("SELECT COUNT(*) n FROM quiz_results").fetchone()["n"]
        avg = con.execute("SELECT AVG(1.0*score/total*100) a FROM quiz_results").fetchone()["a"] or 0
        recent = con.execute("SELECT kind,title,created_at FROM activity ORDER BY id DESC LIMIT 6").fetchall()
    return {"activities":activities,"quizzes":quizzes,"average_score":round(avg,1),"recent":[dict(x) for x in recent]}
