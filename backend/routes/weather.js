const express = require('express');
const router = express.Router();
const Farm = require('../models/Farm');
const { protect } = require('../middleware/auth');
const { getCurrentWeather, getWeatherForecast, generateWeatherAdvisory } = require('../services/weatherService');
const { getCentroidFromPolygon } = require('../utils/geoUtils');

// GET /api/weather/:farmId/current — Current weather at farm
router.get('/:farmId/current', protect, async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.farmId);
        if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' });
        if (farm.userId.toString() !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Not authorized' });

        const centroid = getCentroidFromPolygon(farm.geometry.coordinates);
        const weather = await getCurrentWeather(centroid.lat, centroid.lng);
        const advisory = generateWeatherAdvisory(weather, farm.cropType);

        res.status(200).json({ success: true, data: { weather, advisory, location: centroid } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Weather fetch failed', error: error.message });
    }
});

// GET /api/weather/:farmId/forecast — 7-day forecast
router.get('/:farmId/forecast', protect, async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.farmId);
        if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' });
        if (farm.userId.toString() !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Not authorized' });

        const centroid = getCentroidFromPolygon(farm.geometry.coordinates);
        const forecast = await getWeatherForecast(centroid.lat, centroid.lng);

        res.status(200).json({ success: true, data: { ...forecast, location: centroid } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Forecast failed', error: error.message });
    }
});

module.exports = router;
