import os
import uuid
from datetime import datetime

import pandas as pd
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from services.auth_handler import get_current_analyst_or_admin, get_current_user
from services.db import add_log, log_activity
from services.ml import predict_congestion

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROCESSED_DATA = os.path.join(BASE_DIR, "data", "processed_sample.csv")
CITY_SUMMARY = os.path.join(BASE_DIR, "data", "city_summary.json")
CITY_ALIASES = {"Bangalore": "Bengaluru"}


class PredictionRequest(BaseModel):
    hour_of_day: int = Field(..., ge=0, le=23)
    pollution_aqi: float = Field(..., ge=0, le=500)
    weather_condition: int = Field(..., ge=0, le=2)
    city: str = Field(default="Delhi", min_length=2, max_length=50)


def canonical_city(city: str) -> str:
    return CITY_ALIASES.get(city, city)


def get_city_summary(city: str) -> dict:
    if os.path.exists(CITY_SUMMARY):
        summary = pd.read_json(CITY_SUMMARY)
        row = summary[summary["City"] == canonical_city(city)]
        if not row.empty:
            record = row.iloc[0]
            return {
                "pm25": float(record.get("PM2_5_ugm3", 55.0)),
                "co": float(record.get("CO_ugm3", 380.0)),
                "no2": float(record.get("NO2_ugm3", 22.0)),
            }
    return {"pm25": 55.0, "co": 380.0, "no2": 22.0}


@router.post("/predict")
def predict(data: PredictionRequest, current_user: dict = Depends(get_current_user)):
    precipitation = 0.0
    if data.weather_condition == 1:
        precipitation = 0.5
    elif data.weather_condition == 2:
        precipitation = 0.1

    prediction = predict_congestion(
        hour=data.hour_of_day,
        pm2_5=data.pollution_aqi,
        precipitation=precipitation,
        city=data.city,
    )

    log_activity(
        {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "user_email": current_user["sub"],
            "action": "prediction_requested",
            "details": f"City: {data.city}, Hour: {data.hour_of_day}, AQI: {data.pollution_aqi}, Result: {prediction}%",
        }
    )

    add_log(
        {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "type": "prediction",
            "user": current_user["sub"],
            "city": data.city,
            "result": prediction,
        }
    )

    return {
        "predicted_congestion": prediction,
        "suggestion": "Increase green time by 10-15 seconds on inbound corridors" if prediction >= 70 else "Maintain standard signal cycle with regular monitoring",
        "confidence": 0.88 if prediction >= 70 else 0.82,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/smart-signals")
def smart_signals(city: str = "Delhi", current_user: dict = Depends(get_current_analyst_or_admin)):
    now = datetime.now()
    summary = get_city_summary(city)
    
    # Predict current congestion for more realistic baseline
    congestion = predict_congestion(
        hour=now.hour,
        pm2_5=summary["pm25"],
        precipitation=0.0,
        city=city
    )

    city_intersections = {
        "Delhi": ["Connaught Place", "India Gate", "Dwarka Sector 10", "Okhla Phase 3", "Lajpat Nagar"],
        "Mumbai": ["Gateway of India", "Marine Drive", "Bandra Kurla Complex", "Borivali East", "Dadar TT"],
        "Bangalore": ["Silk Board", "Whitefield", "Koramangala", "Electronic City", "Indiranagar"],
        "Chennai": ["T. Nagar", "Marina Beach", "Anna Salai", "Velachery", "Adyar"],
        "Hyderabad": ["HITEC City", "Charminar", "Banjara Hills", "Secunderabad", "Gachibowli"],
    }
    intersections = city_intersections.get(city, city_intersections["Delhi"])

    suggestions = []
    for index, name in enumerate(intersections):
        # Slightly vary congestion per intersection for realism
        local_congestion = min(congestion + (index * 4) - 8, 100.0)
        recommended = int(min(max(35 + local_congestion * 0.45, 35), 90))
        
        # Determine status based on congestion levels
        status = "Critical Load" if local_congestion >= 75 else "Optimal Flow" if local_congestion <= 40 else "Steady"
        
        suggestions.append(
            {
                "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{city}-{name}")),
                "intersection": name,
                "recommended_green_time": recommended,
                "current_congestion": round(local_congestion, 1),
                "status": status,
                # Add mock coordinates for the "Neural Grid"
                "grid_x": 20 + (index * 15) + (now.minute % 10),
                "grid_y": 30 + (index * 10) + (now.hour % 5),
            }
        )
    return suggestions


@router.get("/signal-insights")
def signal_insights(city: str = "Delhi", current_user: dict = Depends(get_current_analyst_or_admin)):
    summary = get_city_summary(city)
    # Derive insights from city data
    efficiency = min(max(int(summary["pm25"] * 0.4) + 10, 15), 45)
    co2_saved = round(summary["co"] / 200.0, 1)
    reliability = round(99.1 + (datetime.now().second % 9) / 10.0, 2)
    
    return {
        "efficiency": f"{efficiency}%",
        "co2_saved": f"{co2_saved}t",
        "reliability": f"{reliability}%",
        "total_nodes": "4,821",
        "last_sync": datetime.utcnow().isoformat()
    }


@router.get("/peak-hours")
def get_peak_hours(city: str = "Delhi", current_user: dict = Depends(get_current_analyst_or_admin)):
    summary = get_city_summary(city)
    intensity = min(max(int(summary["pm25"] * 0.45), 55), 95)
    return {
        "id": str(uuid.uuid4()),
        "city": city,
        "morning_peak": {"start": "08:00", "end": "10:00", "congestion_level": intensity - 6},
        "evening_peak": {"start": "17:30", "end": "19:30", "congestion_level": intensity},
        "predicted_worst_hour": "18:00",
        "predicted_best_hour": "14:00",
    }


@router.post("/reroute")
def reroute_traffic(
    intersection: str = Query(..., min_length=2, max_length=120),
    city: str = "Delhi",
    current_user: dict = Depends(get_current_analyst_or_admin),
):
    alternatives = [
        {"id": 1, "route": f"Via {city} Inner Ring", "estimated_saving": "14 mins", "congestion_level": "Clear"},
        {"id": 2, "route": f"Alternate {intersection} Bypass", "estimated_saving": "9 mins", "congestion_level": "Moderate"},
        {"id": 3, "route": f"{city} Transit Corridor", "estimated_saving": "11 mins", "congestion_level": "Clear"},
    ]

    log_activity(
        {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "user_email": current_user["sub"],
            "action": "traffic_rerouted",
            "details": f"Optimization triggered for {intersection} in {city}",
        }
    )

    return {
        "status": "success",
        "optimization_id": str(uuid.uuid4()),
        "original_intersection": intersection,
        "city": city,
        "alternatives": alternatives,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/forecast")
def get_traffic_forecast(city: str = "Delhi", aqi: float = 50.0, weather: int = 0, current_user: dict = Depends(get_current_user)):
    now = datetime.now()
    current_hour = now.hour
    
    forecast = []
    for i in range(1, 7):
        target_hour = (current_hour + i) % 24
        prediction = predict_congestion(
            hour=target_hour,
            pm2_5=aqi,
            precipitation=0.5 if weather == 1 else 0.0,
            city=city
        )
        forecast.append({
            "hour": f"{target_hour:02d}:00",
            "congestion": round(prediction, 1)
        })
        
    return forecast
