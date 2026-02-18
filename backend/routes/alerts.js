const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');

// GET /api/alerts — Get all alerts for logged-in user
router.get('/', protect, async (req, res) => {
    try {
        const { type, priority, unreadOnly } = req.query;
        const filter = { userId: req.user.id };
        if (type) filter.type = type;
        if (priority) filter.priority = priority;
        if (unreadOnly === 'true') filter.isRead = false;

        const alerts = await Alert.find(filter)
            .populate('farmId', 'name cropType')
            .sort({ createdAt: -1 })
            .limit(parseInt(req.query.limit) || 50);

        const unreadCount = await Alert.countDocuments({ userId: req.user.id, isRead: false });
        res.status(200).json({ success: true, count: alerts.length, unreadCount, data: alerts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// PUT /api/alerts/:id/read — Mark alert as read
router.put('/:id/read', protect, async (req, res) => {
    try {
        const alert = await Alert.findById(req.params.id);
        if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
        if (alert.userId.toString() !== req.user.id)
            return res.status(403).json({ success: false, message: 'Not authorized' });

        alert.isRead = true;
        await alert.save();
        res.status(200).json({ success: true, data: alert });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// PUT /api/alerts/mark-all-read — Mark all alerts as read
router.put('/mark-all-read', protect, async (req, res) => {
    try {
        await Alert.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
        res.status(200).json({ success: true, message: 'All alerts marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// DELETE /api/alerts/:id — Delete an alert
router.delete('/:id', protect, async (req, res) => {
    try {
        const alert = await Alert.findById(req.params.id);
        if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
        if (alert.userId.toString() !== req.user.id)
            return res.status(403).json({ success: false, message: 'Not authorized' });

        await Alert.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Alert deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

module.exports = router;
