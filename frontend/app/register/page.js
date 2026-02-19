'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiLock, FiPhone, FiArrowRight } from 'react-icons/fi';

export default function RegisterPage() {
    const { register } = useAuth();
    const router = useRouter();
    const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
        setLoading(true);
        try {
            await register(form);
            router.push('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        }
        setLoading(false);
    };

    return (
        <div style={styles.page}>
            <motion.div style={styles.card} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div style={styles.header}>
                    <span style={{ fontSize: 40 }}>🌱</span>
                    <h1 style={styles.title}>Create Account</h1>
                    <p style={styles.sub}>Start monitoring your crops with AI</p>
                </div>
                {error && <div style={styles.error}>{error}</div>}
                <form onSubmit={handleSubmit} style={styles.form}>
                    <div className="input-group">
                        <label><FiUser size={13} /> Full Name</label>
                        <input className="input-field" type="text" placeholder="Rajesh Patel" required
                            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="input-group">
                        <label><FiMail size={13} /> Email</label>
                        <input className="input-field" type="email" placeholder="rajesh@farm.com" required
                            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="input-group">
                        <label><FiPhone size={13} /> Phone (Optional)</label>
                        <input className="input-field" type="tel" placeholder="+91 98765 43210"
                            value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div className="input-group">
                        <label><FiLock size={13} /> Password</label>
                        <input className="input-field" type="password" placeholder="Min 6 characters" required
                            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
                        style={{ width: '100%', marginTop: 8 }}>
                        {loading ? 'Creating...' : 'Create Account'} <FiArrowRight />
                    </button>
                </form>
                <p style={styles.footer}>
                    Already have an account? <Link href="/login" style={styles.link}>Sign in</Link>
                </p>
            </motion.div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(145deg, #f0fdf4, #dcfce7, #f0f9ff)', padding: 24,
    },
    card: {
        background: 'white', borderRadius: 24, padding: 48, width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.08)', border: '1px solid #f3f4f6',
    },
    header: { textAlign: 'center', marginBottom: 32 },
    title: { fontSize: 28, fontWeight: 800, color: '#111827', marginTop: 12 },
    sub: { fontSize: 14, color: '#6b7280', marginTop: 4 },
    form: { display: 'flex', flexDirection: 'column', gap: 20 },
    error: {
        background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: 12,
        fontSize: 14, marginBottom: 16, border: '1px solid #fecaca',
    },
    footer: { textAlign: 'center', fontSize: 14, color: '#6b7280', marginTop: 24 },
    link: { color: '#16a34a', fontWeight: 600 },
};
