"""
Train MatchState AI models from Cricsheet-style IPL JSON data.

Outputs one artifact consumed by engine.prediction:
  backend/engine/artifacts/matchstate_models.joblib
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import joblib
import numpy as np
from sklearn.ensemble import ExtraTreesRegressor, RandomForestClassifier
from sklearn.metrics import accuracy_score, mean_absolute_error, roc_auc_score
from sklearn.model_selection import train_test_split


BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DATA_DIR = BASE_DIR / "database" / "ipl_json"
DEFAULT_OUTPUT = Path(__file__).resolve().parent / "artifacts" / "matchstate_models.joblib"

BOWLER_FEATURES = [
    "over",
    "runs",
    "wickets",
    "innings",
    "target",
    "required_rate",
    "current_rate",
    "wickets_in_hand",
    "is_death",
    "is_powerplay",
    "player_economy",
    "player_average",
    "player_strike_rate",
    "player_form_index",
    "type_fast",
    "type_spin",
    "type_medium",
    "humidity",
    "dew_factor",
    "wind_speed",
    "stadium_spin_friendly",
    "stadium_bounce",
    "stadium_dew",
]

WIN_FEATURES = [
    "over",
    "runs",
    "wickets",
    "innings",
    "target",
    "runs_left",
    "balls_left",
    "required_rate",
    "current_rate",
    "wickets_in_hand",
]

SPIN_HINTS = ("ashwin", "chahal", "kuldeep", "rashid", "narine", "chawla", "bishnoi", "brar", "varun", "shahbaz", "jadeja")
MEDIUM_HINTS = ("curran", "hardik", "green", "marsh", "stoinis", "dube", "shankar", "russell")


def _iter_matches(data_dir: Path) -> Iterable[Dict]:
    for path in sorted(data_dir.glob("*.json")):
        with path.open() as f:
            yield json.load(f)


def _is_legal_delivery(delivery: Dict) -> bool:
    extras = delivery.get("extras", {})
    return "wides" not in extras


def _wicket_count(deliveries: List[Dict]) -> int:
    count = 0
    for delivery in deliveries:
        for wicket in delivery.get("wickets", []):
            if wicket.get("kind") not in {"retired hurt", "retired out", "obstructing the field"}:
                count += 1
    return count


def _guess_bowler_type(name: str) -> str:
    lower = name.lower()
    if any(hint in lower for hint in SPIN_HINTS):
        return "SPIN"
    if any(hint in lower for hint in MEDIUM_HINTS):
        return "MEDIUM"
    return "FAST"


def _bowler_type_features(bowler_type: str) -> Tuple[int, int, int]:
    normalized = (bowler_type or "FAST").upper()
    return (
        int(normalized == "FAST"),
        int(normalized == "SPIN"),
        int(normalized == "MEDIUM"),
    )


def _safe_rate(runs: float, overs: float) -> float:
    return runs / max(overs, 0.1)


def _over_quality(over_number: float, total_overs: int, over_runs: int, wickets: int, dots: int) -> float:
    if over_number < min(6, total_overs * 0.3):
        par_runs = 8.2
    elif over_number >= max(0, total_overs - 5):
        par_runs = 10.0
    else:
        par_runs = 7.4

    run_control = (par_runs - over_runs) * 0.045
    wicket_impact = wickets * 0.24
    dot_impact = dots * 0.055
    boundary_penalty = max(0, over_runs - par_runs - 4) * 0.025
    score = 0.50 + run_control + wicket_impact + dot_impact - boundary_penalty
    return max(0.02, min(0.98, score))


def _state_features(over: float, runs: int, wickets: int, innings: int, target: int | None, total_overs: int) -> Dict[str, float]:
    balls_left = max(0, int((total_overs - over) * 6))
    runs_left = max(0, (target or 0) - runs)
    return {
        "over": float(over),
        "runs": float(runs),
        "wickets": float(wickets),
        "innings": float(innings),
        "target": float(target or 0),
        "required_rate": float(runs_left / max(balls_left / 6, 0.1)) if target else 0.0,
        "current_rate": float(_safe_rate(runs, over)),
        "wickets_in_hand": float(max(0, 10 - wickets)),
        "is_death": float(over >= max(0, total_overs - 5)),
        "is_powerplay": float(over < min(6, total_overs * 0.3)),
    }


def _build_bowler_training_rows(matches: Iterable[Dict]) -> Tuple[np.ndarray, np.ndarray]:
    raw_rows = []
    bowler_stats = defaultdict(lambda: {"runs": 0, "balls": 0, "wickets": 0, "overs": 0})

    for match in matches:
        info = match.get("info", {})
        total_overs = int(info.get("overs") or 20)
        innings_list = match.get("innings", [])

        first_innings_total = None
        for innings_index, innings in enumerate(innings_list, start=1):
            innings_runs = 0
            innings_wickets = 0
            target = first_innings_total + 1 if innings_index == 2 and first_innings_total is not None else None

            for over_block in innings.get("overs", []):
                over_number = float(over_block.get("over", 0))
                deliveries = over_block.get("deliveries", [])
                if not deliveries:
                    continue

                bowler = deliveries[0].get("bowler", "")
                over_runs = sum(d.get("runs", {}).get("total", 0) for d in deliveries)
                legal_balls = sum(1 for d in deliveries if _is_legal_delivery(d))
                dots = sum(1 for d in deliveries if d.get("runs", {}).get("total", 0) == 0 and _is_legal_delivery(d))
                wickets = _wicket_count(deliveries)

                raw_rows.append(
                    {
                        "bowler": bowler,
                        "bowler_type": _guess_bowler_type(bowler),
                        "state": _state_features(over_number, innings_runs, innings_wickets, innings_index, target, total_overs),
                        "target_score": _over_quality(over_number, total_overs, over_runs, wickets, dots),
                    }
                )

                bowler_stats[bowler]["runs"] += over_runs
                bowler_stats[bowler]["balls"] += legal_balls
                bowler_stats[bowler]["wickets"] += wickets
                bowler_stats[bowler]["overs"] += 1
                innings_runs += over_runs
                innings_wickets += wickets

            if innings_index == 1:
                first_innings_total = innings_runs

    rows = []
    labels = []
    for row in raw_rows:
        stats = bowler_stats[row["bowler"]]
        overs = max(stats["balls"] / 6, 0.1)
        wickets = max(stats["wickets"], 1)
        bowler_type = _bowler_type_features(row["bowler_type"])
        feature_map = {
            **row["state"],
            "player_economy": stats["runs"] / overs,
            "player_average": stats["runs"] / wickets,
            "player_strike_rate": stats["balls"] / wickets,
            "player_form_index": min(1.0, max(0.0, 1.0 - ((stats["runs"] / overs) - 5.5) / 7.0)),
            "type_fast": bowler_type[0],
            "type_spin": bowler_type[1],
            "type_medium": bowler_type[2],
            "humidity": 60.0,
            "dew_factor": 0.5,
            "wind_speed": 8.0,
            "stadium_spin_friendly": 0.0,
            "stadium_bounce": 0.5,
            "stadium_dew": 0.5,
        }
        rows.append([feature_map[name] for name in BOWLER_FEATURES])
        labels.append(row["target_score"])

    return np.array(rows, dtype=float), np.array(labels, dtype=float)


def _build_win_training_rows(matches: Iterable[Dict]) -> Tuple[np.ndarray, np.ndarray]:
    rows = []
    labels = []

    for match in matches:
        info = match.get("info", {})
        winner = info.get("outcome", {}).get("winner")
        total_overs = int(info.get("overs") or 20)
        innings_list = match.get("innings", [])
        if len(innings_list) < 2 or not winner:
            continue

        first_total = sum(
            d.get("runs", {}).get("total", 0)
            for over_block in innings_list[0].get("overs", [])
            for d in over_block.get("deliveries", [])
        )

        for innings_index, innings in enumerate(innings_list[:2], start=1):
            batting_team = innings.get("team")
            batting_team_won = int(batting_team == winner)
            target = first_total + 1 if innings_index == 2 else 0
            runs = 0
            wickets = 0

            for over_block in innings.get("overs", []):
                over = float(over_block.get("over", 0))
                balls_left = max(0, int((total_overs - over) * 6))
                runs_left = max(0, target - runs)
                feature_map = {
                    "over": over,
                    "runs": float(runs),
                    "wickets": float(wickets),
                    "innings": float(innings_index),
                    "target": float(target),
                    "runs_left": float(runs_left),
                    "balls_left": float(balls_left),
                    "required_rate": float(runs_left / max(balls_left / 6, 0.1)) if target else 0.0,
                    "current_rate": float(_safe_rate(runs, over)),
                    "wickets_in_hand": float(max(0, 10 - wickets)),
                }
                rows.append([feature_map[name] for name in WIN_FEATURES])
                labels.append(batting_team_won)

                deliveries = over_block.get("deliveries", [])
                runs += sum(d.get("runs", {}).get("total", 0) for d in deliveries)
                wickets += _wicket_count(deliveries)

    return np.array(rows, dtype=float), np.array(labels, dtype=int)


def train(data_dir: Path = DEFAULT_DATA_DIR, output_path: Path = DEFAULT_OUTPUT) -> Dict:
    matches_for_bowling = list(_iter_matches(data_dir))
    matches_for_win = list(_iter_matches(data_dir))
    if not matches_for_bowling:
        raise RuntimeError(f"No JSON matches found in {data_dir}")

    bowler_x, bowler_y = _build_bowler_training_rows(matches_for_bowling)
    win_x, win_y = _build_win_training_rows(matches_for_win)
    if len(bowler_x) == 0 or len(win_x) == 0:
        raise RuntimeError("Could not build enough training rows from the dataset")

    bx_train, bx_test, by_train, by_test = train_test_split(bowler_x, bowler_y, test_size=0.2, random_state=42)
    wx_train, wx_test, wy_train, wy_test = train_test_split(win_x, win_y, test_size=0.2, random_state=42, stratify=win_y)

    bowler_model = ExtraTreesRegressor(n_estimators=260, min_samples_leaf=2, random_state=42, n_jobs=-1)
    win_model = RandomForestClassifier(n_estimators=220, min_samples_leaf=6, random_state=42, n_jobs=-1)
    bowler_model.fit(bx_train, by_train)
    win_model.fit(wx_train, wy_train)

    win_prob = win_model.predict_proba(wx_test)[:, 1]
    metrics = {
        "bowler_rows": int(len(bowler_x)),
        "win_rows": int(len(win_x)),
        "bowler_mae": float(mean_absolute_error(by_test, bowler_model.predict(bx_test))),
        "win_accuracy": float(accuracy_score(wy_test, win_model.predict(wx_test))),
        "win_auc": float(roc_auc_score(wy_test, win_prob)),
    }

    artifact = {
        "bowler_model": bowler_model,
        "win_model": win_model,
        "bowler_features": BOWLER_FEATURES,
        "win_features": WIN_FEATURES,
        "metrics": metrics,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, output_path, compress=3)
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    metrics = train(args.data_dir, args.output)
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
