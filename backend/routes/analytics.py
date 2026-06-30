"""
Dataset analytics routes for matchup and venue intelligence.
"""

from fastapi import APIRouter, HTTPException, Query

from engine.dataset_analytics import get_matchup, get_venue_analytics, list_analytics_venues

router = APIRouter()


@router.get("/matchups")
def matchup_analysis(
    batter: str = Query(..., min_length=1),
    bowler: str = Query(..., min_length=1),
):
    return get_matchup(batter, bowler)


@router.get("/venues")
def analytics_venues():
    return {"venues": list_analytics_venues()}


@router.get("/venues/{venue}/analytics")
def venue_analytics(venue: str):
    analytics = get_venue_analytics(venue)
    if not analytics:
        raise HTTPException(404, detail="Venue analytics not found")
    return analytics
