/**
 * GEE Proxy Service — Fetches Sentinel-2 band data via ML service's GEE endpoint.
 * Replaces sentinelHub.js entirely; the ML service handles GEE auth, data fetching,
 * and fallback (CSV → synthetic) internally.
 */
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * Fetch Sentinel-2 band data for a lat/lng point.
 * Creates a small polygon around the centroid and calls
 * the ML service's /gee/fetch endpoint.
 *
 * @param {number} lat     Latitude
 * @param {number} lng     Longitude
 * @param {string} [dateFrom]  Optional start date YYYY-MM-DD
 * @param {string} [dateTo]    Optional end date YYYY-MM-DD
 * @returns {Object} { bands: { B02, B03, ... }, metadata: { source, ... } }
 */
async function fetchBandData(lat, lng, dateFrom, dateTo) {
    // Build a ~1km square polygon around the centroid
    const offset = 0.005; // ~500m at equator
    const polygon = [
        [lng - offset, lat - offset],
        [lng + offset, lat - offset],
        [lng + offset, lat + offset],
        [lng - offset, lat + offset],
        [lng - offset, lat - offset], // close polygon
    ];

    return fetchBandDataForPolygon(polygon, dateFrom, dateTo);
}

/**
 * Fetch Sentinel-2 band data for a GeoJSON polygon.
 * Calls the ML service which handles GEE → CSV fallback → synthetic fallback.
 *
 * @param {Array} polygon  Array of [lng, lat] coordinate pairs (closed polygon)
 * @param {string} [dateFrom]
 * @param {string} [dateTo]
 * @returns {Object} { bands: { B02, B03, ... }, metadata: { source, ... } }
 */
async function fetchBandDataForPolygon(polygon, dateFrom, dateTo) {
    try {
        const response = await axios.post(`${ML_SERVICE_URL}/gee/fetch`, {
            polygon,
            date_from: dateFrom || null,
            date_to: dateTo || null,
        }, { timeout: 30000 });

        const data = response.data;
        const rawBands = data.bands || {};

        // Normalize band names: ML service returns B2, B3... we also support B02, B03...
        const bands = {
            B02: rawBands.B2 || rawBands.B02 || 0,
            B03: rawBands.B3 || rawBands.B03 || 0,
            B04: rawBands.B4 || rawBands.B04 || 0,
            B05: rawBands.B5 || rawBands.B05 || 0,
            B06: rawBands.B6 || rawBands.B06 || 0,
            B07: rawBands.B7 || rawBands.B07 || 0,
            B08: rawBands.B8 || rawBands.B08 || 0,
            B8A: rawBands.B8A || 0,
            B09: rawBands.B9 || rawBands.B09 || 0,
            B11: rawBands.B11 || 0,
            B12: rawBands.B12 || 0,
        };

        return {
            bands,
            metadata: data.metadata || { source: 'gee-proxy' },
        };
    } catch (error) {
        console.warn('GEE proxy fetch failed, generating synthetic data:', error.message);
        return generateSyntheticBands(polygon);
    }
}

/**
 * Last-resort synthetic fallback when the ML service is unreachable.
 * Produces realistic Sentinel-2 surface reflectance values (×10000 scale).
 */
function generateSyntheticBands(polygon) {
    const seed = polygon && polygon[0]
        ? Math.abs(Math.sin(polygon[0][0] + polygon[0][1])) % 1
        : Math.random();

    const bands = {
        B02: Math.round(1400 + seed * 400),
        B03: Math.round(1500 + seed * 300),
        B04: Math.round(1300 + seed * 500),
        B05: Math.round(1800 + seed * 400),
        B06: Math.round(2500 + seed * 500),
        B07: Math.round(2800 + seed * 500),
        B08: Math.round(3000 + seed * 500),
        B8A: Math.round(2900 + seed * 500),
        B09: 0,
        B11: Math.round(2200 + seed * 500),
        B12: Math.round(1800 + seed * 400),
    };

    return {
        bands,
        metadata: {
            source: 'synthetic',
            note: 'ML service unreachable. Using locally generated synthetic data.',
        },
    };
}

module.exports = { fetchBandData, fetchBandDataForPolygon };
