const express = require('express');
const router = express.Router();
const Farm = require('../models/Farm');
const SatelliteData = require('../models/SatelliteData');
const { protect } = require('../middleware/auth');
const { fetchBandData } = require('../services/geeProxy');
const { computeAllIndices } = require('../utils/sentinel2Bands');
const { getCentroidFromPolygon } = require('../utils/geoUtils');

// POST /api/satellite/fetch/:farmId — Fetch latest Sentinel-2 data
router.post('/fetch/:farmId', protect, async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.farmId);
        if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' });
        if (farm.userId.toString() !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Not authorized' });

        const centroid = getCentroidFromPolygon(farm.geometry.coordinates);
        const { dateFrom, dateTo } = req.body;
        const result = await fetchBandData(centroid.lat, centroid.lng, dateFrom, dateTo);

        const indices = computeAllIndices(result.bands);
        const satelliteData = await SatelliteData.create({
            farmId: farm._id,
            date: new Date(),
            location: centroid,
            bands: result.bands,
            indices,
            dataSource: result.metadata.source,
            processingLevel: result.metadata.processingLevel,
            cloudCoverPercentage: result.metadata.cloudCoverMax,
            metadata: result.metadata
        });

        res.status(200).json({ success: true, satelliteData, message: `Data fetched from ${result.metadata.source}` });
    } catch (error) {
        console.error('Satellite fetch error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch satellite data', error: error.message });
    }
});

// GET /api/satellite/history/:farmId — Historical satellite data
router.get('/history/:farmId', protect, async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.farmId);
        if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' });
        if (farm.userId.toString() !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Not authorized' });

        const limit = parseInt(req.query.limit) || 30;
        const data = await SatelliteData.find({ farmId: req.params.farmId })
            .sort({ date: -1 }).limit(limit);
        res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// GET /api/satellite/latest/:farmId — Most recent satellite data
router.get('/latest/:farmId', protect, async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.farmId);
        if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' });
        if (farm.userId.toString() !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Not authorized' });

        const data = await SatelliteData.findOne({ farmId: req.params.farmId }).sort({ date: -1 });
        if (!data) return res.status(404).json({ success: false, message: 'No satellite data found' });
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// POST /api/satellite/analyze/:farmId — Fetch + full analysis pipeline
router.post('/analyze/:farmId', protect, async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.farmId);
        if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' });
        if (farm.userId.toString() !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Not authorized' });

        const centroid = getCentroidFromPolygon(farm.geometry.coordinates);
        const result = await fetchBandData(centroid.lat, centroid.lng);
        const indices = computeAllIndices(result.bands);

        const satelliteData = await SatelliteData.create({
            farmId: farm._id, date: new Date(), location: centroid,
            bands: result.bands, indices,
            dataSource: result.metadata.source,
            processingLevel: result.metadata.processingLevel,
            metadata: result.metadata
        });

        // Run analysis engine
        const { analyzeCropHealth, analyzeSoil, assessPestRisk, generateAlerts } = require('../services/analysisEngine');
        const { getCurrentWeather } = require('../services/weatherService');

        const weather = await getCurrentWeather(centroid.lat, centroid.lng);
        const cropHealth = analyzeCropHealth(result.bands, weather, farm.cropType);
        const soilAnalysis = analyzeSoil(result.bands, farm.soilData);
        const pestRisk = assessPestRisk(cropHealth, weather, farm.cropType, req.body.cropStage || 'vegetative');
        const alerts = generateAlerts(farm._id, req.user.id, cropHealth);

        // Save alerts
        const Alert = require('../models/Alert');
        if (alerts.length > 0) await Alert.insertMany(alerts);

        // Update farm health score
        await Farm.findByIdAndUpdate(farm._id, { healthScore: cropHealth.healthScore, lastAnalysisDate: new Date() });

        res.status(200).json({
            success: true,
            analysis: { satelliteData, cropHealth, soilAnalysis, pestRisk, weather, alertsGenerated: alerts.length }
        });
    } catch (error) {
        console.error('Analysis pipeline error:', error);
        res.status(500).json({ success: false, message: 'Analysis failed', error: error.message });
    }
});

module.exports = router;
