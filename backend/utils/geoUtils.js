/**
 * Geo Utility Functions
 * =====================
 * Bounding box, centroid, and area helpers for Sentinel Hub API calls.
 */

/**
 * Get a bounding box around a lat/lng point.
 * @param {number} lat       — Latitude (degrees)
 * @param {number} lng       — Longitude (degrees)
 * @param {number} sizeKm    — Half-width of the bounding box in km (default 1km → ~2km box)
 * @returns {Object}          — { west, south, east, north } in degrees
 */
function getBoundingBox(lat, lng, sizeKm = 1) {
    // 1 degree latitude ≈ 111.32 km
    const latOffset = sizeKm / 111.32;
    // 1 degree longitude varies with latitude
    const lngOffset = sizeKm / (111.32 * Math.cos(lat * Math.PI / 180));

    return {
        west: lng - lngOffset,
        south: lat - latOffset,
        east: lng + lngOffset,
        north: lat + latOffset
    };
}

/**
 * Convert bounding box object to array format [west, south, east, north].
 */
function bboxToArray(bbox) {
    return [bbox.west, bbox.south, bbox.east, bbox.north];
}

/**
 * Calculate approximate area of a bounding box in hectares.
 */
function calculateAreaHectares(bbox) {
    const latDiff = bbox.north - bbox.south;
    const lngDiff = bbox.east - bbox.west;
    const avgLat = (bbox.north + bbox.south) / 2;

    // Convert to km
    const heightKm = latDiff * 111.32;
    const widthKm = lngDiff * 111.32 * Math.cos(avgLat * Math.PI / 180);

    // 1 km² = 100 hectares
    return Math.round(heightKm * widthKm * 100 * 100) / 100;
}

/**
 * Calculate centroid of a GeoJSON Polygon.
 * @param {Array} coordinates — GeoJSON polygon coordinates [[[lng, lat], ...]]
 * @returns {{ lat: number, lng: number }}
 */
function getCentroidFromPolygon(coordinates) {
    const ring = coordinates[0]; // outer ring
    const lats = ring.map(c => c[1]);
    const lngs = ring.map(c => c[0]);

    return {
        lat: lats.reduce((a, b) => a + b, 0) / lats.length,
        lng: lngs.reduce((a, b) => a + b, 0) / lngs.length
    };
}

/**
 * Get date range for Sentinel Hub requests.
 * @param {number} daysBack — Number of days to look back (default 30)
 * @returns {{ from: string, to: string }} — ISO date strings
 */
function getDateRange(daysBack = 30) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - daysBack);

    return {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0]
    };
}

module.exports = {
    getBoundingBox,
    bboxToArray,
    calculateAreaHectares,
    getCentroidFromPolygon,
    getDateRange
};
