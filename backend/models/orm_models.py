"""
ORM Models — maps to MySQL tables defined in schema.sql
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.database import Base


class Player(Base):
    __tablename__ = "players"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(100), nullable=False)
    team        = Column(String(50))
    type        = Column(String(20))           # FAST | SPIN | MEDIUM | BAT
    economy     = Column(Float, default=7.0)
    wickets     = Column(Integer, default=0)
    average     = Column(Float, default=30.0)
    strike_rate = Column(Float, default=20.0)
    form_index  = Column(Float, default=0.5)   # 0–1 computed score
    recent_forms = Column(JSON)                # ["W","G","A","W","G"]
    initials    = Column(String(4))
    color_hex   = Column(String(10))
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())


class Stadium(Base):
    __tablename__ = "stadiums"

    id            = Column(Integer, primary_key=True)
    name          = Column(String(100))
    city          = Column(String(60))
    pitch_type    = Column(String(30))    # flat | spin | batting | pace
    dew_factor    = Column(Float)         # 0–1
    bounce_rating = Column(Float)         # 0–1
    spin_friendly = Column(Boolean)
    boundary_m    = Column(Integer)       # metres


class Match(Base):
    __tablename__ = "matches"

    id         = Column(Integer, primary_key=True, index=True)
    team1      = Column(String(50))
    team2      = Column(String(50))
    venue_id   = Column(Integer, ForeignKey("stadiums.id"))
    match_type = Column(String(20), default="ODI")   # ODI | T20 | TEST
    date       = Column(DateTime(timezone=True), server_default=func.now())
    status     = Column(String(20), default="LIVE")  # LIVE | COMPLETED | UPCOMING

    venue  = relationship("Stadium")
    states = relationship("MatchState", back_populates="match")


class MatchState(Base):
    """
    Snapshot of the match at a given moment.
    Multiple rows per match — one per over/update.
    """
    __tablename__ = "match_states"

    id           = Column(Integer, primary_key=True, index=True)
    match_id     = Column(Integer, ForeignKey("matches.id"))
    innings      = Column(Integer, default=1)
    over         = Column(Float, default=0.0)
    runs         = Column(Integer, default=0)
    wickets      = Column(Integer, default=0)
    target       = Column(Integer, nullable=True)
    batter1      = Column(String(80))
    batter2      = Column(String(80))
    batter1_type = Column(String(20), default="ANCHOR")
    recorded_at  = Column(DateTime(timezone=True), server_default=func.now())

    match        = relationship("Match", back_populates="states")


class Weather(Base):
    __tablename__ = "weather"

    id          = Column(Integer, primary_key=True)
    match_id    = Column(Integer, ForeignKey("matches.id"))
    temperature = Column(Float)
    humidity    = Column(Float)
    wind_speed  = Column(Float)
    dew_factor  = Column(Float)
    condition   = Column(String(50))
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())


class Recommendation(Base):
    """Logs every recommendation the engine produces."""
    __tablename__ = "recommendations"

    id             = Column(Integer, primary_key=True)
    match_id       = Column(Integer, ForeignKey("matches.id"))
    state_id       = Column(Integer, ForeignKey("match_states.id"))
    over           = Column(Float)
    ranked_bowlers = Column(JSON)     # [{id, name, total_score, reasons}, ...]
    win_probability = Column(Float)
    generated_by   = Column(String(50))   # role / user
    response_ms    = Column(Integer)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
