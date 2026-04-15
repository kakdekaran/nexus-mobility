import io
import os
import uuid
from datetime import datetime, timedelta

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from typing import List, Optional

from services.auth_handler import get_current_analyst_or_admin, get_current_user
from services.db import add_log, log_activity
from services.ml import predict_traffic
from utils.locations import canonicalize_location, get_cities, get_locations_for_city

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VALID_CITIES = set(get_cities())
DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

def canonical_city(city: str) -> str:
    city_map = {k.lower(): k for k in VALID_CITIES}
    return city_map.get(city.lower(), city)

@router.get("/locations")
def get_locations(city: str = "Delhi"):
    return {"locations": get_locations_for_city(city)}

# ── Helper Functions ──────────────────────────────────────────────────────

def _parse_date(raw: str) -> datetime | None:
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%B %d, %Y", "%b %d, %Y", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(str(raw).strip(), fmt)
        except ValueError:
            continue
    try:
        return pd.to_datetime(raw, dayfirst=True).to_pydatetime()
    except Exception:
        return None

def _parse_time(raw: str) -> int | None:
    import re
    text = str(raw).strip().upper()
    m = re.match(r"(\d{1,2})(?::(\d{2}))?\s*(AM|PM)", text)
    if m:
        h = int(m.group(1))
        ampm = m.group(3)
        if ampm == "PM" and h != 12:
            h += 12
        elif ampm == "AM" and h == 12:
            h = 0
        return h if 0 <= h <= 23 else None
    m = re.match(r"(\d{1,2}):(\d{2})", text)
    if m:
        h = int(m.group(1))
        return h if 0 <= h <= 23 else None
    m = re.match(r"^(\d{1,2})$", text)
    if m:
        h = int(m.group(1))
        return h if 0 <= h <= 23 else None
    return None

def _hour_to_ampm(h: int) -> str:
    if h == 0: return "12:00 AM"
    elif h < 12: return f"{h}:00 AM"
    elif h == 12: return "12:00 PM"
    else: return f"{h - 12}:00 PM"

def _friendly_date_label(dt: datetime) -> str:
    return dt.strftime("%d %b %Y")

def _traffic_status(congestion: float) -> dict:
    if congestion >= 80:
        return {"level": "Very High", "emoji": "🔴", "advice": "Avoid travel if possible. Use metro/public transport."}
    elif congestion >= 60:
        return {"level": "High", "emoji": "🟠", "advice": "Expect 15-25 min delays. Take alternate routes."}
    elif congestion >= 40:
        return {"level": "Moderate", "emoji": "🟡", "advice": "Slight delays possible. Normal route is fine."}
    elif congestion >= 20:
        return {"level": "Low", "emoji": "🟢", "advice": "Roads are clear. Good time to travel!"}
    else:
        return {"level": "Very Low", "emoji": "🟢", "advice": "Almost no traffic. Best time to travel!"}


def _normalize_city_or_raise(raw_city: str) -> str:
    city = canonical_city(raw_city.strip())
    if city not in VALID_CITIES:
        raise HTTPException(status_code=422, detail=f"Unknown city: '{raw_city}'")
    return city


def _build_city_wise_insights(results: list[dict]) -> list[dict]:
    if not results:
        return []

    grouped: dict[str, list[dict]] = {}
    for row in results:
        grouped.setdefault(row["city"], []).append(row)

    city_summary = []
    for city, rows in grouped.items():
        avg = round(sum(r["congestion"] for r in rows) / len(rows), 1)
        top_hotspot = max(rows, key=lambda r: r["congestion"])
        city_summary.append(
            {
                "city": city,
                "rows": len(rows),
                "average_congestion": avg,
                "max_congestion": round(top_hotspot["congestion"], 1),
                "top_location": top_hotspot["location"],
            }
        )

    city_summary.sort(key=lambda x: x["average_congestion"], reverse=True)
    return city_summary

# ── Single Prediction ─────────────────────────────────────────────────────

