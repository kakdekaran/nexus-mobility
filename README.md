# Nexus Mobility

Smart Traffic & Mobility Analytics platform with role-based operations, live city dashboards, congestion prediction, and pollution-aware batch forecasting.

## Current Features

- JWT-authenticated roles: **Admin**, **Analyst**, **User**
- Single traffic prediction by city + location
- Bulk CSV prediction (`/api/predictions/upload-csv`)
- Optional CSV enhancement fields:
  - `vehicle_count`
  - `pm2_5_ugm3`, `pm10_ugm3`, `co_ugm3`, `no2_ugm3`
- Per-row outputs include:
  - `congestion`, `vehicle_count`
  - `pollution_index`, `pollution_status`
  - predicted pollution metrics (PM2.5, PM10, CO, NO2)
- City-wise summary in batch insights
- Admin/Analyst uploads are published for User panel consumption
- Pollution Insights page available at `/pollution`

## Tech Stack

- **Frontend:** React + Vite + TailwindCSS
- **Backend:** FastAPI + Gunicorn/Uvicorn
- **ML:** Scikit-learn model with deterministic fallback
- **Storage:** JSON-backed local data store (`data/db.json`)

## Local Setup

### 1. Backend

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend default API base:
- Local: `http://127.0.0.1:8000/api`
- Production: `https://nexus-mobility-backend.onrender.com/api`

## CSV Format for Batch Prediction

Required columns:

- `date`
- `time`
- `city`
- `location`

Optional columns:

- `weather`
- `is_holiday`
- `is_event`
- `vehicle_count`
- `pm2_5_ugm3`
- `pm10_ugm3`
- `co_ugm3`
- `no2_ugm3`

## Deployment

Render start command:

```bash
gunicorn backend.main:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

Configured in `render.yaml`.
