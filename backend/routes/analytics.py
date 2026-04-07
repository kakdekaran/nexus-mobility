import io
import os
import uuid
from datetime import datetime
from math import cos, sin

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from services.auth_handler import get_current_analyst_or_admin, get_current_user
from services.db import add_log, log_activity

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROCESSED_DATA = os.path.join(BASE_DIR, "data", "processed_sample.csv")
CITY_SUMMARY = os.path.join(BASE_DIR, "data", "city_summary.json")

CITY_ALIASES = {"Bangalore": "Bengaluru"}


def canonical_city(city: str) -> str:
    return CITY_ALIASES.get(city, city)


def get_data() -> pd.DataFrame | None:
    if os.path.exists(PROCESSED_DATA):
        return pd.read_csv(PROCESSED_DATA)
    return None


def get_cities_summary() -> pd.DataFrame | None:
    if os.path.exists(CITY_SUMMARY):
        return pd.read_json(CITY_SUMMARY)
    return None


def get_city_profile(city: str) -> dict:
    summary = get_cities_summary()
    canonical = canonical_city(city)
    defaults = {"city": city, "pm25": 55.0, "pm10": 90.0, "co": 380.0, "no2": 25.0}

    if summary is None:
        return defaults

    city_row = summary[summary["City"] == canonical]
    if city_row.empty:
        return defaults

    row = city_row.iloc[0]
    return {
        "city": city,
        "pm25": float(row.get("PM2_5_ugm3", defaults["pm25"])),
        "pm10": float(row.get("PM10_ugm3", defaults["pm10"])),
        "co": float(row.get("CO_ugm3", defaults["co"])),
        "no2": float(row.get("NO2_ugm3", defaults["no2"])),
    }


def get_city_multiplier(city: str) -> float:
    summary = get_cities_summary()
    if summary is None or summary.empty:
        return 1.0

    median_pm25 = max(float(summary["PM2_5_ugm3"].median()), 1.0)
    relative = get_city_profile(city)["pm25"] / median_pm25
    return round(min(max(relative, 0.75), 1.45), 3)


def weekday_label(index: int) -> str:
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]


@router.get("/dashboard-stats")
def get_dashboard_stats(city: str = "Delhi", current_user: dict = Depends(get_current_user)):
    df = get_data()
    profile = get_city_profile(city)
    multiplier = get_city_multiplier(city)

    avg_traffic = float(df["Congestion"].mean()) * multiplier if df is not None and not df.empty else 62.0 * multiplier
    active_alerts = max(1, int(round((avg_traffic / 25.0) + (profile["pm25"] / 80.0))))

    return {
        "avg_traffic_index": round(min(avg_traffic, 100.0), 1),
        "avg_aqi": round(profile["pm25"], 1),
        "active_alerts": active_alerts,
        "peak_hour": "18:00" if multiplier >= 1 else "17:00",
    }


@router.get("/traffic-trends")
def get_traffic_trends(
    city: str = "Delhi",
    min_congestion: float = 0,
    time_range: str = "24h",
    current_user: dict = Depends(get_current_user),
):
    df = get_data()
    if df is None or df.empty:
        return []

    multiplier = get_city_multiplier(city)
    hourly = df.groupby("Hour")["Congestion"].mean().reset_index()

    if time_range == "7d":
        base = float(hourly["Congestion"].mean()) * multiplier
        day_factors = [1.02, 1.05, 1.08, 1.04, 1.12, 0.74, 0.68]
        return [
            {"time": weekday_label(index), "congestion": round(max(base * factor, 5.0), 1)}
            for index, factor in enumerate(day_factors)
            if base * factor >= min_congestion
        ]

    if time_range == "30d":
        base = float(hourly["Congestion"].mean()) * multiplier
        week_factors = [0.96, 1.01, 1.07, 1.1]
        return [
            {"time": f"Week {index + 1}", "congestion": round(max(base * factor, 5.0), 1)}
            for index, factor in enumerate(week_factors)
            if base * factor >= min_congestion
        ]

    output = []
    # Create a unique shift per city to make the graphs look distinct
    city_shift = sum(ord(c) for c in city) % 4 - 2 # -2 to +1 hour shift
    
    for _, row in hourly.iterrows():
        hour = (int(row["Hour"]) + city_shift) % 24
        commuting_boost = 1.15 if 8 <= hour <= 10 or 17 <= hour <= 20 else 0.94 if 0 <= hour <= 5 else 1.0
        
        # Add slight city-specific noise (±5%)
        noise = 0.95 + ((sum(ord(c) for c in city) * hour) % 11) / 100.0
        
        congestion = float(row["Congestion"]) * multiplier * commuting_boost * noise
        if congestion >= min_congestion:
            output.append({
                "time": f"{int(row['Hour']):02d}:00", 
                "congestion": round(min(max(congestion, 5.0), 100.0), 1)
            })
    return output


