import os
import sys
import pickle
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR / "backend"))

from utils.locations import get_cities, get_locations_for_city, get_location_base_volume, encode_city, encode_location

DATA_DIR = BASE_DIR / "data"
MODEL_DIR = DATA_DIR / "models"
MODEL_PATH = MODEL_DIR / "traffic_predictor_lite.pkl"

def generate_synthetic_traffic_data(num_samples=50000):
    """
    Generate synthetic traffic data based on realistic urban patterns.
    New Features: City, Location, VehicleCount
    """
    np.random.seed(42)
    
    cities = get_cities()
    
    # Pre-calculate lists
    city_list = []
    location_list = []
    
    for _ in range(num_samples):
        c = np.random.choice(cities)
        locs = get_locations_for_city(c)
        l = np.random.choice(locs)
        city_list.append(c)
        location_list.append(l)
        
    hours = np.random.randint(0, 24, num_samples)
    days = np.random.randint(0, 7, num_samples)
    months = np.random.randint(1, 13, num_samples)
    is_weekend = (days >= 5).astype(int)
    
    # Weather: 0: Clear, 1: Rainy, 2: Foggy, 3: Stormy
    weather = np.random.choice([0, 1, 2, 3], size=num_samples, p=[0.7, 0.15, 0.1, 0.05])
    is_holiday = np.random.choice([0, 1], size=num_samples, p=[0.95, 0.05])
    is_event = np.random.choice([0, 1], size=num_samples, p=[0.9, 0.1])
    
    vehicle_counts = []
    congestions = []
    
    encoded_cities = []
    encoded_locations = []
    
    for i in range(num_samples):
        c = city_list[i]
        loc = location_list[i]
        
        encoded_cities.append(encode_city(c))
        encoded_locations.append(encode_location(c, loc))
        
        h = hours[i]
        d = days[i]
        m = months[i]
        iw = is_weekend[i]
        w = weather[i]
        ih = is_holiday[i]
        ie = is_event[i]
        
        base_volume = get_location_base_volume(c, loc)
        
        # Multiplier logic based on time
        multiplier = 0.3 # Base off-peak (night)
        
        if 8 <= h <= 10:
            multiplier = 0.9 if h == 9 else 0.75
        elif 17 <= h <= 20:
            multiplier = 0.95 if h == 18 else 0.8
        elif 11 <= h <= 16:
            multiplier = 0.6
        elif 6 <= h <= 7:
            multiplier = 0.5
        elif 21 <= h <= 23:
            multiplier = 0.4
            
        # Weekend adjustment
        if iw:
            multiplier *= 0.6 # Less overall traffic
            if 11 <= h <= 20: # Weekend afternoon/evening rush
                multiplier *= 1.4 # bump it back up a bit
        else:
            if d == 4: # Friday heavier
                multiplier *= 1.1
                
        # Weather impact (slows traffic -> higher density/congestion, but maybe fewer cars?)
        # Let's say bad weather reduces total cars slightly but increases congestion.
        # So we predict vehicle count and congestion separately.
        # Actually, let's keep things simple: we predict VehicleCount and then map it to Congestion.
        # Bad weather reduces total cars slightly
        if w == 1: # Rainy
            multiplier *= 0.9
        elif w == 2: # Foggy
            multiplier *= 0.85
        elif w == 3: # Stormy
            multiplier *= 0.6
            
        # Holiday impact
        if ih:
            multiplier *= 0.5
            
        # Event impact
        if ie:
            multiplier *= 1.3
                
        # Monthly/Seasonal adjustment
        if m in [10, 11, 12]: # Festival season
            multiplier *= 1.15
        elif m in [5, 6]: # Summer/Monsoon
            multiplier *= 0.9
            
        # Random noise
        noise_factor = np.random.normal(1.0, 0.05)
        
        final_vehicles = int(base_volume * multiplier * noise_factor)
        final_vehicles = max(50, final_vehicles) # Minimum cars
        
        # Congestion calculation (simplified rule)
        # Congestion is how close vehicle count is to max capacity. Let max capacity = base_volume * 1.2
        max_capacity = base_volume * 1.2
        
        # Weather adds artificial congestion even with fewer cars
        weather_congestion_penalty = 0
        if w == 1: weather_congestion_penalty = 15
        elif w == 2: weather_congestion_penalty = 10
        elif w == 3: weather_congestion_penalty = 25
        
        congestion = (final_vehicles / max_capacity) * 100 + weather_congestion_penalty
        
        # Cap congestion
        congestion = round(min(max(congestion, 5.0), 100.0), 1)
        
        vehicle_counts.append(final_vehicles)
        congestions.append(congestion)
        
    df = pd.DataFrame({
        'City': encoded_cities,
        'Location': encoded_locations,
        'Hour': hours,
        'DayOfWeek': days,
        'Month': months,
        'IsWeekend': is_weekend,
        'Weather': weather,
        'IsHoliday': is_holiday,
        'IsEvent': is_event,
        'VehicleCount': vehicle_counts,
        'Congestion': congestions
    })
    
    return df

def train_system_model():
    print("Generating expanded synthetic traffic dataset with Location and Vehicle Count...")
    df = generate_synthetic_traffic_data()

    # We will predict VehicleCount and Congestion together (multi-output) or just Congestion
    # Let's predict both!
    features = ["City", "Location", "Hour", "DayOfWeek", "Month", "IsWeekend", "Weather", "IsHoliday", "IsEvent"]
    targets = ["VehicleCount", "Congestion"]
    
    X = df[features]
    y = df[targets]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("Training Enhanced Random Forest model (Multi-Output)...")
    model = RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42)
    model.fit(X_train, y_train)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with MODEL_PATH.open("wb") as file:
        pickle.dump(model, file)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    df.head(1000).to_csv(DATA_DIR / "traffic_training_sample.csv", index=False)

    print(f"✅ Model saved to {MODEL_PATH}")
    score = model.score(X_test, y_test)
    print(f"Validation R2 score: {score:.4f}")

if __name__ == "__main__":
    train_system_model()
