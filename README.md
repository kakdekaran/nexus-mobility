# Nexus Mobility | Municipal Command Center

[![Production Status](https://img.shields.io/badge/Status-Live-emerald?style=for-the-badge&logo=vercel)](https://nexus-mobility-gray.vercel.app)
[![ML Performance](https://img.shields.io/badge/Model-Random_Forest-blueviolet?style=for-the-badge)](/backend/ml_model)
[![High Contrast](https://img.shields.io/badge/Visuals-Absolute_Black-black?style=for-the-badge)](/frontend/src/index.css)

Nexus Mobility is a premium, high-precision Smart Traffic & Mobility Analytics platform designed for municipal governance and urban planning. Built with a reactive **Absolute Black** tonal architecture, the command center provides real-time telemetry, predictive traffic insights, and environmental correlation analysis across primary metropolitan sectors.

---

## 🛡️ Core Capabilities

### ⚡ Metropolitan Terminal Grid
- **Recursive Sync Engine**: Real-time telemetry streaming from historical municipal datasets (AQI, Congestion, Volume).
- **Neural Mesh Tracking**: Visual correlation of traffic density across Mumbai, Delhi, Bengaluru, and Chennai sectors.
- **Operational Hub**: Unified command interface for municipal directives and emergency broadcasts.

### 🧠 Intelligence Engine
- **Predictive Analytics**: Integrated Random Forest regression model trained on metropolitan traffic patterns.
- **Environmental Correlation**: Real-time analysis of AQI (Air Quality Index) vs. traffic saturation.
- **Anomaly Detection**: Automated identification of critical bottlenecks and infrastructure alerts.

### 🎨 Absolute Black Design Language
- **High-Contrast Precision**: Reactive CSS variable architecture ensuring 100% legibility in both 'Light' and 'Dark' modes.
- **Glassmorphism HUD**: Premium translucent overlays for metropolitan metrics and telemetry panels.
- **Dynamic Grid Maps**: Interactive SVG infrastructure mapping with live pulsating nodes.

---

## 🛠️ Technical Architecture

### Frontend [Vite + React + TailwindCSS]
- **State Management**: Reactive React Context for global theme and session synchronization.
- **Animations**: Framer Motion for high-fidelity micro-interactions and HUD transitions.
- **Design System**: Atomic component architecture with semantic tonal tokens.

### Backend [FastAPI + Python]
- **Asynchronous Grid**: Highly performant ASGI backend for concurrent telemetry streaming.
- **Security**: JWT-based session management and hashed identity protocols.
- **ML Pipeline**: Scikit-Learn integration for real-time traffic index forecasting.

---

## 🚀 Deployment & Installation

### Prerequisites
- **Python**: 3.10+
- **Node.js**: 18+

### 1. Backend Provisioning
```bash
# Navigate to the core service
cd backend

# Synchronize dependencies
pip install -r requirements.txt

# Launch High-Frequency Server
uvicorn main:app --reload --port 8000
```

### 2. Frontend Launch
```bash
# Navigate to terminal interface
cd frontend

# Install node dependencies
npm install

# Launch Development Hub
npm run dev
```

---

## 📊 ML Model Training
To retrain the Traffic Predictor using updated metropolitan data:
```bash
python backend/ml_model/train.py
```
*Model artifacts are stored in `data/models/traffic_predictor_lite.pkl`.*

---

## 🌐 Production Grid
The system is optimized for automated deployment:
- **Frontend**: Managed via [Vercel](https://vercel.com)
- **Backend API**: Synchronized on [Render](https://render.com) using `render.yaml` blueprints.

---
**© 2026 Nexus Mobility Division | Smart City Infrastructure**
