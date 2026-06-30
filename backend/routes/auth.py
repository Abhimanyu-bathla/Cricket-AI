"""
Auth Router — simple role-based JWT (mock for prototype)
POST /api/auth/login → returns token + role
"""

from fastapi import APIRouter, HTTPException
from models.schemas import Token, LoginRequest
import time, hashlib

router = APIRouter()

# Mock user store — replace with DB in production
USERS = {
    "captain1":  {"password": "captain123", "role": "captain"},
    "analyst1":  {"password": "analyst123", "role": "analyst"},
    "admin1":    {"password": "admin123",   "role": "admin"},
}


def _make_token(username: str, role: str) -> str:
    """Simple deterministic token (use JWT in production)."""
    payload = f"{username}:{role}:{int(time.time())}"
    return hashlib.sha256(payload.encode()).hexdigest()[:32]


@router.post("/login", response_model=Token)
def login(req: LoginRequest):
    user = USERS.get(req.username)
    if not user or user["password"] != req.password:
        raise HTTPException(401, "Invalid credentials")
    if user["role"] != req.role:
        raise HTTPException(403, f"User is not a {req.role}")

    token = _make_token(req.username, req.role)
    return Token(access_token=token, token_type="bearer", role=user["role"])
