import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "study_assistant.db"

def connect():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    return con

def init_db():
    with connect() as con:
        con.execute("CREATE TABLE IF NOT EXISTS activity (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, title TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
        con.execute("CREATE TABLE IF NOT EXISTS quiz_results (id INTEGER PRIMARY KEY AUTOINCREMENT, topic TEXT, score INTEGER, total INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
        con.execute("CREATE TABLE IF NOT EXISTS chat (id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT, message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")

def log(kind, title):
    with connect() as con:
        con.execute("INSERT INTO activity(kind,title) VALUES(?,?)", (kind, title[:180]))
