"""
Cached analytics helpers built from the Cricsheet IPL JSON dataset.
"""

from __future__ import annotations

import json
from collections import defaultdict
from functools import lru_cache
from pathlib import Path
from typing import Dict, Iterable, List, Optional


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "database" / "ipl_json"

SPIN_HINTS = (
    "ashwin", "chahal", "kuldeep", "rashid", "narine", "chawla", "bishnoi",
    "brar", "varun", "shahbaz", "jadeja", "theekshana", "noor", "markande",
    "maxwell", "axar", "krunal", "piyush", "kumble", "harbhajan", "muralitharan",
    "mishra", "ojha", "kartik", "jakati", "hogg", "tahir", "gopal", "sundar",
    "santner", "zampa", "badree", "shakib", "nadim", "m ashwin", "rahul sharma",
    "karn sharma", "bhajji", "murugan", "suyash", "markram", "livingstone",
    "tewatia", "r parashar", "jagadeesha suchith", "suchith",
)

MEDIUM_HINTS = (
    "curran", "hardik", "green", "marsh", "stoinis", "dube", "shankar",
    "russell", "bhuvneshwar", "chahar", "mukesh", "mohit", "yash dayal",
)

NAME_ALIASES = {
    "virat kohli": "v kohli",
    "jasprit bumrah": "jj bumrah",
    "rohit sharma": "rg sharma",
    "suryakumar yadav": "sa yadav",
    "ravindra jadeja": "ra jadeja",
    "matheesha pathirana": "m pathirana",
    "deepak chahar": "dl chahar",
    "maheesh theekshana": "m theekshana",
    "piyush chawla": "pp chawla",
    "gerald coetzee": "g coetzee",
    "hardik pandya": "hh pandya",
    "mohammed siraj": "mohammed siraj",
    "yash dayal": "yash dayal",
    "karn sharma": "kv sharma",
    "glenn maxwell": "glen maxwell",
    "sunil narine": "sp narine",
    "varun chakaravarthy": "cv varun",
    "mitchell starc": "ma starc",
    "andre russell": "ad russell",
    "pat cummins": "pj cummins",
    "bhuvneshwar kumar": "b kumar",
    "t natarajan": "t natarajan",
    "mayank markande": "m markande",
    "trent boult": "ta boult",
    "yuzvendra chahal": "ys chahal",
    "ravichandran ashwin": "r ashwin",
    "avesh khan": "avesh khan",
    "kuldeep yadav": "kuldeep yadav",
    "axar patel": "ar patel",
    "khaleel ahmed": "kk ahmed",
    "mukesh kumar": "mukesh kumar",
    "arshdeep singh": "arshdeep singh",
    "kagiso rabada": "k rabada",
    "harpreet brar": "harpreet brar",
    "sam curran": "sm curran",
    "mohammed shami": "mohammed shami",
    "rashid khan": "rashid khan",
    "mohit sharma": "mm sharma",
    "noor ahmad": "noor ahmad",
    "ravi bishnoi": "ravi bishnoi",
    "naveen-ul-haq": "naveen-ul-haq",
    "mohsin khan": "mohsin khan",
    "krunal pandya": "krunal pandya",
}


def _iter_matches(data_dir: Path = DATA_DIR) -> Iterable[Dict]:
    for path in sorted(data_dir.glob("*.json")):
        with path.open() as f:
            yield json.load(f)


def _normalize_name(name: str) -> str:
    cleaned = " ".join((name or "").lower().replace(".", " ").split())
    return NAME_ALIASES.get(cleaned, cleaned)


def _normalize_venue(venue: str) -> str:
    cleaned = " ".join((venue or "").lower().split())
    replacements = {
        "m chinnaswamy": "m chinnaswamy stadium",
        "ma chidambaram": "ma chidambaram stadium, chepauk",
        "wankhede": "wankhede stadium",
        "eden gardens": "eden gardens",
        "narendra modi stadium": "narendra modi stadium, ahmedabad",
    }
    return replacements.get(cleaned, cleaned)


def _is_legal_delivery(delivery: Dict) -> bool:
    return "wides" not in delivery.get("extras", {})


def _wicket_count(deliveries: List[Dict]) -> int:
    count = 0
    for delivery in deliveries:
        for wicket in delivery.get("wickets", []):
            if wicket.get("kind") not in {"retired hurt", "retired out", "obstructing the field"}:
                count += 1
    return count


def _dismissed_by_bowler(delivery: Dict, batter: str) -> bool:
    for wicket in delivery.get("wickets", []):
        if _normalize_name(wicket.get("player_out", "")) != batter:
            continue
        if wicket.get("kind") not in {"run out", "retired hurt", "retired out", "obstructing the field"}:
            return True
    return False


