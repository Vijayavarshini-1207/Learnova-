import os, re, json
from dotenv import load_dotenv
from google import genai

load_dotenv()

def ask(prompt):
    key = os.getenv("GEMINI_API_KEY")
    if not key or key == "your_gemini_api_key_here":
        raise RuntimeError("Gemini API key missing. Add it to backend/.env and restart the server.")
    client = genai.Client(api_key=key)
    response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
    if not getattr(response, "text", None):
        raise RuntimeError("The AI returned an empty response. Please try again.")
    return response.text.strip()

def parse_json(raw):
    cleaned = re.sub(r"```(?:json)?", "", raw, flags=re.I).replace("```", "").strip()
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start < 0 or end < 0:
        raise ValueError("The AI response was not valid JSON. Please generate again.")
    return json.loads(cleaned[start:end+1])
