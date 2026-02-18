const mongoose = require('mongoose');

const satelliteDataSchema = new mongoose.Schema({
    farmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', required: true },
    date: { type: Date, required: true, default: Date.now },
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    // All 13 Sentinel-2 L2A bands (surface reflectance scaled by 10000 in GEE, or 0-1)
    bands: {
        B01: { type: Number, min: 0 }, // Coastal Aerosol 443nm
        B02: { type: Number, min: 0 }, // Blue 490nm
        B03: { type: Number, min: 0 }, // Green 560nm
        B04: { type: Number, min: 0 }, // Red 665nm
        B05: { type: Number, min: 0 }, // Veg Red Edge 1 705nm
        B06: { type: Number, min: 0 }, // Veg Red Edge 2 740nm
        B07: { type: Number, min: 0 }, // Veg Red Edge 3 783nm
        B08: { type: Number, min: 0 }, // NIR 842nm
        B8A: { type: Number, min: 0 }, // Narrow NIR 865nm
        B09: { type: Number, min: 0 }, // Water Vapour 945nm
        B10: { type: Number, min: 0 }, // SWIR Cirrus 1375nm
        B11: { type: Number, min: 0 }, // SWIR 1 1610nm
        B12: { type: Number, min: 0 }  // SWIR 2 2190nm
    },
    // Computed vegetation/soil/water indices
    indices: {
        ndvi: { type: Number, min: -1, max: 1 },
        evi: { type: Number, min: -1, max: 10 }, // EVI can exceed 1 in dense canopy
        savi: { type: Number, min: -1, max: 5 },
        ndwi: { type: Number, min: -1, max: 1 },
        ndmi: { type: Number, min: -1, max: 1 },
        bsi: { type: Number, min: -1, max: 1 },
        msavi: { type: Number, min: -1, max: 1 }
    },
    cloudCoverPercentage: { type: Number, min: 0, max: 100, default: null },
    dataSource: {
        type: String,
        enum: ['sentinel-2-l2a', 'synthetic', 'google-earth-engine', 'gee-proxy', 'csv-fallback'],
        default: 'synthetic'
    },
    processingLevel: { type: String, default: 'L2A' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

satelliteDataSchema.index({ farmId: 1, date: -1 });

module.exports = mongoose.model('SatelliteData', satelliteDataSchema);
