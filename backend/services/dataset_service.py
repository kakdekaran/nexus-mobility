from __future__ import annotations

import os
import shutil
from datetime import datetime
from pathlib import Path

import pandas as pd
from fastapi import UploadFile

from services.ml import load_model

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "data" / "uploads"

REQUIRED_COLUMNS = [
    "City",
    "Hour",
    "Day_Name",
    "Temp_2m_C",
    "Is_Raining",
    "PM2_5_ugm3",
    "PM10_ugm3",
    "CO_ugm3",
    "NO2_ugm3",
]

MODEL_FEATURES = ["Hour", "PM2_5_ugm3", "Is_Raining", "Temp_2m_C"]
CITY_MULTIPLIERS = {
    "Delhi": 1.18,
    "Bengaluru": 1.15,
    "Mumbai": 1.12,
    "Hyderabad": 0.98,
    "Chennai": 0.92,
}
CITY_ALIASES = {"Bangalore": "Bengaluru"}

MAX_UPLOAD_SIZE_BYTES = 70 * 1024 * 1024
MAX_ROWS = 100_000
CSV_CHUNK_SIZE = 20_000


class DatasetServiceError(Exception):
    status_code = 400

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class DatasetNotFoundError(DatasetServiceError):
    status_code = 404


class ModelNotLoadedError(DatasetServiceError):
    status_code = 503


def _sanitize_filename(filename: str) -> str:
    if not filename:
        raise DatasetServiceError("Filename is required.")
    sanitized = Path(filename).name
    if sanitized != filename:
        raise DatasetServiceError("Invalid filename. Path segments are not allowed.")
    return sanitized


def _resolve_upload_path(filename: str) -> Path:
    sanitized = _sanitize_filename(filename)
    upload_root = UPLOAD_DIR.resolve()
    target = (upload_root / sanitized).resolve()
    if upload_root not in target.parents and target != upload_root:
        raise DatasetServiceError("Invalid upload path.")
    return target


def _assert_required_columns(columns: list[str]) -> None:
    missing = [column for column in REQUIRED_COLUMNS if column not in columns]
    if missing:
        raise DatasetServiceError(
            f"Invalid CSV structure. Missing required columns: {', '.join(missing)}"
        )


def _validate_chunk(chunk: pd.DataFrame) -> None:
    for column in REQUIRED_COLUMNS:
        if chunk[column].isna().any():
            raise DatasetServiceError(f"Validation failed. Column '{column}' contains empty values.")

        if chunk[column].dtype == object:
            empty_text = chunk[column].astype(str).str.strip().eq("")
            if empty_text.any():
                raise DatasetServiceError(f"Validation failed. Column '{column}' contains empty text values.")

    hour = pd.to_numeric(chunk["Hour"], errors="coerce")
    if hour.isna().any() or (hour < 0).any() or (hour > 23).any():
        raise DatasetServiceError("Validation failed. 'Hour' must be numeric and between 0 and 23.")

    is_raining = pd.to_numeric(chunk["Is_Raining"], errors="coerce")
    if is_raining.isna().any() or (~is_raining.isin([0, 1])).any():
        raise DatasetServiceError("Validation failed. 'Is_Raining' must be 0 or 1.")


def _validate_csv_file(file_path: Path) -> int:
    try:
        header = pd.read_csv(file_path, nrows=0)
    except pd.errors.EmptyDataError as exc:
        raise DatasetServiceError("Validation failed. CSV file is empty.") from exc
    except Exception as exc:
        raise DatasetServiceError(f"Validation failed. Unable to read CSV header: {exc}") from exc

    _assert_required_columns(header.columns.tolist())

    rows_count = 0
    try:
        for chunk in pd.read_csv(file_path, chunksize=CSV_CHUNK_SIZE, usecols=REQUIRED_COLUMNS):
            rows_count += len(chunk)
            if rows_count > MAX_ROWS:
                raise DatasetServiceError(
                    f"Validation failed. Row limit exceeded ({MAX_ROWS} max)."
                )
            _validate_chunk(chunk)
    except ValueError as exc:
        raise DatasetServiceError(f"Validation failed. {exc}") from exc

    if rows_count == 0:
        raise DatasetServiceError("Validation failed. CSV has no data rows.")

    return rows_count


