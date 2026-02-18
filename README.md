# AgriSense - Smart Agriculture Platform

A comprehensive smart agriculture platform with crop health monitoring, soil analysis, pest risk prediction, and multi-farm management capabilities.

## 🌾 Features

- **Crop Health Monitoring**: Real-time NDVI/EVI analysis using satellite imagery and ML models
- **Soil Analysis**: pH, NPK levels, moisture tracking with intelligent recommendations
- **Pest Risk Prediction**: Time-series forecasting for pest outbreaks
- **Multi-Farm Management**: Manage multiple farms with interactive map interface
- **Weather Integration**: 7-day weather forecasts for farm locations
- **Real-time Alerts**: Notifications for critical farm conditions
- **User-Friendly Dashboard**: Intuitive interface with green farming theme

## 🛠️ Tech Stack

### Backend
- **Express.js**: RESTful API server
- **MongoDB**: NoSQL database with GeoJSON support
- **JWT**: Authentication and authorization
- **Mongoose**: ODM for MongoDB

### Frontend
- **React.js**: UI framework
- **Next.js**: React Framework for production
- **Leaflet**: Interactive maps for farm management
- **Recharts**: Data visualization
- **Framer Motion**: Smooth animations
- **Tailwind CSS**: Styling with custom green theme

### ML Service
- **Python FastAPI**: High-performance ML API
- **XGBoost**: Advanced gradient boosting for crop health
- **Scikit-learn**: Predictive analytics
- **Google Earth Engine**: Satellite data processing

## 📁 Project Structure

```
AgriSense/
├── backend/              # Node.js/Express API server
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic & integrations
│   └── server.js        # Entry point
├── frontend/            # Next.js application
│   ├── app/             # App router pages
│   ├── components/      # Reusable UI components
│   └── lib/             # Utilities & API clients
└── ml-service/          # Python FastAPI ML Service
    ├── models/          # Trained ML models
    ├── gee_service.py   # Google Earth Engine integration
    └── app.py           # FastAPI entry point
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- MongoDB (Local or Atlas)
- Google Earth Engine Account (for satellite data)

### 1. Backend Setup

```bash
cd backend
npm install

# Create .env file from example
cp .env.example .env

# Configure .env with your credentials:
# MONGODB_URI=mongodb://localhost:27017/agrisense
# JWT_SECRET=your_secure_secret
# OPENWEATHER_API_KEY=your_key

# Start server
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install

# Create .env.local file
cp .env.local.example .env.local
# Or manually create .env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:5000/api
# NEXT_PUBLIC_ML_API_URL=http://localhost:5001

# Start development server
npm run dev
```

### 3. ML Service Setup

```bash
cd ml-service
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
# source venv/bin/activate

pip install -r requirements.txt

# Start FastAPI server
python app.py
```

## 🔑 Configuration

### Google Earth Engine
To enable satellite data features:
1. Sign up for Google Earth Engine.
2. Create a service account and download the JSON key.
3. Place the key as `gee-service-account.json` in the `ml-service` directory (this file is git-ignored).

### OpenWeather API
1. Get a free API key from [OpenWeatherMap](https://openweathermap.org/api).
2. Add it to `backend/.env`.

## 🧪 Testing

### Backend Health Check
```bash
curl http://localhost:5000/api/health
```

### ML Service Health Check
```bash
curl http://localhost:5001/health
```

## 📄 License

MIT License

## 👥 Contributing

Contributions are welcome! Please open an issue or submit a pull request.
