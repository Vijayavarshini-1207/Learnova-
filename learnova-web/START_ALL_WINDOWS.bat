@echo off
start "Learnova Backend" cmd /k "cd /d %~dp0backend && if not exist .venv py -m venv .venv && call .venv\Scripts\activate.bat && py -m pip install -r requirements.txt && py -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"
timeout /t 3 >nul
start "Learnova Frontend" cmd /k "cd /d %~dp0frontend && if not exist node_modules npm install && npm run dev"
