import os
import time
from typing import Dict, Tuple

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from openai import OpenAI

# ----- CORS from env -----
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [o.strip() for o in allowed_origins_str.split(",") if o.strip()]
if not ALLOWED_ORIGINS:
    ALLOWED_ORIGINS = ["http://localhost:3000"]

app = FastAPI(title="FlipSide API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

# ----- Simple in-memory rate limit (per IP) -----
# NOTE: This resets on process restart; good enough for dev and small demos.
_RATE_LIMIT_WINDOW_SEC = 60
_RATE_LIMIT_MAX = 30  # requests per window per IP
_rate_state: Dict[str, Tuple[int, int]] = {}  # ip -> (window_start_ts, count)

def check_rate_limit(ip: str):
    now = int(time.time())
    window_start, count = _rate_state.get(ip, (now, 0))
    if now - window_start >= _RATE_LIMIT_WINDOW_SEC:
        # new window
        _rate_state[ip] = (now, 1)
        return
    # same window
    count += 1
    _rate_state[ip] = (window_start, count)
    if count > _RATE_LIMIT_MAX:
        raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")

# ----- Models & validation -----
class FilterIn(BaseModel):
    originalText: str

    @field_validator("originalText")
    @classmethod
    def trim_and_check(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("Text is required.")
        if len(v) > 2000:
            raise ValueError("Text too long (max 2000 characters).")
        return v

class FilterOut(BaseModel):
    filteredText: str

# ----- /filter route -----
@app.post("/filter", response_model=FilterOut)
def filter_text(payload: FilterIn, request: Request):
    # Rate limit per IP
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()
    try:
        check_rate_limit(ip)
    except HTTPException:
        # still return CORS headers; FastAPI does via middleware
        raise

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")

    # Timeout on client to avoid hanging requests
    client = OpenAI(api_key=api_key, timeout=20.0)

    system_msg = (
        "You rewrite text to reduce hostility and inflammatory language while "
        "preserving the core point. Keep it concise and neutral; avoid insults."
    )
    user_msg = f"Rewrite this to be calm, non-toxic, and constructive:\n\n{payload.originalText}"

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",  # change if your account uses a different model
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.4,
            max_tokens=180,
        )
        out = (resp.choices[0].message.content or "").strip()
        if not out:
            # very rare; provide a minimal fallback to keep UX intact
            out = "I want to express my view more constructively and calmly."
        return {"filteredText": out}
    except HTTPException:
        raise
    except Exception as e:
        # Surface a friendly message while logging the raw exception to the console
        print("[OpenAI error]", repr(e))
        raise HTTPException(status_code=502, detail="Upstream model failed. Please try again in a moment.")
