const mongoose = require('mongoose');

const soilAnalysisSchema = new mongoose.Schema({
    farmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', required: true },
    date: { type: Date, required: true, default: Date.now },
    analysisType: { type: String, enum: ['satellite', 'manual', 'lab'], default: 'satellite' },
    // Manual/lab soil readings
    ph: { type: Number, min: 0, max: 14, default: null },
    nitrogen: { type: Number, default: null },    // kg/ha
    phosphorus: { type: Number, default: null },   // kg/ha
    potassium: { type: Number, default: null },    // kg/ha
    moisture: { type: Number, min: 0, max: 100, default: null },
    organicMatter: { type: Number, default: null }, // %
    temperature: { type: Number, default: null },   // °C
    // Satellite-derived soil metrics
    moistureIndex: { type: Number, default: null },   // NDMI
    baresoilIndex: { type: Number, default: null },   // BSI
    vegetationCover: { type: Number, min: 0, max: 100, default: null },
    estimatedMoisture: { type: Number, min: 0, max: 100, default: null },
    // Overall
    healthScore: { type: Number, min: 0, max: 100, default: null },
    recommendations: [{ type: String }],
    satelliteDataId: { type: mongoose.Schema.Types.ObjectId, ref: 'SatelliteData', default: null }
}, { timestamps: true });

soilAnalysisSchema.index({ farmId: 1, date: -1 });

module.exports = mongoose.model('SoilAnalysis', soilAnalysisSchema);
