'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import { FiMenu, FiX, FiLogOut, FiGrid, FiMap, FiActivity, FiCloud, FiBell, FiCpu, FiBarChart2, FiBookOpen, FiLayers } from 'react-icons/fi';

export default function Navbar() {
    const { user, logout } = useAuth();
    const [open, setOpen] = useState(false);

    return (
        <nav style={styles.nav}>
            <div style={styles.inner}>
                <Link href={user ? '/dashboard' : '/'} style={styles.logo}>
                    <span style={styles.logoIcon}>🌾</span>
                    <span style={styles.logoText}>AgriSense</span>
                </Link>

                {user ? (
                    <>
                        <div style={{ ...styles.links, ...(open ? styles.linksOpen : {}) }}>
                            <NavLink href="/dashboard" icon={<FiGrid />} label="Dashboard" onClick={() => setOpen(false)} />
                            <NavLink href="/farms" icon={<FiMap />} label="Farms" onClick={() => setOpen(false)} />
                            <NavLink href="/predictions" icon={<FiCpu />} label="ML Predict" onClick={() => setOpen(false)} />
                            <NavLink href="/weather" icon={<FiCloud />} label="Weather" onClick={() => setOpen(false)} />
                            <NavLink href="/reports" icon={<FiBarChart2 />} label="Reports" onClick={() => setOpen(false)} />
                            <NavLink href="/advisory" icon={<FiBookOpen />} label="Advisory" onClick={() => setOpen(false)} />
                            <NavLink href="/alerts" icon={<FiBell />} label="Alerts" onClick={() => setOpen(false)} />
                            <div style={styles.userSection}>
                                <span style={styles.userName}>👤 {user.name?.split(' ')[0]}</span>
                                <button onClick={logout} style={styles.logoutBtn}><FiLogOut /> Logout</button>
                            </div>
                        </div>
                        <button onClick={() => setOpen(!open)} style={styles.hamburger}>
                            {open ? <FiX size={22} /> : <FiMenu size={22} />}
                        </button>
                    </>
                ) : (
                    <div style={styles.authLinks}>
                        <Link href="/login" className="btn btn-secondary btn-sm">Login</Link>
                        <Link href="/register" className="btn btn-primary btn-sm">Get Started</Link>
                    </div>
                )}
            </div>
        </nav>
    );
}

function NavLink({ href, icon, label, onClick }) {
    return (
        <Link href={href} onClick={onClick} style={styles.navLink}>
            {icon} {label}
        </Link>
    );
}

const styles = {
    nav: {
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
    },
    inner: {
        maxWidth: 1200, margin: '0 auto', padding: '0 24px',
        height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    logo: {
        display: 'flex', alignItems: 'center', gap: 8,
        textDecoration: 'none', color: '#166534',
    },
    logoIcon: { fontSize: 28 },
    logoText: { fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' },
    links: {
        display: 'flex', alignItems: 'center', gap: 4,
    },
    linksOpen: {},
    navLink: {
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 10, fontSize: 14, fontWeight: 500,
        color: '#374151', textDecoration: 'none',
        transition: 'all 0.2s',
    },
    userSection: {
        display: 'flex', alignItems: 'center', gap: 12, marginLeft: 12,
        borderLeft: '1px solid #e5e7eb', paddingLeft: 16,
    },
    userName: { fontSize: 14, fontWeight: 600, color: '#166534' },
    logoutBtn: {
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
        background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer',
    },
    authLinks: { display: 'flex', gap: 10 },
    hamburger: {
        display: 'none', background: 'none', border: 'none', padding: 8,
        color: '#374151', cursor: 'pointer',
    },
};
