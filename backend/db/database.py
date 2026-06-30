"""
Database Layer — MySQL via SQLAlchemy
Swap connection string to switch databases.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# ── Connection string ──────────────────────────────────────────────────────────
# Production:  mysql+pymysql://user:password@host:3306/matchstate_db
# Development: sqlite:///./matchstate_dev.db  (no MySQL needed locally)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./matchstate_dev.db"   # fallback for local dev
)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Dependency — yields a DB session, closes after request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
