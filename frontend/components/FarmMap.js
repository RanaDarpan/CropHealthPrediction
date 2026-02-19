'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiSearch, FiCrosshair, FiTrash2, FiCornerUpLeft } from 'react-icons/fi';

// Fix leaflet icon issue in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Small green dot icon for vertices
const vertexIcon = L.divIcon({
    className: '',
    html: '<div style="width:14px;height:14px;background:#16a34a;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
});

// First vertex (highlighted to show where to close)
const firstVertexIcon = L.divIcon({
    className: '',
    html: '<div style="width:18px;height:18px;background:#16a34a;border:3px solid #fbbf24;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
});

// Calculate polygon area in hectares using shoelace formula
function calculateArea(latlngs) {
    if (!latlngs || latlngs.length < 3) return 0;
    const points = latlngs.map(ll => {
        const lat = (ll.lat || ll[0]) * Math.PI / 180;
        const lng = (ll.lng || ll[1]) * Math.PI / 180;
        const R = 6371000;
        return { x: R * lng * Math.cos(lat), y: R * lat };
    });
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2 / 10000;
}

// Map click handler
function MapClickHandler({ onMapClick, disabled }) {
    useMapEvents({
        click(e) {
            if (!disabled) onMapClick(e.latlng);
        },
    });
    return null;
}

