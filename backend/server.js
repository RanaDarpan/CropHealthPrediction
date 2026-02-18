const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// ─────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─────────────────────────────────────────────────
// MongoDB Connection
// ─────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agrisense';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });

mongoose.connection.on('error', err => {
    console.error('MongoDB error:', err.message);
});

// ─────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/farms', require('./routes/farms'));
app.use('/api/satellite', require('./routes/satellite'));
app.use('/api/crop-health', require('./routes/cropHealth'));
app.use('/api/soil-analysis', require('./routes/soilAnalysis'));
app.use('/api/pest-risk', require('./routes/pestRisk'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/ml', require('./routes/ml'));

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'AgriSense API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        services: {
            openWeather: !!(process.env.OPENWEATHER_API_KEY && process.env.OPENWEATHER_API_KEY !== 'your_openweather_api_key_here'),
            mlService: process.env.ML_SERVICE_URL || 'http://localhost:5001',
            googleEarthEngine: !!(process.env.GEE_SERVICE_ACCOUNT_EMAIL && process.env.GEE_SERVICE_ACCOUNT_EMAIL !== 'your_service_account@project.iam.gserviceaccount.com')
        }
    });
});

// API info
app.get('/api', (req, res) => {
    res.status(200).json({
        name: 'AgriSense API',
        version: '1.0.0',
        description: 'Smart Agriculture Platform with Sentinel-2 Satellite Data',
        endpoints: {
            auth: '/api/auth (register, login, me, update-profile)',
            farms: '/api/farms (CRUD operations)',
            satellite: '/api/satellite (fetch, history, latest, analyze)',
            cropHealth: '/api/crop-health (history, latest, analyze)',
            soilAnalysis: '/api/soil-analysis (history, manual, satellite)',
            pestRisk: '/api/pest-risk (history, latest, assess)',
            weather: '/api/weather (current, forecast)',
            alerts: '/api/alerts (list, read, delete)',
            dashboard: '/api/dashboard (aggregated stats)',
            ml: '/api/ml (predict, predict-polygon, model-info, health, gee-status)'
        }
    });
});

// ─────────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`
    });
});

// ─────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`\n🌾 AgriSense API Server`);
    console.log(`   Port:     ${PORT}`);
    console.log(`   Env:      ${process.env.NODE_ENV || 'development'}`);
    console.log(`   MongoDB:  ${MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@')}`);
    console.log(`   Sentinel: ${process.env.SENTINEL_HUB_CLIENT_ID ? '✅ Configured' : '⚠️  Synthetic mode'}`);
    console.log(`   Weather:  ${process.env.OPENWEATHER_API_KEY && process.env.OPENWEATHER_API_KEY !== 'your_openweather_api_key_here' ? '✅ Configured' : '⚠️  Synthetic mode'}`);
    console.log(`\n   API docs: http://localhost:${PORT}/api\n`);
});

module.exports = app;
