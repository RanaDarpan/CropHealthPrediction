const mongoose = require('mongoose');

const cropHealthSchema = new mongoose.Schema({
    farmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Farm',
        required: true
    },
    satelliteDataId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SatelliteData',
        default: null
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    // Vegetation indices
    ndviValue: {
        type: Number,
        min: -1,
        max: 1,
        required: true
    },
    eviValue: {
        type: Number,
        min: -1,
        max: 10,
        default: null
    },
    saviValue: {
        type: Number,
        min: -1,
        max: 10,
        default: null
    },
    ndwiValue: {
        type: Number,
        min: -1,
        max: 1,
        default: null
    },
    ndmiValue: {
        type: Number,
        min: -1,
        max: 1,
        default: null
    },
    growthStage: {
        type: String,
        enum: ['seedling', 'vegetative', 'flowering', 'fruiting', 'maturity'],
        default: null
    },
    // Overall health score (0-100)
    healthScore: {
        type: Number,
        min: 0,
        max: 100,
        required: true
    },
    // Problem zones as GeoJSON
    problemZones: [{
        type: {
            type: String,
            enum: ['Point', 'Polygon'],
            default: 'Polygon'
        },
        coordinates: {
            type: mongoose.Schema.Types.Mixed
        },
        severity: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium'
        },
        issue: {
            type: String,
            enum: ['low_ndvi', 'water_stress', 'nutrient_deficiency', 'pest_damage']
        }
    }],
    // AI-generated recommendations
    recommendations: [{
        type: String
    }],
    // URL to satellite image (if available)
    satelliteImageUrl: {
        type: String,
        default: null
    },
    // Weather conditions at time of analysis
    weatherConditions: {
        temperature: Number,
        humidity: Number,
        rainfall: Number
    },
    // Source of data
    dataSource: {
        type: String,
        enum: ['sentinel-2', 'landsat', 'synthetic', 'manual', 'google-earth-engine'],
        default: 'synthetic'
    }
}, {
    timestamps: true
});

// Index for efficient querying
cropHealthSchema.index({ farmId: 1, date: -1 });

module.exports = mongoose.model('CropHealth', cropHealthSchema);
