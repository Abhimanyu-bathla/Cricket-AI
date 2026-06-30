"""
Pydantic Schemas — request validation + response serialization
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


# ── Player ──────────────────────────────────────────────────────────────────
class PlayerBase(BaseModel):
    name:        str
    team:        Optional[str] = None
    type:        str           # FAST | SPIN | MEDIUM
    economy:     float = 7.0
    wickets:     int   = 0
    average:     float = 30.0
    strike_rate: float = 20.0
    form_index:  float = Field(0.5, ge=0, le=1)
    recent_forms: Optional[List[str]] = []

class PlayerCreate(PlayerBase):
    pass

class PlayerUpdate(BaseModel):
    economy:     Optional[float] = None
    form_index:  Optional[float] = None
    recent_forms: Optional[List[str]] = None

class PlayerOut(PlayerBase):
    id:         int
    color_hex:  Optional[str]
    initials:   Optional[str]
    class Config: from_attributes = True


# ── Stadium ──────────────────────────────────────────────────────────────────
class StadiumOut(BaseModel):
    id:            int
    name:          str
    city:          str
    pitch_type:    str
    dew_factor:    float
    bounce_rating: float
    spin_friendly: bool
    boundary_m:    int
    class Config: from_attributes = True


# ── Match ────────────────────────────────────────────────────────────────────
class MatchCreate(BaseModel):
    team1:      str
    team2:      str
    venue_id:   int
    match_type: str = "ODI"

class MatchOut(BaseModel):
    id:         int
    team1:      str
    team2:      str
    match_type: str
    status:     str
    date:       datetime
    class Config: from_attributes = True


# ── MatchState ───────────────────────────────────────────────────────────────
class MatchStateCreate(BaseModel):
    match_id:     int
    innings:      int = 1
    over:         float
    runs:         int
    wickets:      int
    target:       Optional[int] = None
    batter1:      str = ""
    batter2:      str = ""
    batter1_type: str = "ANCHOR"

class MatchStateOut(MatchStateCreate):
    id:          int
    recorded_at: datetime
    class Config: from_attributes = True


# ── Weather ──────────────────────────────────────────────────────────────────
class WeatherIn(BaseModel):
    match_id:    int
    temperature: float
    humidity:    float
    wind_speed:  float
    dew_factor:  float
    condition:   str = "Clear"


# ── Recommendation Request ───────────────────────────────────────────────────
class RecommendationRequest(BaseModel):
    match_id:   int
    state_id:   int
    role:       str = "analyst"  # captain | analyst | admin


# ── Bowler Score (in recommendation response) ────────────────────────────────
class BowlerScore(BaseModel):
    id:               int
    name:             str
    type:             str
    form_score:       float
    matchup_score:    float
    conditions_score: float
    total_score:      float
    reasons:          List[str]


# ── Recommendation Response ──────────────────────────────────────────────────
class RecommendationOut(BaseModel):
    recommendation_id: int
    over:              float
    ranked_bowlers:    List[BowlerScore]
    win_probability:   float
    win_details:       dict
    response_ms:       int
    generated_at:      datetime


# ── Auth ─────────────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type:   str
    role:         str

class LoginRequest(BaseModel):
    username: str
    password: str
    role:     str  # captain | analyst | admin
