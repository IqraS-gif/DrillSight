# DrillSight

> **Real-Time Oil Well Drilling Risk Intelligence & Physics-Informed ML Monitoring System**

DrillSight is an enterprise-grade drilling risk intelligence platform that combines Physics-Informed Neural Operators (PINO), snapshot classification, dynamic time warping (DTW) well pattern matching, and Cox proportional hazards survival analysis into a modern industrial AI dashboard.

---

## 🚀 Key Features

- **Physics-Guided Risk Engine**: Real-time evaluation of differential sticking, mechanical stuck pipe, influx/kick severity, lost circulation, and stick-slip vibrations.
- **Dynamic Risk Gauge**: Smooth SVG gauge visualization with real-time radial ticks, pointer needle, and risk severity status badges.
- **Risk Breakdown by Type**: Categorized hazard cards (Stuck Pipe, Excessive Vibration, Lost Circulation, Kick/Influx) with active dominant hazard indicators.
- **Time to Incident Prediction**: High-priority metric card with live survival countdown and circular timer gauge.
- **Geologically & Geographically Similar Wells**: DTW-matched historical offset well incidents across North Sea formations.
- **Industrial Anomaly Alerts**: Real-time emergency stop and warning beacon system with industrial audio alarms and operator acknowledgement.
- **Interactive Parameter Knobs**: Live controls for hole depth, weight on bit (WOB), rate of penetration (ROP), surface torque, hookload, mud density, standpipe pressure (SPP), shock peak, and gas levels.

---

## 🏗️ Architecture & Tech Stack

- **Frontend**: React 19, Vite, Lucide Icons, Pure CSS3 Design System with modern enterprise industrial aesthetics.
- **Backend**: FastAPI, Uvicorn, Python.
- **ML / AI Engine**: PyTorch (PINO physics operator), XGBoost snapshot classifier, fastdtw offset matching, Isolation Forest telemetry anomaly detection, Cox PH survival analysis.

---

## 🛠️ Quickstart

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.
