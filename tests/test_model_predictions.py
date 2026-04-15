"""
Tests for ML model predictions.

Validates that:
- The model can be loaded (or gracefully falls back)
- Predictions fall within the expected 5-100 congestion range
- The deterministic fallback also stays within range
"""
import sys
from pathlib import Path

import pytest

# Ensure the backend package is importable when running from repo root
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

from services.ml import (
    deterministic_fallback,
    load_model,
    predict_traffic,
)
from utils.model_validator import (
    check_model_file,
    run_startup_validation,
)

MODEL_AVAILABLE = load_model() is not None


# ---------------------------------------------------------------------------
# Startup validation
# ---------------------------------------------------------------------------

def test_startup_validation_does_not_raise():
    """run_startup_validation must never raise — safe to call at startup."""
    result = run_startup_validation()
    assert isinstance(result, dict)
    assert "model_file_present" in result
    assert "prediction_range_ok" in result


# ---------------------------------------------------------------------------
# Deterministic fallback predictions
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("hour,city,location,day,month", [
    (9,  "Delhi", "Connaught Place", 0, 4),      # Monday morning peak, April
    (14, "Mumbai", "Andheri", 2, 5),     # Wednesday Midday, May
    (2,  "Bengaluru", "Whitefield", 6, 1),  # Sunday Night, January
    (18, "Chennai", "T. Nagar", 4, 11),   # Friday evening peak, November
    (12, "Hyderabad", "HITEC City", 1, 8),  # Tuesday Midday, August
    (19, "Pune", "Hadaparsar", 3, 7),  # Pune alias location should resolve safely
])
def test_deterministic_fallback_range(hour, city, location, day, month):
    """Deterministic fallback must return congestion in [5, 100]."""
    value = deterministic_fallback(hour, city, location, day, month)["congestion"]
    assert 5.0 <= value <= 100.0, f"Unexpected fallback value {value} for {city}"


# ---------------------------------------------------------------------------
# predict_traffic (model or fallback)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("hour,city,location,day,month", [
    (9,  "Delhi", "Connaught Place", 0, 4),
    (14, "Mumbai", "Andheri", 2, 5),
    (2,  "Bengaluru", "Whitefield", 6, 1),
    (18, "Chennai", "T. Nagar", 4, 11),
    (12, "Hyderabad", "HITEC City", 1, 8),
    (19, "Pune", "Hadaparsar", 3, 7),
])
def test_predict_traffic_range(hour, city, location, day, month):
    """predict_traffic must always return a value clamped to [5, 100]."""
    value = predict_traffic(hour, city, location, day, month)["congestion"]
    assert 5.0 <= value <= 100.0, f"Congestion {value} out of range for {city}"


def test_predict_traffic_returns_float_and_int():
    """predict_traffic should return a dict with float congestion and int vehicle count."""
    result = predict_traffic(hour=8, city="Delhi", location="Connaught Place", day_of_week=0, month=4)
    assert isinstance(result["congestion"], float)
    assert isinstance(result["vehicle_count"], int)


def test_peak_hour_higher_than_night():
    """Peak-hour congestion should be higher than night-time congestion."""
    peak = predict_traffic(hour=9, city="Delhi", location="Connaught Place", day_of_week=0, month=4)["congestion"]
    night = predict_traffic(hour=3, city="Delhi", location="Connaught Place", day_of_week=0, month=4)["congestion"]
    assert peak > night, f"Expected peak ({peak}) > night ({night})"


# ---------------------------------------------------------------------------
# Model-specific tests (skipped gracefully if model is absent)
# ---------------------------------------------------------------------------

@pytest.mark.skipif(not MODEL_AVAILABLE, reason="Model file not present; skipping ML-specific tests")
def test_model_prediction_range():
    """When the model is loaded its raw predictions should be near [5, 100]."""
    model = load_model()
    test_inputs = [
        [0, 0, 9, 0, 4, 0, 0, 0, 0],
        [0, 1, 18, 4, 11, 0, 1, 0, 1],
        [1, 2, 14, 6, 5, 1, 0, 1, 0],
        [2, 3, 2, 2, 1, 0, 2, 0, 0],
    ]
    for inp in test_inputs:
        pred = model.predict([inp])[0]
        vehicle_count = float(pred[0])
        congestion = float(pred[1])
        assert 0.0 <= congestion <= 200.0, f"Raw model congestion prediction {congestion} is unreasonably large/small for {inp}"
        assert vehicle_count >= 0, f"Raw model vehicle count {vehicle_count} cannot be negative"


@pytest.mark.skipif(not MODEL_AVAILABLE, reason="Model file not present; skipping ML-specific tests")
def test_model_feature_count():
    """Model should expect exactly 9 features."""
    model = load_model()
    assert model.n_features_in_ == 9, (
        f"Model expects {model.n_features_in_} features, expected 9."
    )
