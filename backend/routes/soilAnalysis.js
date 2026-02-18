const express = require('express');
const router = express.Router();
const Farm = require('../models/Farm');
const SoilAnalysis = require('../models/SoilAnalysis');
const SatelliteData = require('../models/SatelliteData');
const { protect } = require('../middleware/auth');
const { fetchBandData } = require('../services/geeProxy');
const { analyzeSoil } = require('../services/analysisEngine');
const { computeAllIndices } = require('../utils/sentinel2Bands');
const { getCentroidFromPolygon } = require('../utils/geoUtils');
const { body, validationResult } = require('express-validator');

// GET /api/soil-analysis/:farmId — Soil analysis history
router.get('/:farmId', protect, async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.farmId);
        if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' });
        if (farm.userId.toString() !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Not authorized' });

        const limit = parseInt(req.query.limit) || 20;
        const data = await SoilAnalysis.find({ farmId: req.params.farmId }).sort({ date: -1 }).limit(limit);
        res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// POST /api/soil-analysis/:farmId — Submit manual soil data
router.post('/:farmId', protect, [
    body('ph').optional().isFloat({ min: 0, max: 14 }),
    body('nitrogen').optional().isNumeric(),
    body('phosphorus').optional().isNumeric(),
    body('potassium').optional().isNumeric(),
    body('moisture').optional().isFloat({ min: 0, max: 100 }),
    body('organicMatter').optional().isNumeric()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        const farm = await Farm.findById(req.params.farmId);
        if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' });
        if (farm.userId.toString() !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Not authorized' });

        const { ph, nitrogen, phosphorus, potassium, moisture, organicMatter, temperature } = req.body;
        const soilData = { ph, nitrogen, phosphorus, potassium, moisture, organicMatter, temperature };

        // Run analysis with manual data
        const analysis = analyzeSoil({}, soilData);

        const record = await SoilAnalysis.create({
            farmId: farm._id, date: new Date(), analysisType: 'manual',
            ...soilData, healthScore: analysis.healthScore, recommendations: analysis.recommendations
        });

        // Update farm soil data
        await Farm.findByIdAndUpdate(farm._id, { soilData });

        res.status(201).json({ success: true, data: record, analysis });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// POST /api/soil-analysis/:farmId/satellite — Satellite-based soil analysis
router.post('/:farmId/satellite', protect, async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.farmId);
        if (!farm) return res.status(404).json({ success: false, message: 'Farm not found' });
        if (farm.userId.toString() !== req.user.id && req.user.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Not authorized' });

        const centroid = getCentroidFromPolygon(farm.geometry.coordinates);
        const satResult = await fetchBandData(centroid.lat, centroid.lng);
        const indices = computeAllIndices(satResult.bands);

        const satData = await SatelliteData.create({
            farmId: farm._id, date: new Date(), location: centroid,
            bands: satResult.bands, indices,
            dataSource: satResult.metadata.source, metadata: satResult.metadata
        });

        const analysis = analyzeSoil(satResult.bands, farm.soilData || {});

        const record = await SoilAnalysis.create({
            farmId: farm._id, date: new Date(), analysisType: 'satellite',
            satelliteDataId: satData._id,
            moistureIndex: analysis.soilMetrics.moistureIndex,
            baresoilIndex: analysis.soilMetrics.baresoilIndex,
            vegetationCover: analysis.soilMetrics.vegetationCover,
            estimatedMoisture: analysis.soilMetrics.estimatedMoisture,
            healthScore: analysis.healthScore, recommendations: analysis.recommendations
        });

        res.status(200).json({ success: true, data: record, analysis });
    } catch (error) {
        console.error('Satellite soil analysis error:', error);
        res.status(500).json({ success: false, message: 'Analysis failed', error: error.message });
    }
});

module.exports = router;
