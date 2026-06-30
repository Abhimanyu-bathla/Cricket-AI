"""
Players Router
GET    /api/players
POST   /api/players
PUT    /api/players/{id}
POST   /api/players/import-csv  (Admin only)
"""

import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from db.database import get_db
from models import schemas, orm_models

router = APIRouter()


@router.get("/", response_model=List[schemas.PlayerOut])
def list_players(db: Session = Depends(get_db)):
    return db.query(orm_models.Player).filter(orm_models.Player.is_active == True).all()


@router.get("/{player_id}", response_model=schemas.PlayerOut)
def get_player(player_id: int, db: Session = Depends(get_db)):
    p = db.query(orm_models.Player).filter(orm_models.Player.id == player_id).first()
    if not p:
        raise HTTPException(404, "Player not found")
    return p


@router.post("/", response_model=schemas.PlayerOut, status_code=201)
def create_player(player: schemas.PlayerCreate, db: Session = Depends(get_db)):
    db_player = orm_models.Player(**player.dict())
    db.add(db_player)
    db.commit()
    db.refresh(db_player)
    return db_player


@router.put("/{player_id}", response_model=schemas.PlayerOut)
def update_player(player_id: int, update: schemas.PlayerUpdate, db: Session = Depends(get_db)):
    p = db.query(orm_models.Player).filter(orm_models.Player.id == player_id).first()
    if not p:
        raise HTTPException(404, "Player not found")
    for k, v in update.dict(exclude_none=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.post("/import-csv")
async def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    CSV columns: name, team, type, economy, wickets, average, strike_rate, form_index
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "File must be a CSV")

    content = await file.read()
    reader  = csv.DictReader(io.StringIO(content.decode("utf-8")))

    created = 0
    errors  = []

    for row in reader:
        try:
            p = orm_models.Player(
                name        = row["name"].strip(),
                team        = row.get("team", "").strip(),
                type        = row["type"].strip().upper(),
                economy     = float(row.get("economy", 7.0)),
                wickets     = int(row.get("wickets", 0)),
                average     = float(row.get("average", 30)),
                strike_rate = float(row.get("strike_rate", 20)),
                form_index  = float(row.get("form_index", 0.5)),
                initials    = "".join(w[0] for w in row["name"].split()[:2]).upper(),
            )
            db.add(p)
            created += 1
        except Exception as e:
            errors.append({"row": row.get("name"), "error": str(e)})

    db.commit()
    return {"imported": created, "errors": errors}
