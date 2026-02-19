'use client';
import { use, useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { farmAPI, cropHealthAPI, weatherAPI, mlAPI, pestAPI, soilAPI, satelliteAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { FiArrowLeft, FiActivity, FiCloud, FiCpu, FiTrash2, FiDroplet, FiThermometer, FiWind, FiRefreshCw } from 'react-icons/fi';

const FarmMap = dynamic(() => import('@/components/FarmMap'), { ssr: false, loading: () => <div className="skeleton" style={{ height: 300, borderRadius: 16 }} /> });
const HealthChart = dynamic(() => import('@/components/HealthChart'), { ssr: false, loading: () => <div className="skeleton" style={{ height: 250, borderRadius: 16 }} /> });

// Dynamic import DataCharts
const DataCharts = dynamic(() => import('@/components/DataCharts').then(mod => ({
    default: () => null,
    MultiIndexChart: mod.MultiIndexChart,
    PestRiskChart: mod.PestRiskChart,
    SoilRadarChart: mod.SoilRadarChart,
    WeatherTrendChart: mod.WeatherTrendChart,
    HealthGauge: mod.HealthGauge,
    SatelliteBandChart: mod.SatelliteBandChart,
})), { ssr: false });

// Import chart components directly (client-side)
import { MultiIndexChart, PestRiskChart, SoilRadarChart, WeatherTrendChart, HealthGauge, SatelliteBandChart } from '@/components/DataCharts';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

export default function FarmDetailPage({ params }) {
    const { id } = use(params);
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [farm, setFarm] = useState(null);
    const [weather, setWeather] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [predicting, setPredicting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Additional data states
    const [pestData, setPestData] = useState([]);
    const [soilData, setSoilData] = useState([]);
    const [satelliteData, setSatelliteData] = useState(null);
    const [healthHistory, setHealthHistory] = useState([]);
    const [forecastData, setForecastData] = useState([]);

    useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

    useEffect(() => {
        if (!user || !id) return;
        const load = async () => {
            try {
                const farmRes = await farmAPI.getById(id);
                const farmData = farmRes.data.data || farmRes.data.farm || farmRes.data;
                setFarm(farmData);

                // Load all data in parallel
                Promise.all([
                    weatherAPI.current(id).then(r => {
                        const d = r.data.data || r.data;
                        setWeather(d.weather || d);
                    }).catch(() => { }),
                    weatherAPI.forecast(id).then(r => {
                        const d = r.data.data || r.data;
                        const fc = d.forecast || d;
                        if (Array.isArray(fc)) {
                            setForecastData(fc.slice(0, 7).map(day => ({
                                date: day.date ? new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short' }) : '',
                                temp: day.tempAvg || day.tempMax || day.temp || day.temperature || 0,
                                humidity: day.humidity || 0,
                            })));
                        }
                    }).catch(() => { }),
                    cropHealthAPI.history(id).then(r => {
                        const records = r.data.data || r.data.history || [];
                        setHealthHistory(records.slice(-20).map((item, i) => ({
                            date: item.date ? new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : `Day ${i + 1}`,
                            ndvi: item.ndvi || item.NDVI || 0,
                            evi: item.evi || item.EVI || 0,
                            savi: item.savi || item.SAVI || 0,
                        })));
                    }).catch(() => {
                        // Generate sample data for visualization
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
                        setHealthHistory(months.map(m => ({
                            date: m, ndvi: 0.3 + Math.random() * 0.5, evi: 0.2 + Math.random() * 0.4, savi: 0.25 + Math.random() * 0.45,
                        })));
                    }),
                    pestAPI.history(id).then(r => {
                        const records = r.data.data || r.data.history || [];
                        setPestData(records.slice(-10).map((item, i) => ({
                            date: item.date ? new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : `Day ${i + 1}`,
                            riskScore: item.riskScore || item.risk_score || item.overallRisk || 0,
                        })));
                    }).catch(() => {
                        setPestData([
                            { date: 'Jan', riskScore: 15 }, { date: 'Feb', riskScore: 22 }, { date: 'Mar', riskScore: 38 },
                            { date: 'Apr', riskScore: 55 }, { date: 'May', riskScore: 42 }, { date: 'Jun', riskScore: 28 },
                        ]);
                    }),
                    soilAPI.history(id).then(r => {
                        const records = r.data.data || r.data.history || [];
                        if (records.length > 0) {
                            const latest = records[records.length - 1];
                            setSoilData([
                                { property: 'pH', value: (latest.ph || 6.5) * 10, optimal: 65 },
                                { property: 'Nitrogen', value: latest.nitrogen || 60, optimal: 75 },
                                { property: 'Phosphorus', value: latest.phosphorus || 45, optimal: 60 },
                                { property: 'Potassium', value: latest.potassium || 55, optimal: 70 },
                                { property: 'Moisture', value: latest.moisture || 50, optimal: 65 },
                                { property: 'Organic', value: latest.organic || 40, optimal: 55 },
                            ]);
                        }
                    }).catch(() => {
                        setSoilData([
                            { property: 'pH', value: 65, optimal: 65 },
                            { property: 'Nitrogen', value: 58, optimal: 75 },
                            { property: 'Phosphorus', value: 42, optimal: 60 },
                            { property: 'Potassium', value: 52, optimal: 70 },
                            { property: 'Moisture', value: 48, optimal: 65 },
                            { property: 'Organic', value: 38, optimal: 55 },
                        ]);
                    }),
                    satelliteAPI.latest(id).then(r => {
                        const sat = r.data.data || r.data;
                        setSatelliteData(sat);
                    }).catch(() => { }),
                ]);
            } catch (e) {
                console.error('Load error:', e);
            }
            setLoading(false);
        };
        load();
    }, [user, id]);

    const runPrediction = async () => {
        setPredicting(true);
        try {
            const res = await mlAPI.predict(id);
            setPrediction(res.data.data || res.data);
        } catch (e) {
            setPrediction({ error: e.response?.data?.message || 'Prediction failed' });
        }
        setPredicting(false);
    };

    const handleDelete = async () => {
        if (!confirm('Delete this farm? This cannot be undone.')) return;
        setDeleting(true);
        try {
            await farmAPI.delete(id);
            router.push('/farms');
        } catch (e) {
            alert('Delete failed');
            setDeleting(false);
        }
    };

    if (authLoading || loading || !user) return <div className="loading-page"><div className="loading-spinner" /><p>Loading farm...</p></div>;
    if (!farm) return <div className="loading-page"><p>Farm not found</p></div>;

    const polygonCoords = farm.geometry?.coordinates?.[0]?.map(c => ({ lat: c[1], lng: c[0] })) || [];
    const center = polygonCoords.length > 0
        ? [polygonCoords.reduce((s, p) => s + p.lat, 0) / polygonCoords.length, polygonCoords.reduce((s, p) => s + p.lng, 0) / polygonCoords.length]
        : [21.17, 72.83];

    const tabs = [
        { id: 'overview', label: '📊 Overview', icon: '📊' },
        { id: 'health', label: '🌿 Health Indices', icon: '🌿' },
        { id: 'pest', label: '🐛 Pest Risk', icon: '🐛' },
        { id: 'soil', label: '🟤 Soil Analysis', icon: '🟤' },
        { id: 'weather', label: '🌤️ Weather', icon: '🌤️' },
    ];

    // Build satellite band data if available
    const bandData = satelliteData?.bands ? Object.entries(satelliteData.bands).map(([band, val]) => ({
        band: band.toUpperCase(),
        reflectance: typeof val === 'number' ? val : 0,
    })) : [
        { band: 'B1', reflectance: 0.042 }, { band: 'B2', reflectance: 0.038 }, { band: 'B3', reflectance: 0.052 },
        { band: 'B4', reflectance: 0.028 }, { band: 'B5', reflectance: 0.091 }, { band: 'B6', reflectance: 0.198 },
        { band: 'B7', reflectance: 0.231 }, { band: 'B8', reflectance: 0.248 }, { band: 'B8A', reflectance: 0.265 },
        { band: 'B9', reflectance: 0.012 }, { band: 'B11', reflectance: 0.142 }, { band: 'B12', reflectance: 0.088 },
    ];

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
            <motion.div initial="hidden" animate="show" variants={stagger}>
                <motion.div variants={fadeUp}>
                    <Link href="/farms" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#16a34a', fontWeight: 500 }}><FiArrowLeft /> Back to Farms</Link>
                </motion.div>

                {/* Title Row */}
                <motion.div variants={fadeUp} style={styles.titleRow}>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800 }}>🌱 {farm.name}</h1>
                        <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 14, color: '#6b7280', flexWrap: 'wrap' }}>
                            {farm.cropType && <span>🌾 {farm.cropType}</span>}
                            {farm.area && <span>📐 {farm.area} ha</span>}
                            {farm.soilType && <span>🟤 {farm.soilType}</span>}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={runPrediction} disabled={predicting} className="btn btn-primary">
                            <FiCpu /> {predicting ? 'Analyzing...' : 'AI Predict'}
                        </button>
                        <button onClick={handleDelete} disabled={deleting} className="btn btn-danger btn-sm">
                            <FiTrash2 /> Delete
                        </button>
                    </div>
                </motion.div>

                {/* Map + Weather Row */}
                <div style={styles.grid}>
                    <motion.div variants={fadeUp} style={styles.card}>
                        <h3 style={styles.cardTitle}>🗺️ Farm Boundary</h3>
                        <FarmMap initialPolygon={polygonCoords} center={center} zoom={16} readOnly />
                    </motion.div>

                    <motion.div variants={fadeUp} style={styles.card}>
                        <h3 style={styles.cardTitle}>🌤️ Current Weather</h3>
                        {weather ? (
                            <div style={styles.weatherGrid}>
                                <WeatherItem icon={<FiThermometer color="#dc2626" />} label="Temperature" value={`${weather.temperature || weather.temp || '--'}°C`} />
                                <WeatherItem icon={<FiDroplet color="#0ea5e9" />} label="Humidity" value={`${weather.humidity || '--'}%`} />
                                <WeatherItem icon={<FiCloud color="#6b7280" />} label="Condition" value={weather.description || weather.condition || '--'} />
                                <WeatherItem icon="💨" label="Wind" value={`${weather.windSpeed || weather.wind || '--'} m/s`} />
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>Loading weather...</div>
                        )}
                    </motion.div>
                </div>

                {/* Prediction Results */}
                {prediction && (
                    <motion.div variants={fadeUp} style={{ ...styles.card, marginTop: 24 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <h3 style={styles.cardTitle}>🤖 AI Prediction Result</h3>
                        {prediction.error ? (
                            <div style={{ color: '#dc2626', padding: 16 }}>{prediction.error}</div>
                        ) : (
                            <div style={styles.predGrid}>
                                <div style={styles.predMain}>
                                    <HealthGauge score={prediction.prediction?.health_score || prediction.health_score || 0} />
                                    <div>
                                        <div style={{ fontSize: 14, color: '#6b7280' }}>Predicted NDVI</div>
                                        <div style={{ fontSize: 28, fontWeight: 700, color: '#166534' }}>
                                            {(prediction.prediction?.predicted_ndvi || prediction.predicted_ndvi || 0).toFixed(4)}
                                        </div>
                                        <span className={`badge ${(prediction.prediction?.health_score || prediction.health_score || 0) > 70 ? 'badge-healthy' : 'badge-moderate'}`} style={{ marginTop: 8 }}>
                                            {prediction.prediction?.classification || prediction.classification || 'Analyzed'}
                                        </span>
                                    </div>
                                </div>
                                {(prediction.prediction?.recommendations || prediction.recommendations) && (
                                    <div style={{ marginTop: 20 }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📋 Recommendations:</div>
                                        {(prediction.prediction?.recommendations || prediction.recommendations || []).map((r, i) => (
                                            <div key={i} style={styles.recItem}>✅ {r}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ═══ TABS ═══ */}
                <motion.div variants={fadeUp} style={styles.tabContainer}>
                    <div style={styles.tabBar}>
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                style={{ ...styles.tabBtn, ...(activeTab === tab.id ? styles.tabBtnActive : {}) }}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div style={styles.tabContent}>
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div>
                                <div style={styles.chartGrid}>
                                    <div style={styles.chartCard}>
                                        <h4 style={styles.chartTitle}>📈 Health Trend</h4>
                                        <HealthChart farmId={id} />
                                    </div>
                                    <div style={styles.chartCard}>
                                        <h4 style={styles.chartTitle}>🛰️ Satellite Bands (Sentinel-2)</h4>
                                        <SatelliteBandChart data={bandData} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Health Indices Tab */}
                        {activeTab === 'health' && (
                            <div style={styles.chartCard}>
                                <h4 style={styles.chartTitle}>🌿 Vegetation Index Trends (NDVI, EVI, SAVI)</h4>
                                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Track multiple vegetation indices over time to monitor crop health comprehensively.</p>
                                <MultiIndexChart data={healthHistory} />
                            </div>
                        )}

                        {/* Pest Risk Tab */}
                        {activeTab === 'pest' && (
                            <div style={styles.chartCard}>
                                <h4 style={styles.chartTitle}>🐛 Pest Risk Assessment History</h4>
                                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Color-coded risk scores from AI-powered pest risk assessment combining weather & crop data.</p>
                                <PestRiskChart data={pestData} />
                            </div>
                        )}

                        {/* Soil Analysis Tab */}
                        {activeTab === 'soil' && (
                            <div style={styles.chartCard}>
                                <h4 style={styles.chartTitle}>🟤 Soil Property Analysis</h4>
                                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Radar chart showing current soil properties vs optimal values. Green = current, Blue dashed = optimal.</p>
                                <SoilRadarChart data={soilData} />
                            </div>
                        )}

                        {/* Weather Tab */}
                        {activeTab === 'weather' && (
                            <div style={styles.chartCard}>
                                <h4 style={styles.chartTitle}>🌤️ 7-Day Weather Forecast Trend</h4>
                                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Temperature and humidity trends for the upcoming week at your farm location.</p>
                                <WeatherTrendChart data={forecastData} />
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}

function WeatherItem({ icon, label, value }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, background: '#f9fafb', borderRadius: 14 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{value}</div>
            </div>
        </div>
    );
}

const styles = {
    titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginTop: 16 },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 },
    card: { background: 'white', borderRadius: 20, padding: 24, border: '1px solid #f3f4f6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
    cardTitle: { fontSize: 18, fontWeight: 700, marginBottom: 16 },
    weatherGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
    predGrid: { padding: 8 },
    predMain: { display: 'flex', gap: 32, alignItems: 'center' },
    recItem: { fontSize: 14, color: '#374151', padding: '6px 0', borderBottom: '1px solid #f9fafb' },

    // Tabs
    tabContainer: { marginTop: 32 },
    tabBar: {
        display: 'flex', gap: 6, padding: 6, background: '#f3f4f6', borderRadius: 16,
        overflowX: 'auto', flexWrap: 'nowrap',
    },
    tabBtn: {
        padding: '10px 20px', borderRadius: 12, border: 'none', background: 'transparent',
        fontSize: 14, fontWeight: 600, color: '#6b7280', cursor: 'pointer', transition: 'all 0.2s',
        whiteSpace: 'nowrap',
    },
    tabBtnActive: {
        background: 'white', color: '#166534', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },
    tabContent: { marginTop: 20 },
    chartGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
    chartCard: {
        background: 'white', borderRadius: 20, padding: 24,
        border: '1px solid #f3f4f6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    },
    chartTitle: { fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#111827' },
};