// Location search component
function LocationSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const map = useMap();

    const search = async () => {
        if (!query.trim()) return;
        setSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`);
            setResults(await res.json());
        } catch (e) { console.error(e); }
        setSearching(false);
    };

    const selectResult = (r) => {
        map.flyTo([parseFloat(r.lat), parseFloat(r.lon)], 17, { duration: 1.5 });
        setResults([]);
        setQuery(r.display_name.split(',')[0]);
    };

    return (
        <div style={searchStyles.container}>
            <div style={searchStyles.wrap}>
                <FiSearch color="#9ca3af" size={16} />
                <input
                    style={searchStyles.input}
                    placeholder="Search location..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && search()}
                />
                <button onClick={search} style={searchStyles.btn} disabled={searching}>
                    {searching ? '...' : 'Go'}
                </button>
            </div>
            {results.length > 0 && (
                <div style={searchStyles.resultsList}>
                    {results.map((r, i) => (
                        <div key={i} onClick={() => selectResult(r)} style={searchStyles.resultItem}>
                            📍 {r.display_name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Locate button
function LocateButton() {
    const map = useMap();
    return (
        <button onClick={() => map.locate({ setView: true, maxZoom: 16 })} style={searchStyles.locateBtn} title="Use my location">
            <FiCrosshair size={18} />
        </button>
    );
}

export default function FarmMap({ onPolygonChange, initialPolygon, center, zoom, readOnly }) {
    const [points, setPoints] = useState(initialPolygon || []);
    const [isComplete, setIsComplete] = useState(false);
    const area = calculateArea(points);
    const mapCenter = center || [21.17, 72.83];
    const mapZoom = zoom || 13;

    const handleMapClick = useCallback((latlng) => {
        if (isComplete) return; // Don't add points after completing

        // Check if clicking near the first point to close polygon
        if (points.length >= 3) {
            const first = points[0];
            const dist = Math.sqrt(
                Math.pow((latlng.lat - first.lat) * 111320, 2) +
                Math.pow((latlng.lng - first.lng) * 111320 * Math.cos(first.lat * Math.PI / 180), 2)
            );
            // If within ~30m of first point, close the polygon
            if (dist < 30) {
                setIsComplete(true);
                onPolygonChange && onPolygonChange(points);
                return;
            }
        }

        setPoints(prev => {
            const next = [...prev, { lat: latlng.lat, lng: latlng.lng }];
            onPolygonChange && onPolygonChange(next);
            return next;
        });
    }, [onPolygonChange, points, isComplete]);

    const finishPolygon = () => {
        if (points.length >= 3) {
            setIsComplete(true);
            onPolygonChange && onPolygonChange(points);
        }
    };

    const deleteLastPoint = () => {
        setPoints(prev => {
            const next = prev.slice(0, -1);
            onPolygonChange && onPolygonChange(next);
            return next;
        });
        setIsComplete(false);
    };

    const cancelDrawing = () => {
        setPoints([]);
        setIsComplete(false);
        onPolygonChange && onPolygonChange([]);
    };

    return (
        <div>
            {/* Title bar */}
            {!readOnly && (
                <div style={mapStyles.titleBar}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>Select Farm Boundary</span>
                </div>
            )}

            {/* Map */}
            <div style={{ position: 'relative' }}>
                <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: readOnly ? 300 : 480, borderRadius: readOnly ? 16 : 0, zIndex: 1 }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        attribution="Esri Satellite"
                    />
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OSM"
                        opacity={0.3}
                    />

                    {!readOnly && <LocationSearch />}
                    {!readOnly && <LocateButton />}
                    <MapClickHandler onMapClick={handleMapClick} disabled={readOnly || isComplete} />

                    {/* Tooltip on map center */}
                    {!readOnly && points.length === 0 && !isComplete && (
                        <MapTooltip text="Click to start drawing shape." />
                    )}

                    {/* Polyline while drawing */}
                    {!readOnly && points.length >= 2 && !isComplete && (
                        <Polyline
                            positions={points.map(p => [p.lat, p.lng])}
                            pathOptions={{ color: '#16a34a', weight: 3, dashArray: '8,6', opacity: 0.9 }}
                        />
                    )}

                    {/* Filled polygon when >= 3 points */}
                    {points.length >= 3 && (
                        <Polygon
                            positions={points.map(p => [p.lat, p.lng])}
                            pathOptions={{
                                color: '#16a34a',
                                fillColor: '#22c55e',
                                fillOpacity: readOnly ? 0.25 : 0.2,
                                weight: 3,
                            }}
                        />
                    )}

                    {/* Vertex markers */}
                    {!readOnly && points.map((p, i) => (
                        <Marker key={i} position={[p.lat, p.lng]}
                            icon={i === 0 && points.length >= 3 && !isComplete ? firstVertexIcon : vertexIcon}
                        />
                    ))}
                </MapContainer>

                {/* Drawing action buttons overlay — Finish / Delete last point / Cancel */}
                {!readOnly && points.length > 0 && !isComplete && (
                    <div style={mapStyles.drawActions}>
                        {points.length >= 3 && (
                            <button onClick={finishPolygon} style={mapStyles.drawBtn}>
                                Finish
                            </button>
                        )}
                        <button onClick={deleteLastPoint} style={mapStyles.drawBtn}>
                            Delete last point
                        </button>
                        <button onClick={cancelDrawing} style={mapStyles.drawBtn}>
                            Cancel
                        </button>
                    </div>
                )}

                {/* Edit/Clear for completed polygon */}
                {!readOnly && isComplete && (
                    <div style={mapStyles.drawActions}>
                        <button onClick={() => { setIsComplete(false); }} style={mapStyles.drawBtn}>
                            ✏️ Edit
                        </button>
                        <button onClick={cancelDrawing} style={{ ...mapStyles.drawBtn, color: '#dc2626' }}>
                            🗑️ Clear & Redraw
                        </button>
                    </div>
                )}
            </div>

            {/* Info panel below map */}
            {!readOnly && (
                <div style={mapStyles.infoPanel}>
                    <div style={mapStyles.infoBadge}>
                        <span style={{ fontSize: 16 }}>📍</span>
                        <div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>Points</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#166534' }}>{points.length}</div>
                        </div>
                    </div>
                    <div style={mapStyles.infoBadge}>
                        <span style={{ fontSize: 16 }}>📐</span>
                        <div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>Area</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#166534' }}>
                                {points.length >= 3 ? `${area.toFixed(2)} ha` : '—'}
                            </div>
                        </div>
                    </div>
                    <div style={{ ...mapStyles.infoBadge, flex: 2 }}>
                        <span style={{ fontSize: 16 }}>{isComplete ? '✅' : points.length >= 3 ? '🔶' : 'ℹ️'}</span>
                        <div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>Status</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: isComplete ? '#16a34a' : points.length >= 3 ? '#f97316' : '#6b7280' }}>
                                {isComplete ? 'Boundary complete! Ready to save.'
                                    : points.length === 0 ? 'Click on map to start drawing'
                                        : points.length < 3 ? `Need ${3 - points.length} more point${points.length < 2 ? 's' : ''}`
                                            : 'Click "Finish" or click first point to close'}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Simple tooltip component displayed on the map
function MapTooltip({ text }) {
    const map = useMap();
    const [pos, setPos] = useState(null);

    useEffect(() => {
        const handler = (e) => setPos(e.containerPoint);
        map.on('mousemove', handler);
        return () => map.off('mousemove', handler);
    }, [map]);

    if (!pos) return null;

    return (
        <div style={{
            position: 'absolute', zIndex: 1000,
            left: pos.x + 15, top: pos.y - 30,
            background: 'rgba(0,0,0,0.7)', color: 'white',
            padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
            pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
            {text}
        </div>
    );
}

const searchStyles = {
    container: { position: 'absolute', top: 12, left: 52, right: 52, zIndex: 1000 },
    wrap: {
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'white', borderRadius: 12, padding: '8px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb',
    },
    input: { flex: 1, border: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit', background: 'transparent' },
    btn: {
        padding: '6px 14px', borderRadius: 8, border: 'none',
        background: 'linear-gradient(135deg,#16a34a,#15803d)', color: 'white',
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
    },
    resultsList: {
        background: 'white', borderRadius: 12, marginTop: 6, overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb',
        maxHeight: 200, overflowY: 'auto',
    },
    resultItem: { padding: '10px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f3f4f6' },
    locateBtn: {
        position: 'absolute', bottom: 20, right: 16, zIndex: 1000,
        width: 40, height: 40, borderRadius: '50%', border: 'none',
        background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#16a34a',
    },
};

const mapStyles = {
    titleBar: {
        padding: '12px 18px', background: 'white', borderRadius: '16px 16px 0 0',
        borderBottom: '1px solid #e5e7eb',
    },
    drawActions: {
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, display: 'flex', gap: 4,
        background: 'rgba(255,255,255,0.95)', borderRadius: 8, overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)', border: '1px solid rgba(0,0,0,0.1)',
    },
    drawBtn: {
        padding: '10px 18px', border: 'none', background: 'transparent',
        fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151',
        borderRight: '1px solid #e5e7eb', whiteSpace: 'nowrap',
    },
    infoPanel: { display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' },
    infoBadge: {
        flex: 1, display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', background: 'white', borderRadius: 14,
        border: '1px solid #f3f4f6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minWidth: 100,
    },
};
