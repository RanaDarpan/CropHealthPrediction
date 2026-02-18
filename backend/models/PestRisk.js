const mongoose = require('mongoose');

const pestRiskSchema = new mongoose.Schema({
    farmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Farm',
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    // Risk level assessment
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: true
    },
    // Confidence score (0-100)
    confidence: {
        type: Number,
        min: 0,
        max: 100,
        default: 70
    },
    // Predicted pest types
    pestTypes: [{
        name: {
            type: String,
            required: true
        },
        probability: {
            type: Number,
            min: 0,
            max: 100
        },
        description: String
    }],
    // Weather factors contributing to risk
    weatherFactors: {
        temperature: Number,
        humidity: Number,
        rainfall: Number,
        windSpeed: Number
    },
    // Crop growth stage
    cropStage: {
        type: String,
        enum: ['seedling', 'vegetative', 'flowering', 'fruiting', 'maturity']
    },
    // Prevention tips
    preventionTips: [{
        type: String
    }],
    // Treatment recommendations
    treatments: [{
        method: {
            type: String,
            enum: ['chemical', 'organic', 'biological', 'cultural']
        },
        description: String,
        timing: String
    }],
    // Valid until date
    validUntil: {
        type: Date,
        required: true
    },
    // Historical pest occurrence in this farm
    historicalOccurrence: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for efficient querying
pestRiskSchema.index({ farmId: 1, date: -1 });
pestRiskSchema.index({ validUntil: 1 });

module.exports = mongoose.model('PestRisk', pestRiskSchema);