def _bowler_type(name: str) -> str:
    lower = _normalize_name(name)
    if any(hint in lower for hint in SPIN_HINTS):
        return "SPIN"
    if any(hint in lower for hint in MEDIUM_HINTS):
        return "MEDIUM"
    return "FAST"


@lru_cache(maxsize=1)
def matchup_index() -> Dict[tuple[str, str], Dict[str, int]]:
    index: Dict[tuple[str, str], Dict[str, int]] = defaultdict(lambda: {"runs": 0, "balls": 0, "dismissals": 0})

    for match in _iter_matches():
        for innings in match.get("innings", []):
            for over_block in innings.get("overs", []):
                for delivery in over_block.get("deliveries", []):
                    batter = _normalize_name(delivery.get("batter", ""))
                    bowler = _normalize_name(delivery.get("bowler", ""))
                    if not batter or not bowler:
                        continue

                    key = (batter, bowler)
                    index[key]["runs"] += int(delivery.get("runs", {}).get("batter", 0))
                    if _is_legal_delivery(delivery):
                        index[key]["balls"] += 1
                    if _dismissed_by_bowler(delivery, batter):
                        index[key]["dismissals"] += 1

    return dict(index)


def get_matchup(batter: str, bowler: str) -> Dict[str, float]:
    stats = matchup_index().get((_normalize_name(batter), _normalize_name(bowler)), {"runs": 0, "balls": 0, "dismissals": 0})
    balls = stats["balls"]
    return {
        "runs": stats["runs"],
        "balls": balls,
        "strike_rate": round((stats["runs"] / balls) * 100, 2) if balls else 0,
        "dismissals": stats["dismissals"],
    }


@lru_cache(maxsize=1)
def venue_index() -> Dict[str, Dict[str, float]]:
    venues = defaultdict(lambda: {
        "venue": "",
        "first_scores": [],
        "second_scores": [],
        "matches_played": 0,
        "chasing_wins": 0,
        "pace_wickets": 0,
        "spin_wickets": 0,
        "highest_successful_chase": 0,
    })

    for match in _iter_matches():
        info = match.get("info", {})
        venue_name = info.get("venue", "Unknown Venue")
        key = _normalize_venue(venue_name)
        venue = venues[key]
        venue["venue"] = venue_name
        venue["matches_played"] += 1

        innings_totals = []
        innings_teams = []
        for innings in match.get("innings", [])[:2]:
            total = 0
            wickets = 0
            for over_block in innings.get("overs", []):
                deliveries = over_block.get("deliveries", [])
                total += sum(int(d.get("runs", {}).get("total", 0)) for d in deliveries)
                wickets += _wicket_count(deliveries)
                for delivery in deliveries:
                    bowler_kind = _bowler_type(delivery.get("bowler", ""))
                    wicket_total = _wicket_count([delivery])
                    if bowler_kind == "SPIN":
                        venue["spin_wickets"] += wicket_total
                    else:
                        venue["pace_wickets"] += wicket_total
            innings_totals.append(total)
            innings_teams.append(innings.get("team"))

        if innings_totals:
            venue["first_scores"].append(innings_totals[0])
        if len(innings_totals) > 1:
            venue["second_scores"].append(innings_totals[1])

        winner = info.get("outcome", {}).get("winner")
        if len(innings_teams) > 1 and winner == innings_teams[1]:
            venue["chasing_wins"] += 1
            venue["highest_successful_chase"] = max(venue["highest_successful_chase"], innings_totals[1])

    results = {}
    for key, raw in venues.items():
        wicket_total = raw["pace_wickets"] + raw["spin_wickets"]
        matches = raw["matches_played"] or 1
        results[key] = {
            "venue": raw["venue"],
            "avg_first_innings": round(sum(raw["first_scores"]) / len(raw["first_scores"]), 1) if raw["first_scores"] else 0,
            "avg_second_innings": round(sum(raw["second_scores"]) / len(raw["second_scores"]), 1) if raw["second_scores"] else 0,
            "chasing_win_pct": round((raw["chasing_wins"] / matches) * 100, 1),
            "pace_wickets_pct": round((raw["pace_wickets"] / wicket_total) * 100, 1) if wicket_total else 0,
            "spin_wickets_pct": round((raw["spin_wickets"] / wicket_total) * 100, 1) if wicket_total else 0,
            "highest_successful_chase": int(raw["highest_successful_chase"]),
            "matches_played": int(raw["matches_played"]),
        }
    return results


def get_venue_analytics(venue: str) -> Optional[Dict[str, float]]:
    return venue_index().get(_normalize_venue(venue))


def list_analytics_venues() -> List[str]:
    return sorted(v["venue"] for v in venue_index().values())