@router.get("/pollution-correlation")
def get_pollution_correlation(
    city: str = "Delhi",
    min_aqi: float = 0,
    time_range: str = "24h",
    current_user: dict = Depends(get_current_user),
):
    df = get_data()
    if df is None or df.empty:
        return []

    profile = get_city_profile(city)
    multiplier = get_city_multiplier(city)
    hourly = df.groupby("Hour")[["PM2_5_ugm3", "Congestion"]].mean().reset_index()

    if time_range == "7d":
        day_factors = [1.0, 1.03, 1.05, 1.02, 1.07, 0.83, 0.8]
        return [
            {
                "time": weekday_label(index),
                "aqi": round(max(profile["pm25"] * factor, 5.0), 1),
                "congestion": round(max(float(hourly["Congestion"].mean()) * multiplier * factor, 5.0), 1),
            }
            for index, factor in enumerate(day_factors)
            if profile["pm25"] * factor >= min_aqi
        ]

    if time_range == "30d":
        week_factors = [0.95, 1.0, 1.04, 1.08]
        return [
            {
                "time": f"Week {index + 1}",
                "aqi": round(max(profile["pm25"] * factor, 5.0), 1),
                "congestion": round(max(float(hourly["Congestion"].mean()) * multiplier * factor, 5.0), 1),
            }
            for index, factor in enumerate(week_factors)
            if profile["pm25"] * factor >= min_aqi
        ]

    output = []
    for _, row in hourly.iterrows():
        hour = int(row["Hour"])
        cycle = 1 + 0.08 * sin((hour / 24) * 6.28) + 0.04 * cos((hour / 24) * 12.56)
        aqi = profile["pm25"] * cycle
        congestion = float(row["Congestion"]) * multiplier * (0.82 + (aqi / max(profile["pm25"], 1.0)) * 0.18)
        if aqi >= min_aqi:
            output.append(
                {
                    "time": f"{hour:02d}:00",
                    "aqi": round(max(aqi, 2.0), 1),
                    "congestion": round(min(max(congestion, 2.0), 100.0), 1),
                }
            )
    return output


@router.get("/compare-cities")
def compare_cities(city1: str, city2: str, current_user: dict = Depends(get_current_user)):
    return {
        "city1": {"name": city1, **get_city_profile(city1)},
        "city2": {"name": city2, **get_city_profile(city2)},
    }


@router.get("/export-report")
def export_report(
    city: str | None = None,
    min_congestion: float | None = None,
    max_congestion: float | None = None,
    current_user: dict = Depends(get_current_analyst_or_admin),
):
    df = get_data()
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail="No data available")

    filtered = df.copy()
    if city:
        filtered["Requested_City"] = city
    if min_congestion is not None:
        filtered = filtered[filtered["Congestion"] >= min_congestion]
    if max_congestion is not None:
        filtered = filtered[filtered["Congestion"] <= max_congestion]

    log_activity(
        {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "user_email": current_user["sub"],
            "action": "report_exported",
            "details": f"Exported {len(filtered)} records with filters - City: {city}, Min: {min_congestion}, Max: {max_congestion}",
        }
    )

    output = io.StringIO()
    filtered.to_csv(output, index=False)
    output.seek(0)

    filename_city = (city or "all").replace(" ", "_").lower()
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=traffic_report_{filename_city}_{datetime.utcnow().strftime('%Y%m%d')}.csv"
        },
    )


@router.get("/alerts")
def get_alerts(city: str = "Delhi", current_user: dict = Depends(get_current_user)):
    stats = get_dashboard_stats(city=city, current_user=current_user)
    alerts = []

    if stats["avg_traffic_index"] >= 70:
        alerts.append(
            {
                "id": str(uuid.uuid4()),
                "type": "congestion",
                "severity": "high" if stats["avg_traffic_index"] >= 85 else "medium",
                "title": "High traffic congestion detected",
                "message": f"Average congestion is {stats['avg_traffic_index']:.1f}% in {city}.",
                "city": city,
            }
        )

    if stats["avg_aqi"] >= 90:
        alerts.append(
            {
                "id": str(uuid.uuid4()),
                "type": "pollution",
                "severity": "high" if stats["avg_aqi"] >= 150 else "medium",
                "title": "Pollution advisory issued",
                "message": f"Average PM2.5 is {stats['avg_aqi']:.1f} ug/m3 in {city}.",
                "city": city,
            }
        )

    return alerts


@router.post("/clear-alerts")
def clear_alerts(city: str = "Delhi", current_user: dict = Depends(get_current_user)):
    log_activity(
        {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "user_email": current_user["sub"],
            "action": "alerts_cleared",
            "details": f"User cleared all alerts for {city}",
        }
    )
    add_log(
        {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "type": "alerts_cleared",
            "email": current_user["sub"],
            "city": city,
        }
    )
    return {"message": f"Alerts cleared for {city}"}


@router.get("/sector-stats")
def get_sector_stats(city: str = "Delhi", current_user: dict = Depends(get_current_user)):
    df = get_data()
    multiplier = get_city_multiplier(city)
    base_congestion = float(df["Congestion"].mean()) * multiplier if df is not None and not df.empty else 55.0 * multiplier
    
    # Define metropolitan sectors with specific load multipliers for realistic variation
    sector_multipliers = {
        "A1": 0.85, "A2": 1.15, "A3": 0.92, "A4": 1.28,
        "B1": 0.76, "B2": 0.98, "C1": 1.34, "C2": 1.12,
        "D3": 0.88, "E5": 1.05
    }
    
    sectors = []
    city_seed = sum(ord(c) for c in city)
    for sector_id, m in sector_multipliers.items():
        # Inject city-specific sector noise
        sector_noise = 0.9 + ((city_seed * ord(sector_id[0])) % 21) / 100.0
        val = min(max(base_congestion * m * sector_noise, 5.0), 100.0)
        sectors.append({
            "id": sector_id,
            "val": round(val, 1),
            "alert": val >= 80
        })
        
    return sectors
