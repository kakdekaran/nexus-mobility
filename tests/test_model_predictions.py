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
    predict_congestion,
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

@pytest.mark.parametrize("hour,city,day,month", [
    (9,  "Delhi", 0, 4),      # Monday morning peak, April
    (14, "Mumbai", 2, 5),     # Wednesday Midday, May
    (2,  "Bengaluru", 6, 1),  # Sunday Night, January
    (18, "Chennai", 4, 11),   # Friday evening peak, November
    (12, "Hyderabad", 1, 8),  # Tuesday Midday, August
])
def test_deterministic_fallback_range(hour, city, day, month):
    """Deterministic fallback must return congestion in [5, 100]."""
    value = deterministic_fallback(hour, city, day, month)
    assert 5.0 <= value <= 100.0, f"Unexpected fallback value {value} for {city}"


# ---------------------------------------------------------------------------
# predict_congestion (model or fallback)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("hour,city,day,month", [
    (9,  "Delhi", 0, 4),
    (14, "Mumbai", 2, 5),
    (2,  "Bengaluru", 6, 1),
    (18, "Chennai", 4, 11),
    (12, "Hyderabad", 1, 8),
])
def test_predict_congestion_range(hour, city, day, month):
    """predict_congestion must always return a value clamped to [5, 100]."""
    value = predict_congestion(hour, city, day, month)
    assert 5.0 <= value <= 100.0, f"Congestion {value} out of range for {city}"


def test_predict_congestion_returns_float():
    """predict_congestion should always return a float."""
    result = predict_congestion(hour=8, city="Delhi", day_of_week=0, month=4)
    assert isinstance(result, float)


def test_peak_hour_higher_than_night():
    """Peak-hour congestion should be higher than night-time congestion."""
    peak = predict_congestion(hour=9, city="Delhi", day_of_week=0, month=4)
    night = predict_congestion(hour=3, city="Delhi", day_of_week=0, month=4)
    assert peak > night, f"Expected peak ({peak}) > night ({night})"


# ---------------------------------------------------------------------------
# Model-specific tests (skipped gracefully if model is absent)
# ---------------------------------------------------------------------------

@pytest.mark.skipif(not MODEL_AVAILABLE, reason="Model file not present; skipping ML-specific tests")
def test_model_prediction_range():
    """When the model is loaded its raw predictions should be near [5, 100]."""
    model = load_model()
    test_inputs = [
        [9,  0, 4, 0],
        [18, 4, 11, 0],
        [14, 6, 5, 1],
        [2,  2, 1, 0],
    ]
    for inp in test_inputs:
        pred = float(model.predict([inp])[0])
        # Allow a wider range here since city factor hasn't been applied yet
        assert 0.0 <= pred <= 200.0, f"Raw model prediction {pred} is unreasonably large/small for {inp}"


@pytest.mark.skipif(not MODEL_AVAILABLE, reason="Model file not present; skipping ML-specific tests")
def test_model_feature_count():
    """Model should expect exactly 4 features: Hour, DayOfWeek, Month, IsWeekend."""
    model = load_model()
    assert model.n_features_in_ == 4, (
        f"Model expects {model.n_features_in_} features, expected 4."
    )
