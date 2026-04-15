import logging
import os
import pickle
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_DIR = BASE_DIR / "data" / "models"
PRIMARY_MODEL_PATH = MODEL_DIR / "traffic_predictor_lite.pkl"

CITY_ALIASES = {"Bangalore": "Bengaluru"}
# City factors adjust the base congestion for different metropolitan areas
CITY_FACTORS = {
    "Delhi": 1.25,      # High density
    "Mumbai": 1.18,     # Medium-High density
    "Bangalore": 1.20,  # Medium-High density (Traffic reputation)
    "Bengaluru": 1.20,
    "Chennai": 0.95,    # Moderate
    "Hyderabad": 1.05,   # Moderate-High
}

def get_model_path() -> Path | None:
    if PRIMARY_MODEL_PATH.exists():
        return PRIMARY_MODEL_PATH
    return None

def check_model_availability() -> bool:
    model_path = get_model_path()
    if model_path is None:
        logger.warning("No ML model file found at %s. Using fallback rules.", PRIMARY_MODEL_PATH)
        return False
    logger.info("ML model available at %s.", model_path)
    return True

def load_model():
    model_path = get_model_path()
    if model_path is None:
        return None
    try:
        with model_path.open("rb") as file:
            return pickle.load(file)
    except Exception as exc:
        logger.warning("Unable to load traffic model: %s", exc)
        return None

def city_factor(city: str) -> float:
    canonical = CITY_ALIASES.get(city, city)
    return CITY_FACTORS.get(canonical, 1.0)

def deterministic_fallback(hour: int, city: str, day_of_week: int = 0, month: int = 1) -> float:
    """Smart fallback prediction based on hour, city, day-of-week, and month."""
    factor = city_factor(city)
    base = 25.0
    
    # Peak hour logic
    if 8 <= hour <= 10:
        base += 35 if hour == 9 else 25
    elif 17 <= hour <= 20:
        base += 40 if hour == 18 else 30
    elif 11 <= hour <= 16:
        base += 15
    elif 0 <= hour <= 5:
        base -= 10
        
    is_weekend = 1 if (day_of_week >= 5) else 0
    if is_weekend:
        base *= 0.75
        if 11 <= hour <= 19:
            base += 10
            
    # Apply city factor
    base *= factor
    
    return base

def predict_congestion(hour: int, city: str = "Delhi", day_of_week: int = 0, month: int = 1):
    """
    Predict traffic congestion for a given hour, city, day, and month.
    Returns congestion percentage (5.0 to 100.0).
    """
    model = load_model()
    factor = city_factor(city)
    is_weekend = 1 if (day_of_week >= 5) else 0

    congestion = 0.0
    if model is not None:
        try:
            # Model expects: [Hour, DayOfWeek, Month, IsWeekend]
            # No more PM2.5 or other Kaggle data
            prediction = model.predict([[hour, day_of_week, month, is_weekend]])
            congestion = float(prediction[0]) * factor
        except Exception as exc:
            logger.warning("Prediction failed, using fallback: %s", exc)
            congestion = deterministic_fallback(hour, city, day_of_week, month)
    else:
        congestion = deterministic_fallback(hour, city, day_of_week, month)

    return round(min(max(congestion, 5.0), 100.0), 1)
