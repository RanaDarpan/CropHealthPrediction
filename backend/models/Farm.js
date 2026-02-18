const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Farm name is required'],
        trim: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // GeoJSON polygon for farm boundaries
    geometry: {
        type: {
            type: String,
            enum: ['Polygon'],
            required: true
        },
        coordinates: {
            type: [[[Number]]], // Array of arrays of coordinate pairs
            required: true
        }
    },
    // Calculated area in hectares
    area: {
        type: Number,
        default: 0
    },
    cropType: {
        type: String,
        enum: [
            'wheat', 'rice', 'corn', 'cotton', 'sugarcane',
            'soybean', 'potato', 'tomato', 'onion', 'chili',
            'maize', 'groundnut', 'vegetables', 'fruits',
            'other', ''
        ],
        default: ''
    },
    plantingDate: {
        type: Date,
        default: null
    },
    irrigationType: {
        type: String,
        enum: ['drip', 'sprinkler', 'flood', 'rainfed'],
        default: 'rainfed'
    },
    // Current health score (0-100)
    healthScore: {
        type: Number,
        min: 0,
        max: 100,
        default: null
    },
    // Embedded soil data
    soilData: {
        ph: {
            type: Number,
            min: 0,
            max: 14,
            default: null
        },
        nitrogen: { // N in kg/ha
            type: Number,
            default: null
        },
        phosphorus: { // P in kg/ha
            type: Number,
            default: null
        },
        potassium: { // K in kg/ha
            type: Number,
            default: null
        },
        moisture: { // Percentage
            type: Number,
            min: 0,
            max: 100,
            default: null
        },
        organicMatter: { // Percentage
            type: Number,
            default: null
        }
    },
    lastAnalysisDate: {
        type: Date,
        default: null
    },
    // Active alerts for this farm
    alerts: [{
        type: {
            type: String,
            enum: ['weather', 'pest', 'health', 'soil']
        },
        message: String,
        priority: {
            type: String,
            enum: ['urgent', 'warning', 'info']
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Create geospatial index for location-based queries
farmSchema.index({ geometry: '2dsphere' });

// Calculate centroid for weather API calls
farmSchema.methods.getCentroid = function () {
    const coords = this.geometry.coordinates[0];
    const lats = coords.map(c => c[1]);
    const lngs = coords.map(c => c[0]);

    return {
        lat: lats.reduce((a, b) => a + b) / lats.length,
        lng: lngs.reduce((a, b) => a + b) / lngs.length
    };
};

module.exports = mongoose.model('Farm', farmSchema);
