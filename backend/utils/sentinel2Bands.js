/**
 * Sentinel-2 Band Constants & Vegetation Index Calculators
 * =========================================================
 * All 13 spectral bands of the Sentinel-2 MSI instrument.
 * Band values are surface reflectance (0-1 range after L2A processing).
 */

const SENTINEL2_BANDS = {
    B01: { name: 'Coastal Aerosol', wavelength: 443, resolution: 60, description: 'Aerosol detection' },
    B02: { name: 'Blue', wavelength: 490, resolution: 10, description: 'Soil & vegetation discrimination' },
    B03: { name: 'Green', wavelength: 560, resolution: 10, description: 'Green peak reflectance' },
    B04: { name: 'Red', wavelength: 665, resolution: 10, description: 'Chlorophyll absorption' },
    B05: { name: 'Vegetation Red Edge 1', wavelength: 705, resolution: 20, description: 'Red edge onset' },
    B06: { name: 'Vegetation Red Edge 2', wavelength: 740, resolution: 20, description: 'Red edge transition' },
    B07: { name: 'Vegetation Red Edge 3', wavelength: 783, resolution: 20, description: 'Red edge plateau' },
    B08: { name: 'NIR', wavelength: 842, resolution: 10, description: 'Near infrared, vegetation analysis' },
    B8A: { name: 'Narrow NIR', wavelength: 865, resolution: 20, description: 'Narrow near infrared' },
    B09: { name: 'Water Vapour', wavelength: 945, resolution: 60, description: 'Water vapour estimation' },
    B10: { name: 'SWIR Cirrus', wavelength: 1375, resolution: 60, description: 'Cirrus cloud detection' },
    B11: { name: 'SWIR 1', wavelength: 1610, resolution: 20, description: 'Snow/ice/cloud, vegetation moisture' },
    B12: { name: 'SWIR 2', wavelength: 2190, resolution: 20, description: 'Soil/mineral composition' }
};

const BAND_NAMES = Object.keys(SENTINEL2_BANDS);

/**
 * NDVI — Normalized Difference Vegetation Index
 * Measures vegetation greenness / photosynthetic activity.
 * Range: -1 to 1 (healthy vegetation: 0.3 – 0.8)
 */
function computeNDVI(B04, B08) {
    if (B08 + B04 === 0) return 0;
    return (B08 - B04) / (B08 + B04);
}

/**
 * EVI — Enhanced Vegetation Index
 * Improved NDVI; reduces atmospheric & soil noise.
 * Range: -1 to 1 (typical: 0.2 – 0.8)
 */
function computeEVI(B02, B04, B08) {
    const G = 2.5;
    const C1 = 6;
    const C2 = 7.5;
    const L = 1;
    const denominator = B08 + C1 * B04 - C2 * B02 + L;
    if (denominator === 0) return 0;
    return G * ((B08 - B04) / denominator);
}

/**
 * SAVI — Soil Adjusted Vegetation Index
 * Minimizes soil brightness influence, useful for sparse vegetation.
 * L factor: 0 (dense canopy) to 1 (no vegetation), default 0.5
 */
function computeSAVI(B04, B08, L = 0.5) {
    const denominator = B08 + B04 + L;
    if (denominator === 0) return 0;
    return ((B08 - B04) / denominator) * (1 + L);
}

/**
 * NDWI — Normalized Difference Water Index
 * Detects water bodies and surface water content.
 * Range: -1 to 1 (water: > 0.3)
 */
function computeNDWI(B03, B08) {
    if (B03 + B08 === 0) return 0;
    return (B03 - B08) / (B03 + B08);
}

/**
 * NDMI — Normalized Difference Moisture Index
 * Estimates vegetation water content / canopy moisture stress.
 * Range: -1 to 1 (well-watered: > 0.2, stressed: < 0)
 */
function computeNDMI(B08, B11) {
    if (B08 + B11 === 0) return 0;
    return (B08 - B11) / (B08 + B11);
}

/**
 * BSI — Bare Soil Index
 * Highlights bare soil areas.
 * Range: -1 to 1 (bare soil: > 0.2)
 */
function computeBSI(B02, B04, B08, B11) {
    const numerator = (B11 + B04) - (B08 + B02);
    const denominator = (B11 + B04) + (B08 + B02);
    if (denominator === 0) return 0;
    return numerator / denominator;
}

/**
 * MSAVI — Modified Soil Adjusted Vegetation Index
 * Self-adjusting L factor for improved performance over SAVI.
 */
function computeMSAVI(B04, B08) {
    const inner = (2 * B08 + 1) ** 2 - 8 * (B08 - B04);
    if (inner < 0) return 0;
    return (2 * B08 + 1 - Math.sqrt(inner)) / 2;
}

/**
 * Compute all indices from a band-data object.
 * @param {Object} bands  — { B01, B02, ..., B12, B8A }
 * @returns {Object}       — all computed vegetation/soil/water indices
 */
function computeAllIndices(bands) {
    const { B02, B03, B04, B08, B11 } = bands;
    return {
        ndvi: round(computeNDVI(B04, B08)),
        evi: round(computeEVI(B02, B04, B08)),
        savi: round(computeSAVI(B04, B08)),
        ndwi: round(computeNDWI(B03, B08)),
        ndmi: round(computeNDMI(B08, B11)),
        bsi: round(computeBSI(B02, B04, B08, B11)),
        msavi: round(computeMSAVI(B04, B08))
    };
}

function round(val, decimals = 4) {
    return Math.round(val * 10 ** decimals) / 10 ** decimals;
}

module.exports = {
    SENTINEL2_BANDS,
    BAND_NAMES,
    computeNDVI,
    computeEVI,
    computeSAVI,
    computeNDWI,
    computeNDMI,
    computeBSI,
    computeMSAVI,
    computeAllIndices
};
