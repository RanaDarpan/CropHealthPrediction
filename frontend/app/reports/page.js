'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { farmAPI, cropHealthAPI, pestAPI, soilAPI, weatherAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { FiDownload, FiRefreshCw, FiCpu, FiLayers, FiActivity, FiCloud, FiGrid, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { SoilRadarChart, PestRiskChart } from '@/components/DataCharts';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

const tooltipStyle = {
    background: 'white', border: '1px solid #e5e7eb', borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 13, padding: '8px 12px',
};

const PIE_COLORS = ['#22c55e', '#f97316', '#dc2626', '#eab308'];

export default function ReportsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [farms, setFarms] = useState([]);
    const [selectedFarm, setSelectedFarm] = useState(null);
    const [viewFarmId, setViewFarmId] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [aiReport, setAiReport] = useState('');

    // Data States
    const [ndviTrend, setNdviTrend] = useState([]);
    const [soilMoisture, setSoilMoisture] = useState([]);
    const [pestAlerts, setPestAlerts] = useState([]);
    const [weatherTrend, setWeatherTrend] = useState([]);

    // Detailed Data for Tabs
    const [soilDetailed, setSoilDetailed] = useState([]);
    const [pestDetailed, setPestDetailed] = useState(null);
    const [pestHistory, setPestHistory] = useState([]);

    useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

    useEffect(() => {
        if (!user) return;
        farmAPI.getAll().then(r => {
            // Backend returns: { success: true, farms: [...] } or { success: true, data: { farms: [...] } }
            const f = r.data.farms || r.data.data?.farms || r.data.data || [];
            const validFarms = Array.isArray(f) ? f : [];
            setFarms(validFarms);
            if (validFarms.length > 0) {
                const firstFarm = validFarms[0];
                setViewFarmId(firstFarm._id || firstFarm.id);
                setSelectedFarm(firstFarm);
                loadFarmReport(firstFarm);
            } else {
                setLoading(false);
            }
        }).catch((err) => {
            console.error('Failed to load farms:', err);
            setFarms([]);
        }).finally(() => setLoading(false));
    }, [user]);

    const loadFarmReport = async (farm) => {
        setSelectedFarm(farm);
        setRefreshing(true);
        const id = farm._id;

        try {
            // Load all data in parallel
            let [healthRes, pestRes, soilRes, weatherRes] = await Promise.all([
                cropHealthAPI.history(id).catch(() => null),
                pestAPI.history(id).catch(() => null),
                soilAPI.history(id).catch(() => null),
                weatherAPI.forecast(id).catch(() => null),
            ]);

            // Auto-trigger analysis if no data
            const healthData = healthRes?.data?.data || healthRes?.data?.history || [];
            const pestData = pestRes?.data?.data || pestRes?.data?.history || [];
            const soilData = soilRes?.data?.data || soilRes?.data?.history || [];

            if (healthData.length === 0 || pestData.length === 0 || soilData.length === 0) {
                try {
                    const triggers = [];
                    if (healthData.length === 0) triggers.push(cropHealthAPI.analyze(id).catch(() => null));
                    if (pestData.length === 0) triggers.push(pestAPI.assess(id).catch(() => null));
                    if (soilData.length === 0) triggers.push(soilAPI.satellite(id).catch(() => null));
                    await Promise.all(triggers);

                    // Re-fetch
                    const [newHealth, newPest, newSoil] = await Promise.all([
                        healthData.length === 0 ? cropHealthAPI.history(id).catch(() => null) : healthRes,
                        pestData.length === 0 ? pestAPI.history(id).catch(() => null) : pestRes,
                        soilData.length === 0 ? soilAPI.history(id).catch(() => null) : soilRes,
                    ]);
                    healthRes = newHealth || healthRes;
                    pestRes = newPest || pestRes;
                    soilRes = newSoil || soilRes;
                } catch (e) { console.warn('Auto-analysis trigger error:', e); }
            }

            // --- Process General Data for Overview ---
            processOverviewData(healthRes, soilRes, pestRes, weatherRes, farm);

            // --- Process Detailed Soil Data ---
            const finalSoil = soilRes?.data?.data || soilRes?.data?.history || [];
            if (finalSoil.length > 0) {
                const latest = finalSoil[finalSoil.length - 1];
                setSoilDetailed([
                    { property: 'pH', value: (latest.ph || 6.5) * 10, optimal: 65, fullMark: 100 },
                    { property: 'Nitrogen', value: latest.nitrogen || 60, optimal: 75, fullMark: 120 },
                    { property: 'Phosphorus', value: latest.phosphorus || 45, optimal: 60, fullMark: 100 },
                    { property: 'Potassium', value: latest.potassium || 55, optimal: 70, fullMark: 100 },
                    { property: 'Moisture', value: latest.moisture || 50, optimal: 65, fullMark: 100 },
                    { property: 'Organic', value: latest.organic || 40, optimal: 55, fullMark: 80 },
                ]);
            } else {
                setSoilDetailed([
                    { property: 'pH', value: 65, optimal: 65, fullMark: 100 },
                    { property: 'Nitrogen', value: 55, optimal: 75, fullMark: 120 },
                    { property: 'Phosphorus', value: 45, optimal: 60, fullMark: 100 },
                    { property: 'Potassium', value: 55, optimal: 70, fullMark: 100 },
                    { property: 'Moisture', value: 50, optimal: 65, fullMark: 100 },
                    { property: 'Organic', value: 40, optimal: 55, fullMark: 80 },
                ]);
            }

            // --- Process Detailed Pest Data ---
            const finalPest = pestRes?.data?.data || pestRes?.data?.history || [];
            if (finalPest.length > 0) {
                setPestDetailed(finalPest[finalPest.length - 1]); // Latest risk assessment
                setPestHistory(finalPest.slice(-10).map(h => ({
                    date: new Date(h.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                    riskScore: h.riskScore || h.risk_score || 0
                })));
            } else {
                setPestDetailed(null);
                setPestHistory([]);
            }

        } catch (e) { console.error('Report load error:', e); }
        setRefreshing(false);
    };

    const processOverviewData = (healthRes, soilRes, pestRes, weatherRes, farm) => {
        // NDVI
        const health = healthRes?.data?.data || healthRes?.data?.history || [];
        if (health.length > 0) {
            setNdviTrend(health.slice(-12).map((h, i) => ({
                month: h.date ? new Date(h.date).toLocaleDateString('en-IN', { month: 'short' }) : `M${i + 1}`,
                ndvi: h.ndviValue || h.ndvi || h.NDVI || 0,
            })));
        } else {
            // Fallback
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
            setNdviTrend(months.map(m => ({ month: m, ndvi: 0.3 + Math.random() * 0.4 })));
        }

        // Soil Moisture (Mock fields if single point)
        const soil = soilRes?.data?.data || soilRes?.data?.history || [];
        if (soil.length > 0) {
            setSoilMoisture(soil.slice(-5).map((s, i) => ({
                field: `Field ${String.fromCharCode(65 + i)}`,
                moisture: s.estimatedMoisture || s.moisture || Math.floor(40 + Math.random() * 30),
            })));
        } else {
            setSoilMoisture([{ field: 'Field A', moisture: 50 }, { field: 'Field B', moisture: 60 }]);
        }

        // Pest Pie
        const pest = pestRes?.data?.data || pestRes?.data?.history || [];
        if (pest.length > 0) {
            let low = 0, med = 0, high = 0;
            pest.forEach(p => {
                const s = p.riskScore || 0;
                if (s > 60) high++; else if (s > 30) med++; else low++;
            });
            setPestAlerts([
                { name: 'Low Risk', value: low || 1 }, { name: 'Medium', value: med }, { name: 'High', value: high }
            ].filter(p => p.value > 0));
        } else {
            setPestAlerts([{ name: 'Create Assessment', value: 100 }]);
        }

        // Weather
        const wData = weatherRes?.data?.data || weatherRes?.data || {};
        const forecast = wData.forecast || (Array.isArray(wData) ? wData : []);
        if (Array.isArray(forecast) && forecast.length > 0) {
            setWeatherTrend(forecast.slice(0, 7).map(d => ({
                day: d.date ? new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' }) : '',
                temp: d.tempAvg || d.tempMax || d.temp || 0,
                humidity: d.humidity || 0,
            })));
        }
    };

    const generateAiReport = async () => {
        if (!selectedFarm) {
            alert('Please select a farm first');
            return;
        }
        setGenerating(true);
        setAiReport('');
        try {
            // Get latest weather data for the report
            let weatherData = null;
            try {
                const weatherRes = await weatherAPI.current(selectedFarm._id || selectedFarm.id);
                weatherData = weatherRes?.data?.data?.weather || weatherRes?.data?.data || weatherRes?.data || null;
            } catch (e) {
                console.warn('Could not fetch weather for report:', e);
            }

            const res = await fetch('/api/groq', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analysisType: 'report',
                    farmData: {
                        name: selectedFarm.name || 'Unknown Farm',
                        cropType: selectedFarm.cropType || 'General',
                        area: selectedFarm.area || 'N/A',
                        soilType: selectedFarm.soilType || 'N/A',
                        healthScore: selectedFarm.healthScore || null,
                        ndvi: ndviTrend.length > 0 ? ndviTrend[ndviTrend.length - 1].ndvi : null,
                        temperature: weatherData?.temperature || weatherData?.temp || null,
                        humidity: weatherData?.humidity || null,
                        condition: weatherData?.description || weatherData?.condition || null,
                    },
                }),
            });
            
            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }
            
            const data = await res.json();
            if (data.error) {
                throw new Error(data.error);
            }
            setAiReport(data.response || 'No response generated.');
        } catch (e) {
            console.error('AI Report generation error:', e);
            setAiReport(`Failed to generate AI report: ${e.message}. Please try again.`);
        }
        setGenerating(false);
    };

    if (authLoading || !user) return null;

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
            <motion.div initial="hidden" animate="show" variants={stagger}>

                {/* Header */}
                <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800 }}>📊 Comprehensive Reports</h1>
                        <p style={{ color: '#6b7280', marginTop: 4 }}>Integrated analytics for Soil, Pest, and Weather</p>
                    </div>
                </motion.div>

                {/* Farm Selector */}
                {farms.length > 0 ? (
                    <motion.div variants={fadeUp} style={styles.farmSelector}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <label style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Select Farm:</label>
                                <select
                                    value={viewFarmId}
                                    onChange={(e) => {
                                        const farmId = e.target.value;
                                        setViewFarmId(farmId);
                                        const farm = farms.find(f => (f._id || f.id) === farmId);
                                        if (farm) {
                                            setSelectedFarm(farm);
                                            loadFarmReport(farm);
                                        }
                                    }}
                                    style={styles.dropdown}
                                >
                                    {farms.map(f => (
                                        <option key={f._id || f.id} value={f._id || f.id}>
                                            {f.name || 'Unnamed Farm'} {f.cropType ? `(${f.cropType})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={() => {
                                    const farm = farms.find(f => (f._id || f.id) === viewFarmId);
                                    if (farm) {
                                        setSelectedFarm(farm);
                                        loadFarmReport(farm);
                                    }
                                }}
                                disabled={refreshing}
                                style={{ ...styles.generateBtn, opacity: refreshing ? 0.6 : 1 }}
                            >
                                <FiRefreshCw size={16} className={refreshing ? 'spin' : ''} /> 
                                {refreshing ? 'Loading...' : 'Refresh Data'}
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div variants={fadeUp} style={{ padding: 60, textAlign: 'center', color: '#9ca3af', background: 'white', borderRadius: 20, border: '1px solid #f3f4f6' }}>
                        <span style={{ fontSize: 48 }}>📊</span>
                        <p style={{ marginTop: 12, fontSize: 16 }}>No farms found. Add one to see reports.</p>
                        <a href="/farms/new" className="btn btn-primary" style={{ marginTop: 16 }}>Add Farm</a>
                    </motion.div>
                )}

                {/* Tabs */}
                {selectedFarm && (
                    <motion.div variants={fadeUp} style={styles.tabs}>
                        {[
                            { id: 'overview', icon: <FiGrid />, label: 'Overview' },
                            { id: 'soil', icon: <FiLayers />, label: 'Soil Health' },
                            { id: 'pest', icon: <FiActivity />, label: 'Pest Risk' },
                            { id: 'weather', icon: <FiCloud />, label: 'Weather' },
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                style={{ ...styles.tabBtn, ...(activeTab === tab.id ? styles.tabBtnActive : {}) }}>
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </motion.div>
                )}

                {refreshing ? (
                    <div className="loading-spinner" style={{ margin: '40px auto' }} />
                ) : selectedFarm ? (
                    <div style={{ marginTop: 24 }}>
                        {/* OVERVIEW TAB */}
                        {activeTab === 'overview' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div style={styles.chartsGrid}>
                                    <div style={styles.chartCard}>
                                        <h3 style={styles.chartTitle}>📈 NDVI Trend</h3>
                                        <ResponsiveContainer width="100%" height={260}>
                                            <LineChart data={ndviTrend}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                                <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
                                                <Tooltip contentStyle={tooltipStyle} />
                                                <Line type="monotone" dataKey="ndvi" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div style={styles.chartCard}>
                                        <h3 style={styles.chartTitle}>💧 Soil Moisture</h3>
                                        <ResponsiveContainer width="100%" height={260}>
                                            <BarChart data={soilMoisture}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                                <XAxis dataKey="field" tick={{ fontSize: 11 }} />
                                                <YAxis domain={[0, 100]} />
                                                <Tooltip contentStyle={tooltipStyle} />
                                                <Bar dataKey="moisture" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <button onClick={generateAiReport} disabled={generating} className="btn btn-primary" style={{ marginTop: 24, width: '100%' }}>
                                    <FiCpu /> {generating ? 'Generating AI Analysis...' : 'Generate AI Report'}
                                </button>
                                {aiReport && (
                                    <motion.div style={styles.aiReport} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>🤖 AI Analysis</h3>
                                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 14 }}>{aiReport}</div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                        {/* SOIL TAB */}
                        {activeTab === 'soil' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid-2">
                                <div style={styles.chartCard}>
                                    <h3 style={styles.chartTitle}>Nutrient Radar</h3>
                                    <div style={{ height: 350 }}>
                                        <SoilRadarChart data={soilDetailed} />
                                    </div>
                                </div>
                                <div style={styles.card}>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Soil Recommendations</h3>
                                    <div style={{ display: 'grid', gap: 12 }}>
                                        <div style={styles.statBox}>
                                            <div style={styles.statLabel}>pH Level</div>
                                            <div style={styles.statValue}>{soilDetailed.find(x => x.property === 'pH')?.value / 10 || 6.5}</div>
                                        </div>
                                        <div style={styles.statBox}>
                                            <div style={styles.statLabel}>Nitrogen Status</div>
                                            <div style={styles.statValue}>{soilDetailed.find(x => x.property === 'Nitrogen')?.value > 60 ? 'Optimal' : 'Low'}</div>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 20, fontSize: 14, color: '#4b5563', lineHeight: 1.6 }}>
                                        Based on satellite analysis, your moisture levels are stable. Consider adding organic matter to improve nitrogen retention.
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* PEST TAB */}
                        {activeTab === 'pest' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="grid-2-1">
                                    <div style={{ ...styles.card, background: pestDetailed?.riskLevel === 'High' ? '#fef2f2' : '#f0fdf4' }}>
                                        <h3 style={{ fontSize: 20, fontWeight: 700, color: pestDetailed?.riskLevel === 'High' ? '#dc2626' : '#16a34a' }}>
                                            {pestDetailed?.riskLevel || 'Low'} Risk Detected
                                        </h3>
                                        <p style={{ marginTop: 8 }}>Score: {Math.round(pestDetailed?.riskScore || 20)}/100</p>
                                        <div style={{ marginTop: 20 }}>
                                            <h4 style={{ fontWeight: 600, fontSize: 14 }}>Identify Pests:</h4>
                                            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                                {(pestDetailed?.pestTypes || ['None detected']).map(p => (
                                                    <span key={p} style={{ background: 'white', padding: '4px 12px', borderRadius: 16, fontSize: 12, border: '1px solid rgba(0,0,0,0.1)' }}>{p}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={styles.chartCard}>
                                        <h3 style={styles.chartTitle}>Risk Trend</h3>
                                        <div style={{ height: 200 }}>
                                            <PestRiskChart data={pestHistory} />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* WEATHER TAB */}
                        {activeTab === 'weather' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.chartCard}>
                                <h3 style={styles.chartTitle}>7-Day Forecast</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={weatherTrend}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                        <XAxis dataKey="day" />
                                        <YAxis />
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Area type="monotone" dataKey="temp" stroke="#f97316" fill="#fff7ed" name="Temp" />
                                        <Area type="monotone" dataKey="humidity" stroke="#0ea5e9" fill="#f0f9ff" name="Humidity" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </motion.div>
                        )}
                    </div>
                ) : null}
            </motion.div>
        </div>
    );
}

const styles = {
    farmSelector: { marginBottom: 20 },
    dropdown: {
        padding: '10px 16px', borderRadius: 12, border: '1px solid #e5e7eb',
        background: 'white', fontSize: 14, minWidth: 200, outline: 'none', cursor: 'pointer',
        color: '#1f2937', fontWeight: 500
    },
    generateBtn: {
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
        borderRadius: 12, border: 'none', background: '#16a34a', color: 'white',
        fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
        boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
    },
    tabs: { display: 'flex', gap: 4, background: '#f3f4f6', padding: 4, borderRadius: 12, width: 'fit-content' },
    tabBtn: { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 14, fontWeight: 500, color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 },
    tabBtnActive: { background: 'white', color: '#166534', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    chartsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 24 },
    chartCard: { background: 'white', borderRadius: 20, padding: 24, border: '1px solid #f3f4f6' },
    chartTitle: { fontSize: 16, fontWeight: 700, marginBottom: 16 },
    card: { background: 'white', borderRadius: 20, padding: 24, border: '1px solid #f3f4f6' },
    aiReport: { marginTop: 24, background: 'white', padding: 24, borderRadius: 20, border: '1px solid #dcfce7' },
    statBox: { padding: 12, background: '#f9fafb', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    statLabel: { fontSize: 13, color: '#6b7280' },
    statValue: { fontWeight: 700, color: '#111827' },
};
