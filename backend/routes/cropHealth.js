const express = require('express');
const router = express.Router();
const Farm = require('../models/Farm');
const CropHealth = require('../models/CropHealth');
const SatelliteData = require('../models/SatelliteData');
const { protect } = require('../middleware/auth');
const { fetchBandData } = require('../services/geeProxy');
const { analyzeCropHealth } = require('../services/analysisEngine');
const { getCurrentWeather } = require('../services/weatherService');
const { computeAllIndices } = require('../utils/sentinel2Bands');
const { getCentroidFromPolygon } = require('../utils/geoUtils');

// GET /api/crop-health/:farmId — Crop health history
router.get('/:farmId', protect, async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.farmId);
        if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' });
        if (farm.userId.toString() !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Not authorized' });

        const limit = parseInt(req.query.limit) || 20;
        const history = await CropHealth.find({ farmId: req.params.farmId }).sort({ date: -1 }).limit(limit);
        res.status(200).json({ success: true, count: history.length, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// GET /api/crop-health/:farmId/latest — Latest crop health
router.get('/:farmId/latest', protect, async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.farmId);
        if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' });
        if (farm.userId.toString() !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Not authorized' });

        const latest = await CropHealth.findOne({ farmId: req.params.farmId }).sort({ date: -1 });
        if (!latest) return res.status(404).json({ success: false, message: 'No health data found' });
        res.status(200).json({ success: true, data: latest });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// POST /api/crop-health/:farmId/analyze — Run crop health analysis
router.post('/:farmId/analyze', protect, async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.farmId);
        if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' });
        if (farm.userId.toString() !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Not authorized' });

        const centroid = getCentroidFromPolygon(farm.geometry.coordinates);
        const satResult = await fetchBandData(centroid.lat, centroid.lng);
        const indices = computeAllIndices(satResult.bands);
        const weather = await getCurrentWeather(centroid.lat, centroid.lng);
        const analysis = analyzeCropHealth(satResult.bands, weather, farm.cropType);

        // Store satellite data
        const satData = await SatelliteData.create({
            farmId: farm._id, date: new Date(), location: centroid,
            bands: satResult.bands, indices,
            dataSource: satResult.metadata.source, metadata: satResult.metadata
        });

        // Store crop health record
        const cropHealth = await CropHealth.create({
            farmId: farm._id, satelliteDataId: satData._id, date: new Date(),
            ndviValue: indices.ndvi, eviValue: indices.evi,
            saviValue: indices.savi, ndwiValue: indices.ndwi, ndmiValue: indices.ndmi,
            healthScore: analysis.healthScore,
            growthStage: req.body.cropStage || null,
            problemZones: analysis.problems.map(p => ({ severity: p.severity, issue: p.type })),
            recommendations: analysis.recommendations,
            weatherConditions: { temperature: weather.temperature, humidity: weather.humidity, rainfall: weather.rainfall },
            dataSource: satResult.metadata.source
        });

        await Farm.findByIdAndUpdate(farm._id, { healthScore: analysis.healthScore, lastAnalysisDate: new Date() });

        res.status(200).json({
            success: true,
            data: { cropHealth, analysis: { status: analysis.status, indices, problems: analysis.problems, recommendations: analysis.recommendations } }
        });
    } catch (error) {
        console.error('Crop health analysis error:', error);
        res.status(500).json({ success: false, message: 'Analysis failed', error: error.message });
    }
});

module.exports = router;
