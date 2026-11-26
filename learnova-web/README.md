# Learnova — Study Assistant Web App

A React + Vite frontend and FastAPI backend for Learnova. The interface uses the selected **Burgundy + Coral + Peach + Warm White** palette, a restrained student-friendly layout, responsive navigation, interactive study tools, and a small floating Learnova AI chat button in the bottom-right corner.

## What's included

- Sign-in screen (demo-only local sign-in; not real account authentication)
- Dashboard with activity cards, quick actions, progress and a clickable study checklist
- Notes summarizer (paste text or upload PDF/TXT)
- AI quiz generator with answer selection, marking and saved scores
- Concept explainer with beginner/intermediate/advanced levels
- Study plan generator
- AI chat page and a small floating chatbot available from the app
- Reports, settings, responsive mobile sidebar
- FastAPI backend, Gemini integration, and SQLite activity storage

## Requirements

- Node.js 18+ (Node.js 20 LTS recommended)
- Python 3.10+
- A Gemini API key for AI features (the frontend can open without it, but AI requests need the key)

## 1. Configure the Gemini API key

1. Open `backend/.env.example` and make a copy named `.env` in the same `backend` folder.
2. Open `backend/.env` and replace `your_gemini_api_key_here` with your key from Google AI Studio.
3. Keep the key in the backend `.env` file. Do not paste it into React code or commit it to GitHub.

The default model is `gemini-2.5-flash`. You can change `GEMINI_MODEL` in `backend/.env` if needed.

## 2. Start the backend (Windows PowerShell)

Open a terminal in the project folder and run:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
py -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

If PowerShell blocks activation, use this once in that terminal:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

You can check the backend at `http://127.0.0.1:8000` and its API docs at `http://127.0.0.1:8000/docs`.

## 3. Start the frontend

Open a **second terminal** in the project folder:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL Vite prints (normally `http://localhost:5173`).

## 4. Sign in

Enter any non-empty username and password. This starter version uses a local demo sign-in only; it does not create a real account or securely authenticate users. The Google sign-in option from the earlier mockup is intentionally not shown as active because OAuth credentials and a proper authentication flow have not been configured.

## 5. Using Learnova

- **Summarize Notes:** paste text or upload a PDF/TXT file, choose short or detailed, then create the summary.
- **Generate Quiz:** paste notes or a topic, choose difficulty and question count, generate questions, select answers and check your score.
- **Explain Concept:** enter a topic and choose the explanation level.
- **Study Planner:** enter subjects, daily study time, duration and optional exam date.
- **Learnova AI:** use the AI Chat page or click the small round bot icon at the bottom-right of the app.

## Project structure

```text
learnova-web/
├── README.md
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── .env.example
    └── src/
        ├── App.jsx
        ├── api.js
        ├── main.jsx
        └── styles.css
```

## Notes

- The SQLite database (`backend/learnova.db`) is created automatically the first time the backend starts.
- If the frontend cannot reach the backend, confirm both terminals are running and that `frontend/.env` points to `http://localhost:8000`.
- If an AI feature reports that the Gemini key is missing, check `backend/.env`, then restart Uvicorn.
- Before publishing publicly, add real authentication, rate limiting, appropriate privacy controls, and deployment-specific CORS settings.
