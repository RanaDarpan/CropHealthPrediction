const express = require('express');
const router = express.Router();
const axios = require('axios');
const Farm = require('../models/Farm');
const { protect } = require('../middleware/auth');
const { fetchBandData } = require('../services/geeProxy');
const { getCentroidFromPolygon } = require('../utils/geoUtils');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

// ─────────────────────────────────────────────────
// POST /api/ml/predict/:farmId — Predict using existing farm
// ─────────────────────────────────────────────────
router.post('/predict/:farmId', protect, async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.farmId);
        if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' });
        if (farm.userId.toString() !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Not authorized' });

        // 1. Get farm centroid
        const centroid = getCentroidFromPolygon(farm.geometry.coordinates);

        // 2. Fetch Sentinel-2 band data (real or synthetic)
        const satResult = await fetchBandData(centroid.lat, centroid.lng);
        const bands = satResult.bands;

        // 3. Build soil data from farm's stored soil info
        const soil = {
            clay: farm.soilData?.clay || 380,
            nitrogen: farm.soilData?.nitrogen || 1800,
            ph: farm.soilData?.ph ? farm.soilData.ph * 10 : 71,
            sand: farm.soilData?.sand || 300,
            soc: farm.soilData?.soc || 160
        };

        // 4. Call ML service
        const mlPayload = {
            bands: {
                B2: bands.B02 || bands.B2 || 0,
                B3: bands.B03 || bands.B3 || 0,
                B4: bands.B04 || bands.B4 || 0,
                B5: bands.B05 || bands.B5 || 0,
                B6: bands.B06 || bands.B6 || 0,
                B7: bands.B07 || bands.B7 || 0,
                B8: bands.B08 || bands.B8 || 0,
                B8A: bands.B8A || 0,
                B11: bands.B11 || 0,
                B12: bands.B12 || 0
            },
            soil,
            month: new Date().getMonth() + 1
        };

        const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, mlPayload, {
            timeout: 10000
        });

        res.status(200).json({
            success: true,
            data: {
                prediction: mlResponse.data,
                satellite: {
                    source: satResult.metadata?.source || 'synthetic',
                    bands: mlPayload.bands,
                    timestamp: new Date().toISOString()
                },
                farm: {
                    id: farm._id,
                    name: farm.name,
                    cropType: farm.cropType,
                    centroid
                }
            }
        });
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'ML service is not running. Start it with: cd ml-service && python app.py'
            });
        }
        console.error('ML prediction error:', error.message);
        res.status(500).json({ success: false, message: 'Prediction failed', error: error.message });
    }
});

// ─────────────────────────────────────────────────
// POST /api/ml/predict-polygon — Predict from raw polygon (GEE)
// Accepts GeoJSON polygon coordinates directly (no farm needed)
// ─────────────────────────────────────────────────
router.post('/predict-polygon', protect, async (req, res) => {
    try {
        const { polygon, soil, dateFrom, dateTo } = req.body;

        if (!polygon || !Array.isArray(polygon) || polygon.length < 4) {
            return res.status(400).json({
                success: false,
                message: 'Polygon must be an array of at least 4 [lng, lat] coordinates (closed polygon)'
            });
        }

        // Call ML service's /predict/polygon endpoint (uses GEE internally)
        const mlPayload = {
            polygon,
            soil: soil || null,
            date_from: dateFrom || null,
            date_to: dateTo || null
        };

        const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict/polygon`, mlPayload, {
            timeout: 30000  // GEE calls can take longer
        });

        res.status(200).json({
            success: true,
            data: mlResponse.data
        });
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'ML service is not running. Start it with: cd ml-service && python app.py'
            });
        }
        const errMsg = error.response?.data?.detail || error.message;
        console.error('Polygon prediction error:', errMsg);
        res.status(500).json({ success: false, message: 'Prediction failed', error: errMsg });
    }
});

// ─────────────────────────────────────────────────
// GET /api/ml/health — Check ML service status
// ─────────────────────────────────────────────────
router.get('/health', async (req, res) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 5000 });
        res.status(200).json({ success: true, mlService: response.data });
    } catch (error) {
        res.status(503).json({
            success: false,
            message: 'ML service unavailable',
            hint: 'Start with: cd ml-service && python app.py'
        });
    }
});

// ─────────────────────────────────────────────────
// GET /api/ml/model-info — Get model metadata
// ─────────────────────────────────────────────────
router.get('/model-info', protect, async (req, res) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/model/info`, { timeout: 5000 });
        res.status(200).json({ success: true, data: response.data });
    } catch (error) {
        res.status(503).json({ success: false, message: 'ML service unavailable' });
    }
});

// ─────────────────────────────────────────────────
// GET /api/ml/gee-status — Check GEE connection
// ─────────────────────────────────────────────────
router.get('/gee-status', async (req, res) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/gee/status`, { timeout: 5000 });
        res.status(200).json({ success: true, gee: response.data });
    } catch (error) {
        res.status(503).json({ success: false, message: 'ML service unavailable' });
    }
});

module.exports = router;
