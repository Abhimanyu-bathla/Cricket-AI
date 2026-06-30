"""
Matches Router
POST /api/matches                   → create match
GET  /api/matches/{id}              → get match
POST /api/matches/{id}/state        → record match state
POST /api/matches/{id}/weather      → record weather
GET  /api/matches/{id}/state/latest → latest state
GET  /api/matches/stadiums          → list stadiums
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from db.database import get_db
from models import schemas, orm_models

router = APIRouter()


@router.get("/stadiums")
def list_stadiums(db: Session = Depends(get_db)):
    return db.query(orm_models.Stadium).all()


@router.post("/", response_model=schemas.MatchOut, status_code=201)
def create_match(match: schemas.MatchCreate, db: Session = Depends(get_db)):
    venue = db.query(orm_models.Stadium).filter(orm_models.Stadium.id == match.venue_id).first()
    if not venue:
        raise HTTPException(404, "Stadium not found")
    m = orm_models.Match(**match.dict())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.get("/{match_id}", response_model=schemas.MatchOut)
def get_match(match_id: int, db: Session = Depends(get_db)):
    m = db.query(orm_models.Match).filter(orm_models.Match.id == match_id).first()
    if not m:
        raise HTTPException(404, "Match not found")
    return m


@router.post("/{match_id}/state", response_model=schemas.MatchStateOut, status_code=201)
def record_state(match_id: int, state: schemas.MatchStateCreate, db: Session = Depends(get_db)):
    if state.match_id != match_id:
        raise HTTPException(400, "match_id mismatch")
    ms = orm_models.MatchState(**state.dict())
    db.add(ms)
    db.commit()
    db.refresh(ms)
    return ms


@router.get("/{match_id}/state/latest", response_model=schemas.MatchStateOut)
def latest_state(match_id: int, db: Session = Depends(get_db)):
    ms = (
        db.query(orm_models.MatchState)
        .filter(orm_models.MatchState.match_id == match_id)
        .order_by(orm_models.MatchState.recorded_at.desc())
        .first()
    )
    if not ms:
        raise HTTPException(404, "No state recorded yet")
    return ms


@router.post("/{match_id}/weather", status_code=201)
def record_weather(match_id: int, w: schemas.WeatherIn, db: Session = Depends(get_db)):
    weather = orm_models.Weather(**w.dict())
    db.add(weather)
    db.commit()
    return {"status": "recorded"}