class SinglePredictionRequest(BaseModel):
    date: str = Field(..., min_length=1, max_length=50)
    time: str = Field(..., min_length=1, max_length=20)
    city: str = Field(default="Delhi", min_length=2, max_length=50)
    location: str = Field(default="Connaught Place", min_length=2, max_length=100)
    weather: str = Field(default="clear")
    is_holiday: bool = Field(default=False)
    is_event: bool = Field(default=False)

@router.post("/predict")
def predict(data: SinglePredictionRequest, current_user: dict = Depends(get_current_user)):
    parsed_date = _parse_date(data.date)
    if parsed_date is None:
        raise HTTPException(status_code=422, detail=f"Invalid date: '{data.date}'")

    parsed_hour = _parse_time(data.time)
    if parsed_hour is None:
        raise HTTPException(status_code=422, detail=f"Invalid time: '{data.time}'")

    city = _normalize_city_or_raise(data.city)
    location = canonicalize_location(city, data.location)

    day_of_week = parsed_date.weekday()
    month = parsed_date.month

    result = predict_traffic(
        hour=parsed_hour,
        city=city,
        location=location,
        day_of_week=day_of_week,
        month=month,
        weather=data.weather,
        is_holiday=data.is_holiday,
        is_event=data.is_event
    )

    congestion = result["congestion"]
    vehicle_count = result["vehicle_count"]
    status = _traffic_status(congestion)
    is_peak = 7 <= parsed_hour <= 10 or 17 <= parsed_hour <= 20

    log_activity({
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "user_email": current_user["sub"],
        "action": "prediction_requested",
        "details": f"Loc: {location}, City: {city}, Result: {congestion}%",
    })

    return {
        "date": parsed_date.strftime("%Y-%m-%d"),
        "date_label": _friendly_date_label(parsed_date),
        "day": DAY_NAMES[day_of_week],
        "time": _hour_to_ampm(parsed_hour),
        "hour": parsed_hour,
        "city": city,
        "location": location,
        "weather": data.weather,
        "is_holiday": data.is_holiday,
        "is_event": data.is_event,
        "congestion": congestion,
        "vehicle_count": vehicle_count,
        "status": status["level"],
        "emoji": status["emoji"],
        "advice": status["advice"],
        "is_weekend": day_of_week >= 5,
        "peak_hour": is_peak,
        "timestamp": datetime.utcnow().isoformat(),
    }

# ── Batch Prediction (JSON) ──────────────────────────────────────────────

class BatchRow(BaseModel):
    date: str
    time: str
    city: str = "Delhi"
    location: str = "Connaught Place"
    weather: str = "clear"
    is_holiday: bool = False
    is_event: bool = False

class BatchPredictionRequest(BaseModel):
    rows: List[BatchRow]

