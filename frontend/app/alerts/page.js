'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { alertAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { FiCheck, FiTrash2, FiCheckCircle, FiBell } from 'react-icons/fi';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

export default function AlertsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

    useEffect(() => {
        if (!user) return;
        alertAPI.getAll().then(r => setAlerts(r.data.data || r.data.alerts || []))
            .catch(() => { }).finally(() => setLoading(false));
    }, [user]);

    const markRead = async (id) => {
        try {
            await alertAPI.markRead(id);
            setAlerts(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a));
        } catch (e) { console.error(e); }
    };

    const markAllRead = async () => {
        try {
            await alertAPI.markAllRead();
            setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
        } catch (e) { console.error(e); }
    };

    const deleteAlert = async (id) => {
        try {
            await alertAPI.delete(id);
            setAlerts(prev => prev.filter(a => a._id !== id));
        } catch (e) { console.error(e); }
    };

    if (authLoading || !user) return <div className="loading-page"><div className="loading-spinner" /></div>;

    const unread = alerts.filter(a => !a.isRead).length;

    const getPriorityColor = (p) => {
        if (p === 'urgent' || p === 'critical') return { bg: '#fef2f2', border: '#dc2626', icon: '🔴' };
        if (p === 'warning' || p === 'high') return { bg: '#fff7ed', border: '#f97316', icon: '🟠' };
        if (p === 'info') return { bg: '#f0f9ff', border: '#0ea5e9', icon: '🔵' };
        return { bg: '#f0fdf4', border: '#22c55e', icon: '🟢' };
    };

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
            <motion.div initial="hidden" animate="show" variants={stagger}>
                <motion.div variants={fadeUp} style={styles.header}>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800 }}>🔔 Alerts & Notifications</h1>
                        <p style={{ color: '#6b7280', marginTop: 4 }}>
                            {unread > 0 ? `${unread} unread alert${unread > 1 ? 's' : ''}` : 'All caught up!'}
                        </p>
                    </div>
                    {unread > 0 && (
                        <button onClick={markAllRead} className="btn btn-secondary btn-sm">
                            <FiCheckCircle /> Mark All Read
                        </button>
                    )}
                </motion.div>

                {/* Notification Preferences Info */}
                <motion.div variants={fadeUp} style={styles.notifInfo}>
                    <FiBell color="#16a34a" size={16} />
                    <span>Alerts are sent via <strong>email</strong> and <strong>phone SMS</strong> for critical conditions like frost, pest outbreaks, and drought.</span>
                </motion.div>

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
                        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16 }} />)}
                    </div>
                ) : alerts.length === 0 ? (
                    <motion.div variants={fadeUp} style={styles.empty}>
                        <span style={{ fontSize: 64 }}>✅</span>
                        <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 16 }}>No Alerts</h2>
                        <p style={{ color: '#6b7280', marginTop: 8 }}>
                            You&apos;re all caught up! Alerts will appear here when we detect issues with your crops.
                        </p>
                    </motion.div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
                        {alerts.map(alert => {
                            const pc = getPriorityColor(alert.priority);
                            return (
                                <motion.div key={alert._id} variants={fadeUp}
                                    style={{ ...styles.alertCard, background: alert.isRead ? '#fafafa' : pc.bg, borderLeft: `4px solid ${pc.border}`, opacity: alert.isRead ? 0.7 : 1 }}>
                                    <span style={{ fontSize: 20, flexShrink: 0 }}>{pc.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: alert.isRead ? 500 : 700, fontSize: 15 }}>{alert.message || alert.title}</div>
                                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2, display: 'flex', gap: 12 }}>
                                            <span>{alert.type}</span>
                                            {alert.farmName && <span>• {alert.farmName}</span>}
                                            <span>• {alert.createdAt ? new Date(alert.createdAt).toLocaleDateString('en-IN') : '--'}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {!alert.isRead && (
                                            <button onClick={() => markRead(alert._id)} style={styles.actionBtn} title="Mark read">
                                                <FiCheck size={16} />
                                            </button>
                                        )}
                                        <button onClick={() => deleteAlert(alert._id)} style={{ ...styles.actionBtn, color: '#dc2626' }} title="Delete">
                                            <FiTrash2 size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </motion.div>
        </div>
    );
}

const styles = {
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
    notifInfo: {
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderRadius: 14,
        background: '#f0fdf4', border: '1px solid #dcfce7', marginTop: 16, fontSize: 14, color: '#374151',
    },
    empty: {
        textAlign: 'center', padding: '80px 24px', background: 'white', borderRadius: 24, marginTop: 32, border: '1px solid #f3f4f6',
    },
    alertCard: {
        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderRadius: 16,
        transition: 'all 0.2s',
    },
    actionBtn: {
        width: 34, height: 34, borderRadius: 10, border: 'none', background: 'rgba(0,0,0,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        color: '#374151', transition: 'all 0.2s',
    },
};