def validate_and_save_uploaded_dataset(file: UploadFile) -> dict:
    if not file.filename:
        raise DatasetServiceError("Validation failed. Missing filename.")
    if not file.filename.lower().endswith(".csv"):
        raise DatasetServiceError("Validation failed. Only CSV files are allowed.")

    file.file.seek(0, os.SEEK_END)
    size_bytes = file.file.tell()
    file.file.seek(0)

    if size_bytes > MAX_UPLOAD_SIZE_BYTES:
        raise DatasetServiceError("Validation failed. File size exceeds 70MB limit.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    original_name = Path(file.filename).name.replace(" ", "_")
    saved_filename = f"{timestamp}_{original_name}"
    destination = _resolve_upload_path(saved_filename)

    try:
        with destination.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        rows = _validate_csv_file(destination)
    except Exception:
        if destination.exists():
            destination.unlink()
        raise
    finally:
        file.file.close()

    return {
        "filename": saved_filename,
        "rows": rows,
        "uploaded_at": datetime.utcnow().isoformat(),
    }


def _canonical_city(city: str) -> str:
    return CITY_ALIASES.get(str(city).strip(), str(city).strip())


def _validate_processing_columns(df: pd.DataFrame) -> None:
    missing = [column for column in REQUIRED_COLUMNS if column not in df.columns]
    if missing:
        raise DatasetServiceError(
            f"Processing failed. Missing required columns: {', '.join(missing)}"
        )


def process_uploaded_dataset(filename: str, save_processed_csv: bool = False) -> dict:
    upload_path = _resolve_upload_path(filename)
    if not upload_path.exists():
        raise DatasetNotFoundError(f"Dataset '{filename}' was not found.")

    model = load_model()
    if model is None:
        raise ModelNotLoadedError("Processing failed. ML model is not loaded.")

    try:
        df = pd.read_csv(upload_path)
    except Exception as exc:
        raise DatasetServiceError(f"Processing failed. Unable to read CSV: {exc}") from exc

    _validate_processing_columns(df)
    if len(df) > MAX_ROWS:
        raise DatasetServiceError(f"Processing failed. Row limit exceeded ({MAX_ROWS} max).")

    features = df[MODEL_FEATURES].apply(pd.to_numeric, errors="coerce")
    if features.isna().any().any():
        raise DatasetServiceError(
            "Processing failed. One or more model feature values are invalid or empty."
        )

    predicted = model.predict(features)
    canonical_cities = df["City"].astype(str).map(_canonical_city)
    multipliers = canonical_cities.map(CITY_MULTIPLIERS).fillna(1.0)

    df["Predicted_Congestion"] = (
        pd.Series(predicted, index=df.index).mul(multipliers).clip(lower=5, upper=100).round(1)
    )
    df["City"] = canonical_cities

    city_avg = (
        df.groupby("City", as_index=False)["Predicted_Congestion"]
        .mean()
        .sort_values(by="Predicted_Congestion", ascending=False)
    )
    hour_avg = df.groupby("Hour", as_index=False)["Predicted_Congestion"].mean()
    peak_hour_row = hour_avg.sort_values(by="Predicted_Congestion", ascending=False).iloc[0]

    response = {
        "summary": {
            "filename": filename,
            "rows_processed": int(len(df)),
            "average_congestion": round(float(df["Predicted_Congestion"].mean()), 2),
            "max_congestion": round(float(df["Predicted_Congestion"].max()), 2),
            "min_congestion": round(float(df["Predicted_Congestion"].min()), 2),
            "city_wise_average_congestion": [
                {
                    "city": row["City"],
                    "average_congestion": round(float(row["Predicted_Congestion"]), 2),
                }
                for _, row in city_avg.iterrows()
            ],
            "peak_hour": {
                "hour": int(peak_hour_row["Hour"]),
                "average_congestion": round(float(peak_hour_row["Predicted_Congestion"]), 2),
            },
        },
        "sample_predictions": (
            df.head(10)
            .replace({pd.NA: None})
            .to_dict(orient="records")
        ),
    }

    if save_processed_csv:
        processed_filename = (
            f"processed_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}_{Path(filename).name}"
        )
        processed_path = _resolve_upload_path(processed_filename)
        df.to_csv(processed_path, index=False)
        response["download"] = {
            "processed_filename": processed_filename,
            "download_url": f"/api/analytics/download-processed/{processed_filename}",
        }

    return response


def get_uploaded_csv_path(filename: str) -> Path:
    resolved = _resolve_upload_path(filename)
    if not resolved.exists():
        raise DatasetNotFoundError(f"Dataset '{filename}' was not found.")
    if resolved.suffix.lower() != ".csv":
        raise DatasetServiceError("Only CSV files are supported.")
    return resolved
