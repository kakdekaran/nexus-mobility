import os
import pickle
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).resolve().parent.parent.parent
AQI_DATA_PATH = BASE_DIR / "INDIA_AQI_COMPLETE_20251126.csv"
TRAFFIC_CONGESTION_PATH = BASE_DIR / "delhi_traffic" / "weekday_stats" / "2024_week_day_congestion_city.csv"
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = DATA_DIR / "models"
MODEL_PATH = MODEL_DIR / "traffic_predictor.pkl"


def clean_percentage(value):
    if isinstance(value, str):
        return float(value.replace("%", ""))
    return float(value)


def time_to_hour(value: str) -> int:
    parsed = pd.to_datetime(value.strip(), format="%I:%M %p")
    return int(parsed.hour)


def load_traffic_data() -> pd.DataFrame:
    traffic_df = pd.read_csv(TRAFFIC_CONGESTION_PATH)
    traffic_long = traffic_df.melt(id_vars=["Time"], var_name="Day_Name", value_name="Congestion")
    traffic_long["Congestion"] = traffic_long["Congestion"].apply(clean_percentage)
    traffic_long["Hour"] = traffic_long["Time"].apply(time_to_hour)
    return traffic_long


def load_aqi_features() -> pd.DataFrame:
    use_columns = ["City", "Hour", "Day_Name", "PM2_5_ugm3", "Is_Raining", "Temp_2m_C", "PM10_ugm3", "CO_ugm3", "NO2_ugm3"]
    chunks = pd.read_csv(AQI_DATA_PATH, chunksize=100000, usecols=lambda column: column in use_columns)

    delhi_rows = []
    for chunk in chunks:
        subset = chunk[chunk["City"].isin(["Delhi", "Bengaluru", "Mumbai", "Chennai", "Hyderabad"])]
        if not subset.empty:
            delhi_rows.append(subset)
        if sum(len(frame) for frame in delhi_rows) >= 250000:
            break

    if not delhi_rows:
        raise RuntimeError("AQI dataset did not contain enough training rows")

    aqi_df = pd.concat(delhi_rows, ignore_index=True)
    grouped = (
        aqi_df.groupby(["Hour", "Day_Name"], as_index=False)[["PM2_5_ugm3", "Is_Raining", "Temp_2m_C", "PM10_ugm3", "CO_ugm3", "NO2_ugm3"]]
        .mean()
    )
    return grouped


def build_training_frame() -> pd.DataFrame:
    traffic_long = load_traffic_data()
    aqi_features = load_aqi_features()
    merged_df = traffic_long.merge(aqi_features, on=["Hour", "Day_Name"], how="left")

    merged_df["PM2_5_ugm3"] = merged_df["PM2_5_ugm3"].fillna(merged_df.groupby("Hour")["PM2_5_ugm3"].transform("median"))
    merged_df["Is_Raining"] = merged_df["Is_Raining"].fillna(0)
    merged_df["Temp_2m_C"] = merged_df["Temp_2m_C"].fillna(merged_df["Temp_2m_C"].median())
    merged_df["PM10_ugm3"] = merged_df["PM10_ugm3"].fillna(merged_df["PM10_ugm3"].median())
    merged_df["CO_ugm3"] = merged_df["CO_ugm3"].fillna(merged_df["CO_ugm3"].median())
    merged_df["NO2_ugm3"] = merged_df["NO2_ugm3"].fillna(merged_df["NO2_ugm3"].median())

    if merged_df[["PM2_5_ugm3", "Temp_2m_C"]].isna().any().any():
        raise RuntimeError("Training frame still contains missing features after preprocessing")

    return merged_df


def save_city_summary() -> None:
    summary_chunks = []
    chunks = pd.read_csv(AQI_DATA_PATH, chunksize=100000)
    for chunk in chunks:
        pollutants = [column for column in ["PM2_5_ugm3", "PM10_ugm3", "CO_ugm3", "NO2_ugm3"] if column in chunk.columns]
        if "City" not in chunk.columns or not pollutants:
            continue
        summary_chunks.append(chunk[["City", *pollutants]].groupby("City", as_index=False).mean())

    if not summary_chunks:
        raise RuntimeError("Unable to build city summary from AQI dataset")

    final_summary = pd.concat(summary_chunks, ignore_index=True).groupby("City", as_index=False).mean()
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    final_summary.to_json(DATA_DIR / "city_summary.json", orient="records")


def train_system_model():
    print("Loading traffic and AQI datasets...")
    merged_df = build_training_frame()

    features = ["Hour", "PM2_5_ugm3", "Is_Raining", "Temp_2m_C"]
    target = "Congestion"
    X = merged_df[features]
    y = merged_df[target]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("Training congestion model...")
    model = RandomForestRegressor(n_estimators=120, random_state=42)
    model.fit(X_train, y_train)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with MODEL_PATH.open("wb") as file:
        pickle.dump(model, file)

    save_city_summary()

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    merged_df.head(2000).to_csv(DATA_DIR / "processed_sample.csv", index=False)

    print(f"Model saved to {MODEL_PATH}")
    print(f"Validation score: {model.score(X_test, y_test):.4f}")


if __name__ == "__main__":
    train_system_model()
