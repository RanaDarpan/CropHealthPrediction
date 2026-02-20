'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { farmAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FiPlus, FiChevronRight, FiMapPin, FiCalendar } from 'react-icons/fi';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

export default function FarmsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [farms, setFarms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

    useEffect(() => {
        if (!user) return;
        farmAPI.getAll()
            .then(r => {
                console.log('Farms API Response:', r.data);
                // Backend returns: { success: true, farms: [...] } or { success: true, data: { farms: [...] } }
                const farmsData = r.data.farms || r.data.data?.farms || r.data.data || [];
                setFarms(Array.isArray(farmsData) ? farmsData : []);
                setError(null);
            })
            .catch((err) => {
                console.error('Failed to load farms:', err);
                setError('Failed to load farms. Please try refreshing.');
                setFarms([]);
            })
            .finally(() => setLoading(false));
    }, [user]);

    if (authLoading || !user) return <div className="loading-page"><div className="loading-spinner" /></div>;

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
            <motion.div initial="hidden" animate="show" variants={stagger}>
                <motion.div variants={fadeUp} style={styles.header}>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800 }}>🌾 My Farms</h1>
                        <p style={{ color: '#6b7280', marginTop: 4 }}>Manage your farm boundaries and monitor crop health</p>
                    </div>
                    <Link href="/farms/new" className="btn btn-primary"><FiPlus /> Add New Farm</Link>
                </motion.div>

                {error && (
                    <div style={{ padding: '12px 16px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', marginBottom: 20, border: '1px solid #fecaca' }}>
                        ⚠️ {error}
                    </div>
                )}

                {loading ? (
                    <div className="grid-3" style={{ marginTop: 24 }}>
                        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 20 }} />)}
                    </div>
                ) : farms.length === 0 ? (
                    <motion.div variants={fadeUp} style={styles.empty}>
                        <span style={{ fontSize: 64 }}>🗺️</span>
                        <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 16 }}>No Farms Yet</h2>
                        <p style={{ color: '#6b7280', marginTop: 8, maxWidth: 400 }}>
                            Start by adding your first farm. Draw boundaries on the map so we can monitor crop health with satellite data.
                        </p>
                        <Link href="/farms/new" className="btn btn-primary btn-lg" style={{ marginTop: 24 }}>
                            <FiPlus /> Add Your First Farm
                        </Link>
                    </motion.div>
                ) : (
                    <motion.div className="grid-3" variants={stagger} style={{ marginTop: 24 }}>
                        {farms.map(farm => (
                            <motion.div key={farm._id || farm.id} variants={fadeUp} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                                <Link href={`/farms/${farm._id || farm.id}`} style={styles.card}>
                                    <div style={styles.cardTop}>
                                        <span style={{ fontSize: 36 }}>🌱</span>
                                        <span className={`badge ${farm.healthScore > 70 ? 'badge-healthy' : farm.healthScore > 40 ? 'badge-moderate' : 'badge-poor'}`}>
                                            {farm.healthScore ? `${Math.round(farm.healthScore)}%` : 'New'}
                                        </span>
                                    </div>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 16, color: '#111827' }}>{farm.name || 'Unnamed Farm'}</h3>
                                    <div style={styles.meta}>
                                        <span><FiMapPin size={13} /> {farm.location || farm.geometry ? 'Location set' : 'No location'}</span>
                                        <span>{farm.cropType || 'Mixed Crop'}</span>
                                    </div>
                                    <div style={styles.meta}>
                                        <span>{farm.area ? `${parseFloat(farm.area).toFixed(2)} hectares` : 'Area: --'}</span>
                                        {farm.plantingDate && (
                                            <span><FiCalendar size={13} /> {new Date(farm.plantingDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                                        )}
                                    </div>
                                    <div style={styles.cardAction}>
                                        View Details <FiChevronRight size={14} />
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}

const styles = {
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
    empty: { textAlign: 'center', padding: '80px 24px', background: 'white', borderRadius: 24, marginTop: 32, border: '1px solid #f3f4f6' },
    card: {
        display: 'block', background: 'white', borderRadius: 20, padding: 24,
        border: '1px solid #f3f4f6', transition: 'all 0.3s', textDecoration: 'none', color: 'inherit',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    },
    cardHover: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)', transform: 'translateY(-2px)',
    },
    cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    meta: { display: 'flex', gap: 12, marginTop: 8, fontSize: 13, color: '#6b7280', alignItems: 'center' },
    cardAction: {
        marginTop: 16, paddingTop: 16, borderTop: '1px solid #f3f4f6',
        fontSize: 14, fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4,
    },
};
