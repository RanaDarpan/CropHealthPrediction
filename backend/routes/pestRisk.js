const express = require('express');
const router = express.Router();
const Farm = require('../models/Farm');
const PestRisk = require('../models/PestRisk');
const { protect } = require('../middleware/auth');
const { fetchBandData } = require('../services/geeProxy');
const { analyzeCropHealth, assessPestRisk, generateAlerts } = require('../services/analysisEngine');
const { getCurrentWeather } = require('../services/weatherService');
const { getCentroidFromPolygon } = require('../utils/geoUtils');

// GET /api/pest-risk/:farmId — Pest risk history
router.get('/:farmId', protect, async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.farmId);
        if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' });
        if (farm.userId.toString() !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Not authorized' });

        const limit = parseInt(req.query.limit) || 20;
        const data = await PestRisk.find({ farmId: req.params.farmId }).sort({ date: -1 }).limit(limit);
        res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// GET /api/pest-risk/:farmId/latest — Latest pest risk
router.get('/:farmId/latest', protect, async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.farmId);
        if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' });
        if (farm.userId.toString() !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Not authorized' });

        const latest = await PestRisk.findOne({ farmId: req.params.farmId }).sort({ date: -1 });
        if (!latest) return res.status(404).json({ success: false, message: 'No pest risk data' });
        res.status(200).json({ success: true, data: latest });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// POST /api/pest-risk/:farmId/assess — Run pest risk assessment
router.post('/:farmId/assess', protect, async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.farmId);
        if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' });
        if (farm.userId.toString() !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Not authorized' });

        const centroid = getCentroidFromPolygon(farm.geometry.coordinates);
        const satResult = await fetchBandData(centroid.lat, centroid.lng);
        const weather = await getCurrentWeather(centroid.lat, centroid.lng);
        const healthData = analyzeCropHealth(satResult.bands, weather, farm.cropType);
        const cropStage = req.body.cropStage || 'vegetative';
        const assessment = assessPestRisk(healthData, weather, farm.cropType, cropStage);

        const pestRisk = await PestRisk.create({
            farmId: farm._id, date: new Date(),
            riskLevel: assessment.riskLevel,
            confidence: assessment.confidence,
            pestTypes: assessment.pestTypes,
            weatherFactors: {
                temperature: weather.temperature, humidity: weather.humidity,
                rainfall: weather.rainfall, windSpeed: weather.windSpeed
            },
            cropStage, preventionTips: assessment.preventionTips,
            treatments: assessment.treatments,
            validUntil: assessment.validUntil,
            historicalOccurrence: false
        });

        // Generate alerts if high risk
        if (assessment.riskLevel === 'high') {
            const Alert = require('../models/Alert');
            const alerts = [{
                farmId: farm._id, userId: req.user.id,
                type: 'pest', priority: 'urgent',
                title: 'High Pest Risk Alert',
                message: `High pest risk (${assessment.riskScore}/100) for ${farm.cropType}. ${assessment.pestTypes[0]?.name || 'Pests'} detected with ${assessment.pestTypes[0]?.probability || 0}% probability.`,
                expiresAt: assessment.validUntil
            }];
            await Alert.insertMany(alerts);
        }

        res.status(200).json({ success: true, data: pestRisk, assessment });
    } catch (error) {
        console.error('Pest risk error:', error);
        res.status(500).json({ success: false, message: 'Assessment failed', error: error.message });
    }
});

module.exports = router;
