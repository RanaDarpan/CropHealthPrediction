'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { farmAPI, alertAPI, weatherAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { FiMap, FiCpu, FiCloud, FiBell, FiPlus, FiActivity, FiArrowRight, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

const WeatherTrendChart = dynamic(() => import('@/components/DataCharts').then(m => m.WeatherTrendChart), { ssr: false });

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [farms, setFarms] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [weatherData, setWeatherData] = useState([]);
    const [selectedFarmWeather, setSelectedFarmWeather] = useState(null);

    useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            try {
                const [farmRes, alertRes] = await Promise.all([
                    farmAPI.getAll().catch(() => ({ data: { data: [] } })),
                    alertAPI.getAll().catch(() => ({ data: { data: [] } })),
                ]);
                const farmList = farmRes.data.data || farmRes.data.farms || [];
                const alertList = alertRes.data.data || alertRes.data.alerts || [];
                setFarms(farmList);
                setAlerts(alertList);

                // Fetch weather forecast for first farm
                if (farmList.length > 0) {
                    setSelectedFarmWeather(farmList[0]);
                    try {
                        const forecastRes = await weatherAPI.forecast(farmList[0]._id);
                        const payload = forecastRes.data.data || forecastRes.data || {};
                        const fc = payload.forecast || (Array.isArray(payload) ? payload : []);
                        if (Array.isArray(fc)) {
                            setWeatherData(fc.slice(0, 7).map(d => ({
                                date: d.date ? new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' }) : '',
                                temp: d.tempAvg || d.tempMax || d.temp || d.temperature || 0,
                                humidity: d.humidity || 0,
                            })));
                        }
                    } catch { }
                }
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        load();
    }, [user]);

    if (authLoading || !user) return null;
    if (loading) return <div className="loading-page"><div className="loading-spinner" /><p>Loading dashboard...</p></div>;

    const unreadAlerts = alerts.filter(a => !a.read).length;
    const avgHealth = farms.length > 0 ? Math.round(farms.reduce((s, f) => s + (f.healthScore || 0), 0) / farms.length) : 0;
    const healthColor = avgHealth > 70 ? '#22c55e' : avgHealth > 40 ? '#f97316' : '#dc2626';
    const healthLabel = avgHealth > 70 ? 'Healthy' : avgHealth > 40 ? 'Moderate' : 'Needs Attention';

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
            <motion.div initial="hidden" animate="show" variants={stagger}>
                {/* Header */}
                <motion.div variants={fadeUp} style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 800 }}>👋 Welcome, {user?.name?.split(' ')[0] || 'Farmer'}!</h1>
                    <p style={{ color: '#6b7280', marginTop: 4 }}>Monitor your farms, weather, and AI predictions in one place.</p>
                </motion.div>

                {/* Stat Cards */}
                <div style={styles.statsGrid}>
                    <motion.div variants={fadeUp} style={styles.statCard}>
                        <div style={styles.statIcon}><FiMap size={22} /></div>
                        <div>
                            <div style={styles.statValue}>{farms.length}</div>
                            <div style={styles.statLabel}>Total Farms</div>
                        </div>
                    </motion.div>
                    <motion.div variants={fadeUp} style={styles.statCard}>
                        <div style={{ ...styles.statIcon, background: '#f0f9ff', color: '#0284c7' }}><FiActivity size={22} /></div>
                        <div>
                            <div style={{ ...styles.statValue, color: healthColor }}>{avgHealth}%</div>
                            <div style={styles.statLabel}>{healthLabel}</div>
                        </div>
                    </motion.div>
                    <motion.div variants={fadeUp} style={styles.statCard}>
                        <div style={{ ...styles.statIcon, background: '#fefce8', color: '#ca8a04' }}><FiBell size={22} /></div>
                        <div>
                            <div style={styles.statValue}>{unreadAlerts}</div>
                            <div style={styles.statLabel}>Unread Alerts</div>
                        </div>
                    </motion.div>
                    <motion.div variants={fadeUp} style={styles.statCard}>
                        <div style={{ ...styles.statIcon, background: '#faf5ff', color: '#7c3aed' }}><FiCpu size={22} /></div>
                        <div>
                            <div style={styles.statValue}>AI</div>
                            <div style={styles.statLabel}>Predictions Ready</div>
                        </div>
                    </motion.div>
                </div>

                {/* Quick Actions */}
                <motion.div variants={fadeUp} style={{ ...styles.card, marginTop: 24 }}>
                    <h3 style={styles.cardTitle}>⚡ Quick Actions</h3>
                    <div style={styles.actionsGrid}>
                        <Link href="/farms/new" style={styles.actionBtn}><FiPlus /> Add New Farm</Link>
                        <Link href="/predictions" style={styles.actionBtn}><FiCpu /> AI Predictions</Link>
                        <Link href="/weather" style={styles.actionBtn}><FiCloud /> Weather Intel</Link>
                        <Link href="/alerts" style={styles.actionBtn}><FiBell /> View Alerts</Link>
                    </div>
                </motion.div>

                {/* Main Grid: Farms + Weather */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
                    {/* My Farms */}
                    <motion.div variants={fadeUp} style={styles.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={styles.cardTitle}>🌱 My Farms</h3>
                            <Link href="/farms" style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>View All <FiArrowRight size={12} /></Link>
                        </div>
                        {farms.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                                <p>No farms yet</p>
                                <Link href="/farms/new" className="btn btn-primary" style={{ marginTop: 16 }}>Add Your First Farm</Link>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {farms.slice(0, 5).map(farm => (
                                    <Link key={farm._id} href={`/farms/${farm._id}`} style={styles.farmItem}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{farm.name}</div>
                                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                                                {farm.cropType && `🌾 ${farm.cropType}`} {farm.area && `· 📐 ${farm.area} ha`}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {farm.healthScore && (
                                                <span style={{ fontSize: 13, fontWeight: 700, color: farm.healthScore > 70 ? '#16a34a' : farm.healthScore > 40 ? '#f97316' : '#dc2626' }}>
                                                    {farm.healthScore}%
                                                </span>
                                            )}
                                            <FiArrowRight size={14} color="#9ca3af" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Weather Trend */}
                    <motion.div variants={fadeUp} style={styles.card}>
                        <h3 style={styles.cardTitle}>🌤️ Weather Forecast</h3>
                        {selectedFarmWeather && (
                            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>7-day forecast for {selectedFarmWeather.name}</p>
                        )}
                        {weatherData.length > 0 ? (
                            <WeatherTrendChart data={weatherData} />
                        ) : (
                            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                                <span style={{ fontSize: 40 }}>🌤️</span>
                                <p style={{ marginTop: 8, fontSize: 14 }}>Add a farm to see weather forecasts</p>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Farm Health Comparison */}
                {farms.length > 0 && (
                    <motion.div variants={fadeUp} style={{ ...styles.card, marginTop: 24 }}>
                        <h3 style={styles.cardTitle}>📊 Farm Health Comparison</h3>
                        <div style={styles.healthGrid}>
                            {farms.map(farm => {
                                const score = farm.healthScore || Math.floor(Math.random() * 40 + 50);
                                const pct = score;
                                const color = score > 70 ? '#22c55e' : score > 40 ? '#f97316' : '#dc2626';
                                return (
                                    <div key={farm._id} style={styles.healthBar}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>{farm.name}</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color }}>{score}%</span>
                                        </div>
                                        <div style={{ height: 8, borderRadius: 4, background: '#f3f4f6', overflow: 'hidden' }}>
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.3 }}
                                                style={{ height: '100%', borderRadius: 4, background: color }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* Recent Alerts */}
                <motion.div variants={fadeUp} style={{ ...styles.card, marginTop: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={styles.cardTitle}>🔔 Recent Alerts</h3>
                        <Link href="/alerts" style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>View All</Link>
                    </div>
                    {alerts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
                            <FiCheckCircle size={32} color="#22c55e" />
                            <p style={{ marginTop: 8, fontSize: 14 }}>No alerts — everything looks good!</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {alerts.slice(0, 5).map((alert, i) => (
                                <div key={alert._id || i} style={styles.alertItem}>
                                    <FiAlertTriangle color={alert.severity === 'critical' ? '#dc2626' : alert.severity === 'warning' ? '#f97316' : '#0ea5e9'} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 14, fontWeight: 500 }}>{alert.title || alert.message}</div>
                                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{alert.createdAt ? new Date(alert.createdAt).toLocaleDateString() : ''}</div>
                                    </div>
                                    {!alert.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />}
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </div>
    );
}

const styles = {
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 },
    statCard: {
        display: 'flex', alignItems: 'center', gap: 16, padding: 24,
        background: 'white', borderRadius: 20, border: '1px solid #f3f4f6',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    },
    statIcon: {
        width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f0fdf4', color: '#16a34a',
    },
    statValue: { fontSize: 28, fontWeight: 800, color: '#111827' },
    statLabel: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    card: { background: 'white', borderRadius: 20, padding: 24, border: '1px solid #f3f4f6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
    cardTitle: { fontSize: 18, fontWeight: 700, marginBottom: 0 },
    actionsGrid: { display: 'flex', gap: 12, flexWrap: 'wrap' },
    actionBtn: {
        display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
        borderRadius: 14, border: '1px solid #e5e7eb', fontSize: 14, fontWeight: 600,
        color: '#374151', transition: 'all 0.2s', background: '#fafafa',
    },
    farmItem: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderRadius: 14, background: '#f9fafb', border: '1px solid #f3f4f6',
        transition: 'all 0.2s',
    },
    healthGrid: { display: 'flex', flexDirection: 'column', gap: 14 },
    healthBar: {},
    alertItem: {
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
        borderRadius: 14, background: '#f9fafb', border: '1px solid #f3f4f6',
    },
};