@router.post("/predict-batch")
def predict_batch(data: BatchPredictionRequest, current_user: dict = Depends(get_current_user)):
    if len(data.rows) > 100:
        raise HTTPException(status_code=422, detail="Maximum 100 rows allowed per batch.")

    results = []
    errors = []

    for idx, row in enumerate(data.rows):
        row_num = idx + 1
        row_errors = []

        parsed_date = _parse_date(row.date)
        if parsed_date is None: row_errors.append(f"Invalid date: '{row.date}'")

        parsed_hour = _parse_time(row.time)
        if parsed_hour is None: row_errors.append(f"Invalid time: '{row.time}'")

        city = canonical_city(row.city.strip())
        if city not in VALID_CITIES: row_errors.append(f"Unknown city: '{row.city}'")

        if row_errors:
            errors.append({"row": row_num, "errors": row_errors, "date": row.date, "time": row.time, "city": row.city})
            continue

        day_of_week = parsed_date.weekday()
        month = parsed_date.month
        location = canonicalize_location(city, row.location)

        pred_result = predict_traffic(
            hour=parsed_hour, 
            city=city, 
            location=location,
            day_of_week=day_of_week, 
            month=month,
            weather=row.weather,
            is_holiday=row.is_holiday,
            is_event=row.is_event
        )
        congestion = pred_result["congestion"]
        status = _traffic_status(congestion)

        results.append({
            "row": row_num,
            "date": parsed_date.strftime("%Y-%m-%d"),
            "date_label": _friendly_date_label(parsed_date),
            "day": DAY_NAMES[day_of_week],
            "time": _hour_to_ampm(parsed_hour),
            "hour": parsed_hour,
            "city": city,
            "location": location,
            "weather": row.weather,
            "congestion": congestion,
            "vehicle_count": pred_result["vehicle_count"],
            "status": status["level"],
            "emoji": status["emoji"],
            "advice": status["advice"],
            "is_weekend": day_of_week >= 5,
            "peak_hour": 7 <= parsed_hour <= 10 or 17 <= parsed_hour <= 20,
        })

    if results:
        avg_congestion = round(sum(r["congestion"] for r in results) / len(results), 1)
        peak_result = max(results, key=lambda r: r["congestion"])
        best_result = min(results, key=lambda r: r["congestion"])
        high_count = sum(1 for r in results if r["congestion"] >= 60)
    else:
        avg_congestion = 0; peak_result = None; best_result = None; high_count = 0

    city_wise = _build_city_wise_insights(results)

    return {
        "total_rows": len(data.rows),
        "processed": len(results),
        "failed": len(errors),
        "predictions": results,
        "errors": errors,
        "insights": {
            "average_congestion": avg_congestion,
            "worst_time": {"date_label": peak_result["date_label"], "city": peak_result["city"], "time": peak_result["time"], "congestion": peak_result["congestion"]} if peak_result else None,
            "best_time": {"date_label": best_result["date_label"], "city": best_result["city"], "time": best_result["time"], "congestion": best_result["congestion"]} if best_result else None,
            "high_traffic_count": high_count,
            "city_wise": city_wise,
        },
        "timestamp": datetime.utcnow().isoformat(),
    }

# ── CSV Upload ────────────────────────────────────────────────────────────

CSV_MAX_BYTES = 10 * 1024 * 1024
CSV_MAX_ROWS = 100_000
SIMPLE_REQUIRED = {"date", "time", "city", "location"}
RESPONSE_PREVIEW_LIMIT = 500

def _simple_batch_predict(df: pd.DataFrame) -> tuple[list, list]:
    results = []; errors = []
    for idx, row in df.iterrows():
        row_num = int(idx) + 1
        row_errors = []

        parsed_date = _parse_date(row.get("date", ""))
        if parsed_date is None: row_errors.append(f"Invalid date: '{row.get('date', '')}'")

        parsed_hour = _parse_time(str(row.get("time", "")))
        if parsed_hour is None: row_errors.append(f"Invalid time: '{row.get('time', '')}'")

        raw_city = str(row.get("city", "")).strip()
        city = canonical_city(raw_city)
        if city not in VALID_CITIES: row_errors.append(f"Unknown city: '{raw_city}'")

        if row_errors:
            errors.append({"row": row_num, "errors": row_errors, "date": str(row.get("date", "")), "time": str(row.get("time", "")), "city": raw_city})
            continue

        day_of_week = parsed_date.weekday()
        month = parsed_date.month

        location = canonicalize_location(city, str(row.get("location", "Main Road")))
        weather = str(row.get("weather", "clear")).lower()
        is_holiday = str(row.get("is_holiday", "no")).lower() in ["yes", "y", "true", "1"]
        is_event = str(row.get("is_event", "no")).lower() in ["yes", "y", "true", "1"]

        pred_result = predict_traffic(
            hour=parsed_hour, city=city, location=location, day_of_week=day_of_week, 
            month=month, weather=weather, is_holiday=is_holiday, is_event=is_event
        )
        congestion = pred_result["congestion"]
        status = _traffic_status(congestion)

        results.append({
            "row": row_num,
            "date": parsed_date.strftime("%Y-%m-%d"),
            "date_label": _friendly_date_label(parsed_date),
            "day": DAY_NAMES[day_of_week],
            "time": _hour_to_ampm(parsed_hour),
            "hour": parsed_hour,
            "city": city,
            "location": location,
            "weather": weather,
            "is_holiday": is_holiday,
            "is_event": is_event,
            "congestion": congestion,
            "vehicle_count": pred_result["vehicle_count"],
            "status": status["level"],
            "emoji": status["emoji"],
            "advice": status["advice"],
            "is_weekend": day_of_week >= 5,
            "peak_hour": 7 <= parsed_hour <= 10 or 17 <= parsed_hour <= 20,
        })
    return results, errors

