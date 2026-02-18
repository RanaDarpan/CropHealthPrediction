const express = require('express');
const router = express.Router();
const Farm = require('../models/Farm');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// @route   GET /api/farms
// @desc    Get all farms for logged in user
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        console.log('GET /api/farms request from user:', req.user.id);
        const farms = await Farm.find({ userId: req.user.id, isActive: true })
            .sort({ createdAt: -1 });
        console.log(`Found ${farms.length} farms for user ${req.user.id}`);

        res.status(200).json({
            success: true,
            count: farms.length,
            farms
        });
    } catch (error) {
        console.error('Get farms error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   GET /api/farms/:id
// @desc    Get single farm by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.id);

        if (!farm) {
            return res.status(404).json({
                success: false,
                message: 'Farm not found'
            });
        }

        // Make sure user owns this farm
        if (farm.userId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this farm'
            });
        }

        res.status(200).json({
            success: true,
            farm
        });
    } catch (error) {
        console.error('Get farm error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   POST /api/farms
// @desc    Create a new farm
// @access  Private
router.post('/', protect, [
    body('name').trim().notEmpty().withMessage('Farm name is required'),
    body('geometry').notEmpty().withMessage('Farm boundaries are required'),
    body('area').optional().isNumeric().withMessage('Area must be a number'),
    body('cropType').optional().trim(),
    body('plantingDate').optional().isISO8601().withMessage('Valid planting date is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { name, geometry, area, cropType, plantingDate, irrigationType, soilData } = req.body;

        // Create farm
        const farm = await Farm.create({
            name,
            userId: req.user.id,
            geometry,
            area,
            cropType,
            plantingDate,
            irrigationType: irrigationType || 'rainfed',
            soilData: soilData || {}
        });

        // Add farm to user's farms array
        await User.findByIdAndUpdate(req.user.id, {
            $push: { farms: farm._id }
        });

        res.status(201).json({
            success: true,
            message: 'Farm created successfully',
            farm
        });
    } catch (error) {
        console.error('Create farm error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   PUT /api/farms/:id
// @desc    Update farm
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        let farm = await Farm.findById(req.params.id);

        if (!farm) {
            return res.status(404).json({
                success: false,
                message: 'Farm not found'
            });
        }

        // Make sure user owns this farm
        if (farm.userId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this farm'
            });
        }

        const { name, geometry, area, cropType, plantingDate, irrigationType, soilData, healthScore } = req.body;

        const updateFields = {};
        if (name) updateFields.name = name;
        if (geometry) updateFields.geometry = geometry;
        if (area) updateFields.area = area;
        if (cropType) updateFields.cropType = cropType;
        if (plantingDate) updateFields.plantingDate = plantingDate;
        if (irrigationType) updateFields.irrigationType = irrigationType;
        if (soilData) updateFields.soilData = soilData;
        if (healthScore !== undefined) updateFields.healthScore = healthScore;

        farm = await Farm.findByIdAndUpdate(
            req.params.id,
            updateFields,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Farm updated successfully',
            farm
        });
    } catch (error) {
        console.error('Update farm error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// @route   DELETE /api/farms/:id
// @desc    Delete farm (soft delete)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.id);

        if (!farm) {
            return res.status(404).json({
                success: false,
                message: 'Farm not found'
            });
        }

        // Make sure user owns this farm
        if (farm.userId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this farm'
            });
        }

        // Soft delete
        farm.isActive = false;
        await farm.save();

        // Remove from user's farms array
        await User.findByIdAndUpdate(req.user.id, {
            $pull: { farms: farm._id }
        });

        res.status(200).json({
            success: true,
            message: 'Farm deleted successfully'
        });
    } catch (error) {
        console.error('Delete farm error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

module.exports = router;
