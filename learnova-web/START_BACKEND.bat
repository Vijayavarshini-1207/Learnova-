@echo off
cd /d "%~dp0backend"
if not exist .venv py -m venv .venv
call .venv\Scripts\activate.bat
py -m pip install -r requirements.txt
py -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
pause