@router.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    content = await file.read()
    if len(content) > CSV_MAX_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the 10 MB size limit.")

    try: df = pd.read_csv(io.BytesIO(content))
    except Exception: raise HTTPException(status_code=400, detail="Could not parse CSV.")

    if len(df) > CSV_MAX_ROWS:
        raise HTTPException(status_code=422, detail=f"Too many rows ({len(df):,}).")

    df.columns = df.columns.str.strip().str.lower()
    missing = SIMPLE_REQUIRED - set(df.columns)
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing columns: {', '.join(sorted(missing))}. Required: date, time, city, location")

    results, errors = _simple_batch_predict(df)

    if results:
        avg_congestion = round(sum(r["congestion"] for r in results) / len(results), 1)
        peak_result = max(results, key=lambda r: r["congestion"])
        best_result = min(results, key=lambda r: r["congestion"])
        high_count = sum(1 for r in results if r["congestion"] >= 60)
    else:
        avg_congestion = 0; peak_result = None; best_result = None; high_count = 0

    preview = results[:RESPONSE_PREVIEW_LIMIT]
    preview_errors = errors[:100]
    city_wise = _build_city_wise_insights(results)

    return {
        "filename": file.filename,
        "total_rows": len(df),
        "processed": len(results),
        "failed": len(errors),
        "predictions": preview,
        "predictions_truncated": len(results) > RESPONSE_PREVIEW_LIMIT,
        "errors": preview_errors,
        "errors_truncated": len(errors) > 100,
        "insights": {
            "average_congestion": avg_congestion,
            "worst_time": {"date_label": peak_result["date_label"], "city": peak_result["city"], "time": peak_result["time"], "congestion": peak_result["congestion"]} if peak_result else None,
            "best_time": {"date_label": best_result["date_label"], "city": best_result["city"], "time": best_result["time"], "congestion": best_result["congestion"]} if best_result else None,
            "high_traffic_count": high_count,
            "city_wise": city_wise,
        },
        "timestamp": datetime.utcnow().isoformat(),
    }

# ── Forecast (next 6 hours) ──────────────────────────────────────────────

@router.get("/forecast")
def get_traffic_forecast(city: str = "Delhi", current_user: dict = Depends(get_current_user)):
    city = _normalize_city_or_raise(city)
    now = datetime.now()
    current_hour = now.hour
    day_of_week = now.weekday()
    month = now.month

    # Get a default location for the city
    locs = get_locations_for_city(city)
    location = locs[0] if locs else "Main"

    forecast = []
    for i in range(1, 7):
        target_hour = (current_hour + i) % 24
        target_day = day_of_week if (current_hour + i) < 24 else (day_of_week + 1) % 7

        res = predict_traffic(hour=target_hour, city=city, location=location, day_of_week=target_day, month=month)
        forecast.append({
            "hour": _hour_to_ampm(target_hour),
            "congestion": round(res["congestion"], 1)
        })
    return forecast

# ── Peak Hours ────────────────────────────────────────────────────────────

