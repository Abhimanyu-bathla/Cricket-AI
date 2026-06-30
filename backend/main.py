"""
MatchState AI — FastAPI Backend
Run: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Optional
import time
import csv
import io

from db.database import get_db, engine
from models import schemas, orm_models
from engine.prediction import PredictionEngine
from routes import matches, players, recommendations, auth, analytics

# Create all tables
orm_models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MatchState AI API",
    description="Real-time cricket decision support system",
    version="1.0.0"
)

# CORS — allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router,            prefix="/api/auth",            tags=["Auth"])
app.include_router(matches.router,         prefix="/api/matches",         tags=["Matches"])
app.include_router(players.router,         prefix="/api/players",         tags=["Players"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])
app.include_router(analytics.router,       prefix="/api",                 tags=["Analytics"])


@app.get("/")
def root():
    return {"status": "ok", "service": "MatchState AI", "version": "1.0.0"}


@app.get("/api/health")
def health():
    return {"status": "healthy", "timestamp": time.time()}
