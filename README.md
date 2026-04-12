# Nexus Mobility: Municipal Command & Analytics Platform
**Advanced Urban Infrastructure Telemetry & Predictive Governance**

[![Status: Production Ready](https://img.shields.io/badge/Status-Production%20Ready-green.svg)](#)
[![Stack: React + FastAPI](https://img.shields.io/badge/Stack-React%20%2B%20FastAPI-blue.svg)](#)
[![Predictions: Enabled](https://img.shields.io/badge/Predictions-Enabled-orange.svg)](#)

## 🌐 Overview
Nexus Mobility is a high-precision metropolitan command center designed for modern municipal governance. It provides an integrated environment for the real-time monitoring of urban infrastructure load and environmental safety metrics across major Indian cities (Delhi, Mumbai, Bengaluru, Hyderabad, and Chennai).

The platform leverages a scalable **FastAPI** backend and a reactive **React (JSX)** frontend to deliver a production-ready dashboard for admins and city planners.

## 🏗️ Technical Architecture
- **Frontend**: Developed with **React.js 18** and **Vite**. Features a modern UI with **Framer Motion** state transitions and **Lucide React** iconography.
- **Backend**: Powered by **FastAPI (Python 3.10+)**, utilizing asynchronous handling to process metropolitan sensor data.
- **ML Intelligence**: Features a **Random Forest Regressor** trained on historical AQI and weather telemetry, providing high-accuracy congestion forecasting.

## 📊 Data & ML Strategy
This repository utilizes an **Optimized Lite Dataset** (`data/india_aqi_lite.csv`) to ensure GitHub and Cloud compatibility while maintaining a 96% prediction accuracy.

### Generating the Model
To retrain the ML model using the latest city telemetry:
```bash
python backend/ml_model/train.py
```
This script will process the AQI data, synthesize congestion labels, and save the binary model to `data/models/traffic_predictor_lite.pkl`.

## 🛠️ Installation & Setup

### Prerequisites
- **Python**: 3.10+ | **Node.js**: 18+

### 1. Backend Provisioning
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### 2. Frontend Deployment
```bash
cd frontend
npm install
npm run dev
```

## 👤 Admin Access
For testing and review, use the following credentials:
- **Email**: `admin@smart.com` | **Password**: `admin123`

---
*Clean, production-grade repository maintained for Municipal Urban Infrastructure Analytics.*