@router.get("/peak-hours")
def get_peak_hours(city: str = "Delhi", current_user: dict = Depends(get_current_user)):
    city = _normalize_city_or_raise(city)
    now = datetime.now()
    day_of_week = now.weekday()
    month = now.month

    locs = get_locations_for_city(city)
    location = locs[0] if locs else "Main"

    hourly = []
    for h in range(24):
        c = predict_traffic(hour=h, city=city, location=location, day_of_week=day_of_week, month=month)["congestion"]
        hourly.append({"hour": h, "congestion": c})

    sorted_hours = sorted(hourly, key=lambda x: x["congestion"], reverse=True)
    worst = sorted_hours[0]
    best = sorted_hours[-1]
    
    mp = predict_traffic(hour=9, city=city, location=location, day_of_week=day_of_week, month=month)["congestion"]
    ep = predict_traffic(hour=18, city=city, location=location, day_of_week=day_of_week, month=month)["congestion"]

    return {
        "id": str(uuid.uuid4()),
        "city": city,
        "day": DAY_NAMES[day_of_week],
        "morning_peak": {"start": "8:00 AM", "end": "10:00 AM", "congestion_level": round(mp, 1)},
        "evening_peak": {"start": "5:00 PM", "end": "8:00 PM", "congestion_level": round(ep, 1)},
        "predicted_worst_hour": _hour_to_ampm(worst["hour"]),
        "predicted_best_hour": _hour_to_ampm(best["hour"]),
    }

# ── Smart Signals (kept for admin/analyst) ────────────────────────────────

@router.get("/smart-signals")
def smart_signals(city: str = "Delhi", current_user: dict = Depends(get_current_analyst_or_admin)):
    city = _normalize_city_or_raise(city)
    now = datetime.now()
    
    locs = get_locations_for_city(city)
    intersections = locs[:5] if locs else [f"{city} Center"]

    suggestions = []
    for index, name in enumerate(intersections):
        congestion = predict_traffic(hour=now.hour, city=city, location=name, day_of_week=now.weekday(), month=now.month)["congestion"]
        local_congestion = min(congestion, 100.0)
        recommended = int(min(max(35 + local_congestion * 0.45, 35), 90))
        status = "Critical Load" if local_congestion >= 75 else "Optimal Flow" if local_congestion <= 40 else "Steady"

        suggestions.append({
            "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{city}-{name}")),
            "intersection": name,
            "recommended_green_time": recommended,
            "current_congestion": round(local_congestion, 1),
            "status": status,
            "grid_x": 20 + (index * 15) + (now.minute % 10),
            "grid_y": 30 + (index * 10) + (now.hour % 5),
        })
    return suggestions

@router.get("/signal-insights")
def signal_insights(city: str = "Delhi", current_user: dict = Depends(get_current_analyst_or_admin)):
    city = _normalize_city_or_raise(city)
    now = datetime.now()
    locs = get_locations_for_city(city)
    location = locs[0] if locs else "Main"
    congestion = predict_traffic(hour=now.hour, city=city, location=location, day_of_week=now.weekday(), month=now.month)["congestion"]
    efficiency = max(15, min(45, int(congestion * 0.4) + 10))
    reliability = round(99.1 + (now.second % 9) / 10.0, 2)

    return {
        "efficiency": f"{efficiency}%",
        "co2_saved": "1.2t",
        "reliability": f"{reliability}%",
        "total_nodes": "4,821",
        "last_sync": datetime.utcnow().isoformat()
    }

@router.post("/reroute")
def reroute_traffic(intersection: str = Query(..., min_length=2, max_length=120), city: str = "Delhi", current_user: dict = Depends(get_current_analyst_or_admin)):
    city = _normalize_city_or_raise(city)
    alternatives = [
        {"id": 1, "route": f"Via {city} Inner Ring", "estimated_saving": "14 mins", "congestion_level": "Clear"},
        {"id": 2, "route": f"Alternate {intersection} Bypass", "estimated_saving": "9 mins", "congestion_level": "Moderate"},
        {"id": 3, "route": f"{city} Transit Corridor", "estimated_saving": "11 mins", "congestion_level": "Clear"},
    ]
    return {
        "status": "success",
        "optimization_id": str(uuid.uuid4()),
        "original_intersection": intersection,
        "city": city,
        "alternatives": alternatives,
        "timestamp": datetime.utcnow().isoformat(),
    }
