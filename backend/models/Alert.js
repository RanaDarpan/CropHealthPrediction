const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    farmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Farm',
        required: true
    },
    type: {
        type: String,
        enum: ['weather', 'pest', 'health', 'soil', 'system'],
        required: true
    },
    priority: {
        type: String,
        enum: ['urgent', 'warning', 'info'],
        default: 'info'
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    // Additional data related to alert
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    isRead: {
        type: Boolean,
        default: false
    },
    // For future SMS/Email notification tracking
    notificationSent: {
        email: {
            type: Boolean,
            default: false
        },
        sms: {
            type: Boolean,
            default: false
        },
        push: {
            type: Boolean,
            default: false
        }
    },
    expiresAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for efficient querying
alertSchema.index({ userId: 1, createdAt: -1 });
alertSchema.index({ farmId: 1, createdAt: -1 });
alertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

module.exports = mongoose.model('Alert', alertSchema);
