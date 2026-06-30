"""
Recommendations Router
POST /api/recommendations/generate  → run prediction engine
GET  /api/recommendations/{match_id} → history
"""

import time
from datetime import datetime
from types import SimpleNamespace
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from db.database import get_db
from models import schemas, orm_models
from engine.prediction import engine_instance as engine

router = APIRouter()


def _ns(data: dict, **defaults):
    merged = {**defaults, **(data or {})}
    return SimpleNamespace(**merged)


@router.post("/generate", response_model=schemas.RecommendationOut)
def generate_recommendation(req: schemas.RecommendationRequest, db: Session = Depends(get_db)):
    t_start = time.time()

    # 1. Load match + latest state
    match = db.query(orm_models.Match).filter(orm_models.Match.id == req.match_id).first()
    if not match:
        raise HTTPException(404, detail="Match not found")

    state = db.query(orm_models.MatchState).filter(
        orm_models.MatchState.id == req.state_id
    ).first()
    if not state:
        raise HTTPException(404, detail="Match state not found")

    # 2. Load weather (latest for this match)
    weather_rec = db.query(orm_models.Weather).filter(
        orm_models.Weather.match_id == req.match_id
    ).order_by(orm_models.Weather.recorded_at.desc()).first()

    # 3. Load all active players
    players = db.query(orm_models.Player).filter(orm_models.Player.is_active == True).all()

    # 4. Build state dict for engine
    state_dict = {
        "runs":        state.runs,
        "wickets":     state.wickets,
        "over":        state.over,
        "target":      state.target,
        "innings":     state.innings,
        "match_type":   match.match_type,
        "batter1_type": state.batter1_type,
    }

    weather_dict = None
    if weather_rec:
        weather_dict = {
            "humidity":   weather_rec.humidity,
            "dew_factor": weather_rec.dew_factor,
            "wind_speed": weather_rec.wind_speed,
        }

    # 5. Run engine
    ranked = engine.rank_bowlers(players, state_dict, weather_dict, match.venue)
    win    = engine.calculate_win_probability(state_dict)

    elapsed_ms = int((time.time() - t_start) * 1000)

    # 6. Persist recommendation log
    rec_log = orm_models.Recommendation(
        match_id        = req.match_id,
        state_id        = req.state_id,
        over            = state.over,
        ranked_bowlers  = ranked,
        win_probability = win["prob"],
        generated_by    = req.role,
        response_ms     = elapsed_ms,
    )
    db.add(rec_log)
    db.commit()
    db.refresh(rec_log)

    return schemas.RecommendationOut(
        recommendation_id = rec_log.id,
        over              = state.over,
        ranked_bowlers    = [schemas.BowlerScore(**b) for b in ranked],
        win_probability   = win["prob"],
        win_details       = win,
        response_ms       = elapsed_ms,
        generated_at      = rec_log.created_at,
    )


@router.post("/predict-direct")
def predict_direct(payload: dict = Body(...)):
    """
    Model-backed prediction endpoint for the live frontend dashboard.
    It accepts the current UI state directly and does not use formula scoring.
    """
    t_start = time.time()

    state = payload.get("match_state") or {}
    weather = payload.get("weather") or None
    stadium_data = payload.get("stadium") or {}
    players_data = payload.get("players") or []

    players = [
        _ns(
            p,
            id=i + 1,
            name=p.get("name", f"Player {i + 1}"),
            type=p.get("type", "FAST"),
            economy=p.get("economy", 7.0),
            average=p.get("average", 30.0),
            strike_rate=p.get("strikeRate", p.get("strike_rate", 20.0)),
            form_index=p.get("formIndex", p.get("form_index", 0.5)),
            recent_forms=p.get("recentForms", p.get("recent_forms", [])),
            color_hex=p.get("color", p.get("color_hex", "#00d4aa")),
            initials=p.get("initials"),
        )
        for i, p in enumerate(players_data)
    ]

    state_dict = {
        "runs": state.get("runs", 0),
        "wickets": state.get("wickets", 0),
        "over": state.get("over", 0),
        "target": state.get("target"),
        "innings": state.get("innings", 2 if state.get("target") else 1),
        "match_type": state.get("matchType", state.get("match_type", "T20")),
        "batter1_type": state.get("batter1Type", state.get("batter1_type", "ANCHOR")),
    }
    weather_dict = {
        "humidity": weather.get("humidity", 60),
        "dew_factor": weather.get("dewFactor", weather.get("dew_factor", 0.5)),
        "wind_speed": weather.get("windSpeed", weather.get("wind_speed", 8)),
    } if weather else None
    stadium = _ns(
        stadium_data,
        name=stadium_data.get("name", "Selected venue"),
        spin_friendly=stadium_data.get("spinFriendly", stadium_data.get("spin_friendly", False)),
        bounce_rating=stadium_data.get("bounceRating", stadium_data.get("bounce_rating", 0.5)),
        dew_factor=stadium_data.get("dewFactor", stadium_data.get("dew_factor", 0.5)),
    )

    ranked = engine.rank_bowlers(players, state_dict, weather_dict, stadium)
    win = engine.calculate_win_probability(state_dict)

    return {
        "ranked_bowlers": ranked,
        "win_probability": win["prob"],
        "win_details": win,
        "response_ms": int((time.time() - t_start) * 1000),
        "model_metrics": engine.artifact.get("metrics", {}),
    }


@router.get("/{match_id}")
def get_history(match_id: int, limit: int = 10, db: Session = Depends(get_db)):
    recs = (
        db.query(orm_models.Recommendation)
        .filter(orm_models.Recommendation.match_id == match_id)
        .order_by(orm_models.Recommendation.created_at.desc())
        .limit(limit)
        .all()
    )
    return recs
