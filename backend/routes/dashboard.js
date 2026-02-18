const express = require('express');
const router = express.Router();
const Farm = require('../models/Farm');
const CropHealth = require('../models/CropHealth');
const SatelliteData = require('../models/SatelliteData');
const PestRisk = require('../models/PestRisk');
const Alert = require('../models/Alert');
const SoilAnalysis = require('../models/SoilAnalysis');
const { protect } = require('../middleware/auth');
const { getCurrentWeather, generateWeatherAdvisory } = require('../services/weatherService');
const { getCentroidFromPolygon } = require('../utils/geoUtils');

// GET /api/dashboard — Aggregated dashboard for logged-in user
router.get('/', protect, async (req, res) => {
    try {
        // Get all active farms
        const farms = await Farm.find({ userId: req.user.id, isActive: true });

        // Get unread alerts count
        const unreadAlerts = await Alert.countDocuments({ userId: req.user.id, isRead: false });
        const recentAlerts = await Alert.find({ userId: req.user.id })
            .populate('farmId', 'name cropType')
            .sort({ createdAt: -1 }).limit(5);

        // Per-farm summaries
        const farmSummaries = await Promise.all(farms.map(async (farm) => {
            const [latestHealth, latestPest, latestSatellite, latestSoil] = await Promise.all([
                CropHealth.findOne({ farmId: farm._id }).sort({ date: -1 }),
                PestRisk.findOne({ farmId: farm._id }).sort({ date: -1 }),
                SatelliteData.findOne({ farmId: farm._id }).sort({ date: -1 }),
                SoilAnalysis.findOne({ farmId: farm._id }).sort({ date: -1 })
            ]);

            // Get weather for first farm only to save API calls
            let weather = null;
            try {
                const centroid = getCentroidFromPolygon(farm.geometry.coordinates);
                weather = await getCurrentWeather(centroid.lat, centroid.lng);
            } catch (e) { /* skip */ }

            return {
                farmId: farm._id,
                name: farm.name,
                cropType: farm.cropType,
                area: farm.area,
                healthScore: farm.healthScore,
                lastAnalysisDate: farm.lastAnalysisDate,
                latestNDVI: latestHealth?.ndviValue || latestSatellite?.indices?.ndvi || null,
                latestEVI: latestHealth?.eviValue || latestSatellite?.indices?.evi || null,
                healthStatus: latestHealth ? (
                    latestHealth.healthScore >= 75 ? 'healthy' :
                        latestHealth.healthScore >= 50 ? 'moderate' :
                            latestHealth.healthScore >= 25 ? 'poor' : 'critical'
                ) : 'no-data',
                pestRiskLevel: latestPest?.riskLevel || 'no-data',
                soilMoisture: latestSoil?.estimatedMoisture || farm.soilData?.moisture || null,
                weather: weather ? {
                    temperature: weather.temperature,
                    humidity: weather.humidity,
                    description: weather.description,
                    rainfall: weather.rainfall
                } : null
            };
        }));

        // Aggregate stats
        const healthScores = farmSummaries.filter(f => f.healthScore !== null).map(f => f.healthScore);
        const avgHealth = healthScores.length > 0
            ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
            : null;

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalFarms: farms.length,
                    averageHealthScore: avgHealth,
                    unreadAlerts,
                    farmsNeedingAttention: farmSummaries.filter(f => f.healthScore !== null && f.healthScore < 50).length
                },
                farms: farmSummaries,
                recentAlerts
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Dashboard fetch failed', error: error.message });
    }
});

module.exports = router;
