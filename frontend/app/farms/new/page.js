'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { farmAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { FiArrowLeft, FiSave, FiMap } from 'react-icons/fi';

const FarmMap = dynamic(() => import('@/components/FarmMap'), { ssr: false, loading: () => <div className="skeleton" style={{ height: 500, borderRadius: 16 }} /> });

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function NewFarmPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [form, setForm] = useState({ name: '', cropType: '', area: '', soilType: '' });
    const [polygon, setPolygon] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

    const handlePolygonChange = (points) => {
        setPolygon(points);
        // Auto-calculate area in hectares from polygon
        if (points.length >= 3) {
            const pts = points.map(ll => {
                const lat = ll.lat * Math.PI / 180;
                const lng = ll.lng * Math.PI / 180;
                const R = 6371000;
                return { x: R * lng * Math.cos(lat), y: R * lat };
            });
            let area = 0;
            for (let i = 0; i < pts.length; i++) {
                const j = (i + 1) % pts.length;
                area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
            }
            area = Math.abs(area) / 2 / 10000;
            setForm(prev => ({ ...prev, area: area.toFixed(2) }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.name.trim()) { setError('Farm name is required'); return; }
        if (polygon.length < 3) { setError('Draw your farm boundary on the map (minimum 3 points)'); return; }

        setSaving(true);
        try {
            const coords = polygon.map(p => [p.lng, p.lat]);
            coords.push(coords[0]); // close the ring
            await farmAPI.create({
                name: form.name,
                cropType: form.cropType,
                area: parseFloat(form.area) || 0,
                soilType: form.soilType,
                geometry: { type: 'Polygon', coordinates: [coords] },
            });
            router.push('/farms');
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to create farm');
        }
        setSaving(false);
    };

    if (authLoading || !user) return <div className="loading-page"><div className="loading-spinner" /><p>Loading...</p></div>;

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 60, maxWidth: 960 }}>
            <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
                <motion.div variants={fadeUp}>
                    <Link href="/farms" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#16a34a', fontWeight: 500 }}><FiArrowLeft /> Back to Farms</Link>
                </motion.div>

                <motion.div variants={fadeUp} style={{ marginTop: 16, marginBottom: 32 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 800 }}>🌱 Add New Farm</h1>
                    <p style={{ color: '#6b7280', marginTop: 4 }}>Draw your farm boundary on the satellite map and fill in the details below.</p>
                </motion.div>

                {error && (
                    <motion.div variants={fadeUp} style={styles.error}>{error}</motion.div>
                )}

                {/* Step 1: Map */}
                <motion.div variants={fadeUp} style={styles.card}>
                    <div style={styles.stepBadge}>
                        <span style={styles.stepNum}>1</span>
                        <div>
                            <h3 style={{ fontSize: 18, fontWeight: 700 }}>📍 Draw Farm Boundary</h3>
                            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Search for your location, then use the polygon tool on the left toolbar to draw your farm boundary.</p>
                        </div>
                    </div>
                    <FarmMap onPolygonChange={handlePolygonChange} />
                </motion.div>

                {/* Step 2: Form */}
                <motion.div variants={fadeUp} style={{ ...styles.card, marginTop: 24 }}>
                    <div style={styles.stepBadge}>
                        <span style={styles.stepNum}>2</span>
                        <div>
                            <h3 style={{ fontSize: 18, fontWeight: 700 }}>📋 Farm Details</h3>
                            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Provide basic information about your farm.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.formGrid}>
                            <div style={styles.field}>
                                <label style={styles.label}>Farm Name *</label>
                                <input style={styles.input} placeholder="e.g. Sharma Family Farm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Crop Type</label>
                                <select style={styles.input} value={form.cropType} onChange={e => setForm({ ...form, cropType: e.target.value })}>
                                    <option value="">Select crop type</option>
                                    <option value="rice">🌾 Rice</option>
                                    <option value="wheat">🌾 Wheat</option>
                                    <option value="cotton">🌿 Cotton</option>
                                    <option value="sugarcane">🎋 Sugarcane</option>
                                    <option value="maize">🌽 Maize</option>
                                    <option value="soybean">🫘 Soybean</option>
                                    <option value="groundnut">🥜 Groundnut</option>
                                    <option value="vegetables">🥬 Vegetables</option>
                                    <option value="fruits">🍎 Fruits</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Area (hectares)</label>
                                <input style={{ ...styles.input, background: polygon.length >= 3 ? '#f0fdf4' : 'white' }}
                                    placeholder="Auto-calculated from polygon" type="number" step="0.01"
                                    value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}
                                    readOnly={polygon.length >= 3} />
                                {polygon.length >= 3 && <span style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>✅ Auto-calculated from drawn boundary</span>}
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Soil Type</label>
                                <select style={styles.input} value={form.soilType} onChange={e => setForm({ ...form, soilType: e.target.value })}>
                                    <option value="">Select soil type</option>
                                    <option value="alluvial">Alluvial</option>
                                    <option value="black">Black (Regur)</option>
                                    <option value="red">Red</option>
                                    <option value="laterite">Laterite</option>
                                    <option value="sandy">Sandy</option>
                                    <option value="clay">Clay</option>
                                    <option value="loam">Loam</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <Link href="/farms" className="btn btn-secondary">Cancel</Link>
                            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                                <FiSave /> {saving ? 'Saving...' : 'Create Farm'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </div>
    );
}

const styles = {
    card: { background: 'white', borderRadius: 20, padding: 28, border: '1px solid #f3f4f6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
    stepBadge: { display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 },
    stepNum: {
        width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg,#16a34a,#0ea5e9)', color: 'white', fontSize: 14, fontWeight: 800, flexShrink: 0,
    },
    error: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 18px', borderRadius: 14, marginBottom: 24, fontSize: 14 },
    form: { marginTop: 8 },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 },
    field: { display: 'flex', flexDirection: 'column' },
    label: { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
    input: {
        padding: '12px 16px', borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 14,
        transition: 'border-color 0.2s', outline: 'none', fontFamily: 'inherit',
    },
};
