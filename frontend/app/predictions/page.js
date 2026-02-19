'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { mlAPI, farmAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { FiCpu, FiCheckCircle, FiInfo, FiZap } from 'react-icons/fi';

const FarmMap = dynamic(() => import('@/components/FarmMap'), { ssr: false, loading: () => <div className="skeleton" style={{ height: 450, borderRadius: 16 }} /> });

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

export default function PredictionsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [polygon, setPolygon] = useState(null);
    const [farms, setFarms] = useState([]);
    const [prediction, setPrediction] = useState(null);
    const [predicting, setPredicting] = useState(false);
    const [geeStatus, setGeeStatus] = useState(null);
    const [mode, setMode] = useState('draw'); // 'draw' or 'farm'

    useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

    useEffect(() => {
        if (!user) return;
        farmAPI.getAll().then(r => setFarms(r.data.data || r.data.farms || [])).catch(() => { });
        mlAPI.geeStatus().then(r => setGeeStatus(r.data.gee || r.data)).catch(() => { });
    }, [user]);

    const predictPolygon = async () => {
        if (!polygon || polygon.length < 3) return;
        setPredicting(true);
        setPrediction(null);
        try {
            const coords = polygon.map(p => [p.lng, p.lat]);
            coords.push(coords[0]); // close polygon
            const res = await mlAPI.predictPolygon({ polygon: coords });
            setPrediction(res.data.data || res.data);
        } catch (e) {
            setPrediction({ error: e.response?.data?.message || 'Prediction failed' });
        }
        setPredicting(false);
    };

    const predictFarm = async (farmId) => {
        setPredicting(true);
        setPrediction(null);
        try {
            const res = await mlAPI.predict(farmId);
            setPrediction(res.data.data || res.data);
        } catch (e) {
            setPrediction({ error: e.response?.data?.message || 'Prediction failed' });
        }
        setPredicting(false);
    };

    if (authLoading || !user) return <div className="loading-page"><div className="loading-spinner" /></div>;

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
            <motion.div initial="hidden" animate="show" variants={stagger}>
                <motion.div variants={fadeUp}>
                    <h1 style={{ fontSize: 28, fontWeight: 800 }}>🤖 ML Crop Health Prediction</h1>
                    <p style={{ color: '#6b7280', marginTop: 4 }}>Get AI-powered crop health analysis using satellite data</p>
                </motion.div>

                {/* GEE Status */}
                {geeStatus && (
                    <motion.div variants={fadeUp} style={styles.geeBanner}>
                        <span style={{ fontSize: 16 }}>{geeStatus.connected ? '🟢' : '🟡'}</span>
                        <span style={{ fontWeight: 500 }}>
                            Google Earth Engine: {geeStatus.connected ? 'Connected — Live GEE Data' : 'Using CSV/synthetic fallback'}
                        </span>
                    </motion.div>
                )}

                {/* Mode Toggle */}
                <motion.div variants={fadeUp} style={styles.modeToggle}>
                    <button onClick={() => setMode('draw')} style={{ ...styles.modeBtn, ...(mode === 'draw' ? styles.modeBtnActive : {}) }}>
                        🗺️ Draw Polygon
                    </button>
                    <button onClick={() => setMode('farm')} style={{ ...styles.modeBtn, ...(mode === 'farm' ? styles.modeBtnActive : {}) }}>
                        🌾 Select Farm
                    </button>
                </motion.div>

                <div style={styles.layout}>
                    {mode === 'draw' ? (
                        <motion.div variants={fadeUp} style={styles.mapCard}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                                Draw your area on the map — click to add points
                            </h3>
                            <FarmMap onPolygonChange={setPolygon} />
                            {polygon && polygon.length >= 3 && (
                                <button onClick={predictPolygon} disabled={predicting} className="btn btn-primary btn-lg"
                                    style={{ width: '100%', marginTop: 16 }}>
                                    <FiCpu /> {predicting ? 'Analyzing with AI...' : 'Run AI Prediction'}
                                </button>
                            )}
                            {polygon && polygon.length > 0 && polygon.length < 3 && (
                                <div style={{ marginTop: 12, fontSize: 14, color: '#f97316' }}>
                                    Need {3 - polygon.length} more point{polygon.length < 2 ? 's' : ''} to complete polygon
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div variants={fadeUp} style={styles.mapCard}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Select a farm to predict</h3>
                            {farms.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
                                    <p>No farms found. <a href="/farms/new" style={{ color: '#16a34a', fontWeight: 600 }}>Add a farm first</a></p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {farms.map(farm => (
                                        <button key={farm._id} onClick={() => predictFarm(farm._id)}
                                            disabled={predicting} style={styles.farmBtn}>
                                            <span style={{ fontSize: 24 }}>🌱</span>
                                            <div style={{ flex: 1, textAlign: 'left' }}>
                                                <div style={{ fontWeight: 600 }}>{farm.name}</div>
                                                <div style={{ fontSize: 13, color: '#6b7280' }}>{farm.cropType || 'Mixed'}</div>
                                            </div>
                                            <FiZap color="#16a34a" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Results */}
                    <motion.div variants={fadeUp} style={styles.resultCard}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📊 Prediction Results</h3>
                        {predicting ? (
                            <div style={{ textAlign: 'center', padding: 48 }}>
                                <div className="loading-spinner" style={{ margin: '0 auto' }} />
                                <p style={{ marginTop: 16, color: '#6b7280' }}>Fetching satellite data & running AI model...</p>
                            </div>
                        ) : prediction ? (
                            prediction.error ? (
                                <div style={{ color: '#dc2626', padding: 16, background: '#fef2f2', borderRadius: 12 }}>{prediction.error}</div>
                            ) : (
                                <PredictionResult data={prediction} />
                            )
                        ) : (
                            <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
                                <span style={{ fontSize: 48 }}>🛰️</span>
                                <p style={{ marginTop: 12 }}>Draw a polygon or select a farm to get predictions</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}

function PredictionResult({ data }) {
    const pred = data.prediction || data;
    const score = pred.health_score || 0;
    const ndvi = pred.predicted_ndvi || 0;
    const classification = pred.classification || '';
    const recs = pred.recommendations || [];
    const source = data.satellite?.source || data.satellite_data?.source || 'unknown';

    return (
        <div>
            <div style={styles.scoreSection}>
                <div style={{ ...styles.scoreRing, borderTopColor: score > 70 ? '#22c55e' : score > 40 ? '#f97316' : '#dc2626', borderRightColor: score > 70 ? '#22c55e' : score > 40 ? '#f97316' : '#dc2626', borderBottomColor: score > 70 ? '#22c55e' : score > 40 ? '#f97316' : '#dc2626', borderLeftColor: score > 70 ? '#22c55e' : score > 40 ? '#f97316' : '#dc2626' }}>
                    <div style={{ fontSize: 42, fontWeight: 900, color: score > 70 ? '#166534' : score > 40 ? '#ea580c' : '#dc2626' }}>
                        {score}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>/ 100</div>
                </div>
                <div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>Health Classification</div>
                    <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{classification}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>NDVI: <strong>{ndvi.toFixed(4)}</strong></div>
                    <div className={`badge ${score > 70 ? 'badge-healthy' : score > 40 ? 'badge-moderate' : 'badge-critical'}`} style={{ marginTop: 8 }}>
                        {source === 'google-earth-engine' ? '🛰️ Live GEE Data' : source === 'csv-fallback' ? '📄 Historical Data' : '🔮 Synthetic Data'}
                    </div>
                </div>
            </div>

            {recs.length > 0 && (
                <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>💡 Recommendations</div>
                    {recs.map((r, i) => (
                        <div key={i} style={styles.recItem}>
                            <FiCheckCircle color="#16a34a" size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                            <span>{r}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const styles = {
    geeBanner: {
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderRadius: 14,
        background: '#f0fdf4', border: '1px solid #dcfce7', marginTop: 16, fontSize: 14,
    },
    modeToggle: { display: 'flex', gap: 8, marginTop: 20 },
    modeBtn: {
        padding: '10px 20px', borderRadius: 12, borderWidth: 2, borderStyle: 'solid', borderColor: '#e5e7eb',
        background: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
    },
    modeBtnActive: { borderColor: '#16a34a', background: '#f0fdf4', color: '#166534' },
    layout: { display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24, marginTop: 20, alignItems: 'start' },
    mapCard: { background: 'white', borderRadius: 20, padding: 24, border: '1px solid #f3f4f6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
    resultCard: {
        background: 'white', borderRadius: 20, padding: 24, border: '1px solid #f3f4f6',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)', position: 'sticky', top: 80,
    },
    farmBtn: {
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14,
        border: '1px solid #f3f4f6', background: 'white', cursor: 'pointer', transition: 'all 0.2s', width: '100%',
    },
    scoreSection: { display: 'flex', gap: 24, alignItems: 'center' },
    scoreRing: {
        width: 100, height: 100, borderRadius: '50%', borderWidth: 4, borderStyle: 'solid',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: '#fafafa', flexShrink: 0,
    },
    recItem: { display: 'flex', gap: 8, fontSize: 14, color: '#374151', padding: '8px 0', borderBottom: '1px solid #f9fafb', alignItems: 'flex-start' },
};
