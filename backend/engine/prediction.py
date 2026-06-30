"""
MatchState AI prediction engine backed by trained dataset models.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib


ARTIFACT_PATH = Path(__file__).resolve().parent / "artifacts" / "matchstate_models.joblib"


class PredictionEngine:
    def __init__(self, artifact_path: Path = ARTIFACT_PATH):
        self.artifact_path = artifact_path
        self.artifact = joblib.load(artifact_path)
        self.bowler_model = self.artifact["bowler_model"]
        self.win_model = self.artifact["win_model"]
        self.bowler_features = self.artifact["bowler_features"]
        self.win_features = self.artifact["win_features"]

    def rank_bowlers(
        self,
        players: List[Any],
        match_state: Dict,
        weather: Optional[Dict] = None,
        stadium: Optional[Any] = None,
    ) -> List[Dict]:
        bowlers = [p for p in players if p.type in ("FAST", "SPIN", "MEDIUM")]
        results = []

        for bowler in bowlers:
            feature_map = self._bowler_feature_map(bowler, match_state, weather, stadium)
            features = [[feature_map[name] for name in self.bowler_features]]
            total = float(self.bowler_model.predict(features)[0])
            total = max(0.0, min(1.0, total))

            matchup_score = self._component_from_features(total, feature_map["current_rate"], invert=True)
            conditions_score = self._conditions_component(total, bowler, weather, stadium)
            form_score = float(max(0.0, min(1.0, bowler.form_index or 0.5)))

            results.append(
                {
                    "id": bowler.id,
                    "name": bowler.name,
                    "type": bowler.type,
                    "economy": bowler.economy,
                    "average": bowler.average,
                    "form_index": round(form_score, 3),
                    "form_score": round(form_score, 3),
                    "matchup_score": round(matchup_score, 3),
                    "conditions_score": round(conditions_score, 3),
                    "total_score": round(total, 4),
                    "reasons": self._generate_reasons(bowler, total, matchup_score, conditions_score, match_state, weather, stadium),
                    "recent_forms": bowler.recent_forms or [],
                    "color_hex": bowler.color_hex or "#00d4aa",
                    "initials": bowler.initials or bowler.name[:2].upper(),
                }
            )

        return sorted(results, key=lambda x: x["total_score"], reverse=True)

    def calculate_win_probability(self, match_state: Dict) -> Dict:
        runs = int(match_state.get("runs", 0) or 0)
        wickets = int(match_state.get("wickets", 0) or 0)
        over = float(match_state.get("over", 0) or 0)
        target = match_state.get("target")
        total_overs = self._total_overs(match_state)
        innings = int(match_state.get("innings", 2 if target else 1) or 1)

        balls_left = max(0, int((total_overs - over) * 6))
        runs_left = max(0, int(target or 0) - runs)
        if target and runs_left <= 0:
            return {"prob": 99, "rrr": 0, "balls_left": balls_left, "runs_left": 0, "label": "Won"}
        if target and (balls_left == 0 or wickets >= 10):
            return {"prob": 1, "rrr": 99, "balls_left": 0, "runs_left": runs_left, "label": "Lost"}

        feature_map = self._win_feature_map(runs, wickets, over, innings, int(target or 0), total_overs)
        features = [[feature_map[name] for name in self.win_features]]
        prob = int(round(float(self.win_model.predict_proba(features)[0][1]) * 100))
        prob = max(1, min(99, prob))
        rrr = round(feature_map["required_rate"], 2) if target else None

        label = "Strong position" if prob >= 65 else "Evenly matched" if prob >= 40 else "Under pressure"
        return {"prob": prob, "rrr": rrr, "balls_left": balls_left, "runs_left": runs_left if target else None, "label": label}

    def _bowler_feature_map(self, bowler, state: Dict, weather: Optional[Dict], stadium: Optional[Any]) -> Dict[str, float]:
        over = float(state.get("over", 0) or 0)
        runs = int(state.get("runs", 0) or 0)
        wickets = int(state.get("wickets", 0) or 0)
        target = state.get("target")
        total_overs = self._total_overs(state)
        wickets_in_hand = max(0, 10 - wickets)
        current_rate = runs / max(over, 0.1)
        balls_left = max(0, int((total_overs - over) * 6))
        runs_left = max(0, int(target or 0) - runs)
        required_rate = runs_left / max(balls_left / 6, 0.1) if target else 0.0
        type_fast, type_spin, type_medium = self._type_features(bowler.type)

        return {
            "over": over,
            "runs": float(runs),
            "wickets": float(wickets),
            "innings": float(state.get("innings", 2 if target else 1) or 1),
            "target": float(target or 0),
            "required_rate": float(required_rate),
            "current_rate": float(current_rate),
            "wickets_in_hand": float(wickets_in_hand),
            "is_death": float(over >= max(0, total_overs - 5)),
            "is_powerplay": float(over < min(6, total_overs * 0.3)),
            "player_economy": float(bowler.economy or 7.0),
            "player_average": float(bowler.average or 30.0),
            "player_strike_rate": float(bowler.strike_rate or 20.0),
            "player_form_index": float(bowler.form_index or 0.5),
            "type_fast": type_fast,
            "type_spin": type_spin,
            "type_medium": type_medium,
            "humidity": float((weather or {}).get("humidity", 60.0)),
            "dew_factor": float((weather or {}).get("dew_factor", 0.5)),
            "wind_speed": float((weather or {}).get("wind_speed", 8.0)),
            "stadium_spin_friendly": float(bool(getattr(stadium, "spin_friendly", False))),
            "stadium_bounce": float(getattr(stadium, "bounce_rating", 0.5) or 0.5),
            "stadium_dew": float(getattr(stadium, "dew_factor", 0.5) or 0.5),
        }

    def _win_feature_map(self, runs: int, wickets: int, over: float, innings: int, target: int, total_overs: int) -> Dict[str, float]:
        balls_left = max(0, int((total_overs - over) * 6))
        runs_left = max(0, target - runs)
        return {
            "over": over,
            "runs": float(runs),
            "wickets": float(wickets),
            "innings": float(innings),
            "target": float(target),
            "runs_left": float(runs_left),
            "balls_left": float(balls_left),
            "required_rate": float(runs_left / max(balls_left / 6, 0.1)) if target else 0.0,
            "current_rate": float(runs / max(over, 0.1)),
            "wickets_in_hand": float(max(0, 10 - wickets)),
        }

    def _generate_reasons(self, bowler, total: float, matchup: float, cond: float, state: Dict, weather: Optional[Dict], stadium: Optional[Any]) -> List[str]:
        reasons = []
        over = float(state.get("over", 0) or 0)
        if total >= 0.72:
            reasons.append("Model rates this as a high-impact bowling option from similar IPL states")
        elif total >= 0.62:
            reasons.append("Model sees a solid expected-over outcome for this situation")
        else:
            reasons.append("Model keeps this option viable but below the leading choices")

        if over >= 15 and bowler.type == "FAST":
            reasons.append("Historical death-over states favour this bowler profile")
        elif over < 6 and bowler.type in ("FAST", "MEDIUM"):
            reasons.append("Powerplay conditions match patterns learned from the dataset")
        elif bowler.type == "SPIN":
            reasons.append("Spin profile is being evaluated against venue and phase features")

        if cond >= 0.65:
            reasons.append("Venue/weather inputs improve the learned suitability score")
        if matchup >= 0.65:
            reasons.append("Current run rate and wickets align with stronger model outcomes")
        return reasons[:3]

    @staticmethod
    def _type_features(bowler_type: str) -> tuple[int, int, int]:
        normalized = (bowler_type or "FAST").upper()
        return int(normalized == "FAST"), int(normalized == "SPIN"), int(normalized == "MEDIUM")

    @staticmethod
    def _component_from_features(score: float, rate: float, invert: bool = False) -> float:
        rate_factor = max(0.0, min(1.0, rate / 14.0))
        if invert:
            rate_factor = 1.0 - rate_factor
        return max(0.0, min(1.0, (score * 0.72) + (rate_factor * 0.28)))

    @staticmethod
    def _conditions_component(score: float, bowler, weather: Optional[Dict], stadium: Optional[Any]) -> float:
        value = score
        if stadium and getattr(stadium, "spin_friendly", False) and bowler.type == "SPIN":
            value += 0.08
        if weather and weather.get("dew_factor", 0.5) > 0.7 and bowler.type == "SPIN":
            value -= 0.08
        return max(0.0, min(1.0, value))

    @staticmethod
    def _total_overs(state: Dict) -> int:
        match_type = str(state.get("match_type", "T20")).upper()
        return 50 if match_type == "ODI" else 20


engine_instance = PredictionEngine()
