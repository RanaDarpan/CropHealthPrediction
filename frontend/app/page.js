'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { FiActivity, FiCloud, FiCpu, FiMap, FiShield, FiBell, FiArrowRight, FiCheckCircle, FiGlobe, FiDatabase, FiZap, FiStar, FiGithub, FiTwitter, FiLinkedin, FiMail } from 'react-icons/fi';
import { useAuth } from '@/lib/auth';

const fadeUp = { hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } };
const fadeIn = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.8 } } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };
const scaleUp = { hidden: { opacity: 0, scale: 0.85 }, show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };

// --- Animated counter hook ---
function useCounter(target, duration = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) setStarted(true);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  return [count, ref];
}

export default function LandingPage() {
  const { user } = useAuth();
  const [particles, setParticles] = useState([]);
  const [mounted, setMounted] = useState(false);

  // Fix hydration: generate particles only on client
  useEffect(() => {
    setMounted(true);
    const emojis = ['🌿', '🌱', '☘️', '🍀', '🍃', '🌾'];
    const pts = Array.from({ length: 25 }, (_, i) => ({
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 8}s`,
      animationDuration: `${8 + Math.random() * 12}s`,
      fontSize: `${14 + Math.random() * 18}px`,
      opacity: 0.12 + Math.random() * 0.12,
      emoji: emojis[i % 6],
    }));
    setParticles(pts);
  }, []);

  const [farmCount, farmRef] = useCounter(2500, 2000);
  const [predCount, predRef] = useCounter(50000, 2400);
  const [accCount, accRef] = useCounter(99, 1800);
  const [satCount, satRef] = useCounter(13, 1200);

  return (
    <div style={{ overflow: 'hidden' }}>
      {/* ═══ NAVBAR ═══ */}
      <nav style={styles.navbar}>
        <div className="container" style={styles.navInner}>
          <Link href="/" style={styles.logo}>
            <span style={styles.logoIcon}>🌾</span>
            <span style={styles.logoText}>AgriSense</span>
          </Link>
          <div style={styles.navLinks}>
            <Link href="#features" style={styles.navLink}>Features</Link>
            <Link href="#how" style={styles.navLink}>How It Works</Link>
            <Link href="#tech" style={styles.navLink}>Technology</Link>
            {user ? (
              <Link href="/dashboard" className="btn btn-primary" style={{ padding: '10px 24px' }}>Dashboard</Link>
            ) : (
              <>
                <Link href="/login" style={styles.navLink}>Login</Link>
                <Link href="/register" className="btn btn-primary" style={{ padding: '10px 24px' }}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={styles.hero}>
        {/* Animated mesh gradient background */}
        <div style={styles.heroMeshBg} />
        <div style={styles.heroGlowOrb1} />
        <div style={styles.heroGlowOrb2} />
        <div style={styles.heroGlowOrb3} />

        {/* Particles (client-only to fix hydration) */}
        <div style={styles.heroBg}>
          {mounted && particles.map((p, i) => (
            <span key={i} style={{ ...styles.particle, left: p.left, animationDelay: p.animationDelay, animationDuration: p.animationDuration, fontSize: p.fontSize, opacity: p.opacity }}>
              {p.emoji}
            </span>
          ))}
        </div>

        <motion.div style={styles.heroContent} initial="hidden" animate="show" variants={stagger}>
          <motion.div variants={fadeUp} style={styles.heroBadge}>
            <span style={styles.badgeDot} /> AI-Powered Precision Agriculture
          </motion.div>

          <motion.h1 variants={fadeUp} style={styles.heroTitle}>
            Revolutionize Your<br />
            <span style={styles.heroGradientText}>Farm Intelligence</span>
          </motion.h1>

          <motion.p variants={fadeUp} style={styles.heroSub}>
            Harness Sentinel-2 satellite imagery, Google Earth Engine processing, and XGBoost ML models to monitor crop health, predict yields, and get real-time actionable insights.
          </motion.p>

          <motion.div variants={fadeUp} style={styles.heroCta}>
            <Link href={user ? '/dashboard' : '/register'} className="btn btn-primary btn-lg" style={styles.heroBtn}>
              {user ? 'Go to Dashboard' : 'Start Free — No Credit Card'} <FiArrowRight />
            </Link>
            <Link href="#features" className="btn btn-secondary btn-lg" style={styles.heroBtn2}>
              Explore Features
            </Link>
          </motion.div>

          {/* Floating stat cards */}
          <motion.div variants={fadeUp} style={styles.heroCards}>
            {[
              { icon: '🛰️', value: '13 Bands', label: 'Sentinel-2 Data', bg: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.1))' },
              { icon: '🤖', value: '99.92%', label: 'ML Accuracy (R²)', bg: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))' },
              { icon: '🌍', value: 'Real-time', label: 'GEE Processing', bg: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(249,115,22,0.1))' },
              { icon: '⚡', value: 'Instant', label: 'Smart Alerts', bg: 'linear-gradient(135deg, rgba(236,72,153,0.1), rgba(239,68,68,0.1))' },
            ].map((card, i) => (
              <motion.div key={i} variants={scaleUp} style={{ ...styles.heroCard, background: card.bg }} whileHover={{ y: -6, scale: 1.02 }}>
                <span style={{ fontSize: 28 }}>{card.icon}</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>{card.value}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{card.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ TRUSTED BY / TECH LOGOS ═══ */}
      <section style={styles.trustedSection}>
        <div className="container">
          <p style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', marginBottom: 20 }}>Powered By Industry-Leading Technology</p>
          <div style={styles.trustedLogos}>
            {['Google Earth Engine', 'Sentinel-2 ESA', 'XGBoost ML', 'OpenWeather API', 'Leaflet Maps', 'MongoDB Atlas'].map((name, i) => (
              <div key={i} style={styles.trustedItem}>
                <span style={{ fontSize: 18 }}>{['🌍', '🛰️', '🤖', '🌤️', '🗺️', '🗄️'][i]}</span>
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" style={styles.featuresSection}>
        <div className="container">
          <motion.div style={styles.sectionHeader} initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} style={styles.sectionTag}>✨ Core Features</motion.div>
            <motion.h2 variants={fadeUp} style={styles.sectionTitle}>Everything Your Farm Needs</motion.h2>
            <motion.p variants={fadeUp} style={styles.sectionSub}>Powerful tools designed for modern precision agriculture</motion.p>
          </motion.div>
          <motion.div className="grid-3" initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            {features.map((f, i) => (
              <motion.div key={i} variants={fadeUp} style={styles.featureCard} whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}>
                <div style={{ ...styles.featureIcon, background: f.bg }}>{f.icon}</div>
                <h3 style={styles.featureTitle}>{f.title}</h3>
                <p style={styles.featureDesc}>{f.desc}</p>
                <div style={styles.featureList}>
                  {f.points.map((p, j) => (
                    <div key={j} style={styles.featurePoint}><FiCheckCircle color="#16a34a" size={14} /> {p}</div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" style={styles.howSection}>
        <div className="container">
          <motion.div style={styles.sectionHeader} initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} style={styles.sectionTag}>🔄 Simple Process</motion.div>
            <motion.h2 variants={fadeUp} style={styles.sectionTitle}>How It Works</motion.h2>
            <motion.p variants={fadeUp} style={styles.sectionSub}>From satellite to insights in four simple steps</motion.p>
          </motion.div>
          <motion.div style={styles.stepsContainer} initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            {/* Connecting line */}
            <div style={styles.stepsLine} />
            <div style={styles.stepsGrid}>
              {steps.map((s, i) => (
                <motion.div key={i} variants={fadeUp} style={styles.stepCard} whileHover={{ y: -4 }}>
                  <div style={styles.stepBadge}>{i + 1}</div>
                  <div style={styles.stepIconWrap}>
                    <span style={{ fontSize: 40 }}>{s.icon}</span>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 16, color: '#111827' }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: '#6b7280', marginTop: 8, lineHeight: 1.6 }}>{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section style={styles.statsSection}>
        <div className="container">
          <motion.div style={styles.statsGrid} initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={scaleUp} style={styles.statBox} ref={farmRef}>
              <div style={styles.statNum}>{farmCount.toLocaleString()}+</div>
              <div style={styles.statLabel}>Farms Monitored</div>
            </motion.div>
            <motion.div variants={scaleUp} style={styles.statBox} ref={predRef}>
              <div style={styles.statNum}>{predCount.toLocaleString()}+</div>
              <div style={styles.statLabel}>Predictions Made</div>
            </motion.div>
            <motion.div variants={scaleUp} style={styles.statBox} ref={accRef}>
              <div style={styles.statNum}>{accCount}%+</div>
              <div style={styles.statLabel}>Model Accuracy</div>
            </motion.div>
            <motion.div variants={scaleUp} style={styles.statBox} ref={satRef}>
              <div style={styles.statNum}>{satCount}</div>
              <div style={styles.statLabel}>Satellite Bands</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ TECHNOLOGY ═══ */}
      <section id="tech" style={styles.techSection}>
        <div className="container">
          <motion.div style={styles.sectionHeader} initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp} style={styles.sectionTag}>🔬 Technology</motion.div>
            <motion.h2 variants={fadeUp} style={styles.sectionTitle}>Built on Cutting-Edge Stack</motion.h2>
            <motion.p variants={fadeUp} style={styles.sectionSub}>Enterprise-grade technology for reliable agricultural insights</motion.p>
          </motion.div>
          <motion.div style={styles.techGrid} initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            {techStack.map((t, i) => (
              <motion.div key={i} variants={fadeUp} style={styles.techCard} whileHover={{ y: -4, borderColor: '#16a34a' }}>
                <span style={{ fontSize: 32 }}>{t.icon}</span>
                <h4 style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>{t.name}</h4>
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6, lineHeight: 1.6 }}>{t.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={styles.ctaSection}>
        <div style={styles.ctaGlow1} />
        <div style={styles.ctaGlow2} />
        <motion.div style={styles.ctaInner} initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} style={styles.ctaBadge}>🚀 Get Started Today</motion.div>
          <motion.h2 variants={fadeUp} style={{ fontSize: 42, fontWeight: 900, color: 'white', lineHeight: 1.2, letterSpacing: '-0.03em' }}>
            Ready to Transform<br />Your Farm?
          </motion.h2>
          <motion.p variants={fadeUp} style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', maxWidth: 500, margin: '20px auto 0', lineHeight: 1.7 }}>
            Join thousands of farmers using satellite AI to grow smarter, healthier crops with real-time insights.
          </motion.p>
          <motion.div variants={fadeUp} style={{ marginTop: 36, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" className="btn btn-lg" style={styles.ctaBtn}>
              Start Free — No Credit Card <FiArrowRight />
            </Link>
          </motion.div>
          <motion.div variants={fadeIn} style={{ marginTop: 20, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
            ✓ Free forever plan &nbsp; ✓ No credit card required &nbsp; ✓ Cancel anytime
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={styles.footer}>
        <div className="container">
          <div style={styles.footerGrid}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>🌾</span>
                <span style={{ fontWeight: 800, fontSize: 20, color: '#111827' }}>AgriSense</span>
              </div>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, maxWidth: 280 }}>
                AI-powered precision agriculture platform using satellite imagery and machine learning for smarter farming decisions.
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                {[FiGithub, FiTwitter, FiLinkedin, FiMail].map((Icon, i) => (
                  <a key={i} href="#" style={styles.socialBtn}><Icon size={16} /></a>
                ))}
              </div>
            </div>
            <div>
              <h4 style={styles.footerHead}>Platform</h4>
              {['Dashboard', 'Farm Management', 'ML Predictions', 'Weather Intel', 'Alerts'].map((item, i) => (
                <Link key={i} href={['dashboard', 'farms', 'predictions', 'weather', 'alerts'][i] ? `/${['dashboard', 'farms', 'predictions', 'weather', 'alerts'][i]}` : '#'} style={styles.footerLink}>{item}</Link>
              ))}
            </div>
            <div>
              <h4 style={styles.footerHead}>Technology</h4>
              {['Sentinel-2 Satellite', 'Google Earth Engine', 'XGBoost ML Model', 'OpenWeather API', 'Leaflet Maps'].map((item, i) => (
                <span key={i} style={styles.footerLink}>{item}</span>
              ))}
            </div>
            <div>
              <h4 style={styles.footerHead}>Resources</h4>
              {['Documentation', 'API Reference', 'Community', 'Support', 'Blog'].map((item, i) => (
                <span key={i} style={styles.footerLink}>{item}</span>
              ))}
            </div>
          </div>
          <div style={styles.footerBottom}>
            <span style={{ color: '#9ca3af', fontSize: 13 }}>© 2024 AgriSense. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#9ca3af' }}>
              <a href="#" style={{ transition: 'color 0.2s' }}>Privacy</a>
              <a href="#" style={{ transition: 'color 0.2s' }}>Terms</a>
              <a href="#" style={{ transition: 'color 0.2s' }}>Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Data ───

const features = [
  { icon: <FiMap size={24} />, title: 'Interactive Farm Map', desc: 'Draw precise farm boundaries with polygon tools, search locations, and manage multiple fields with satellite imagery overlay.', bg: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', points: ['Leaflet + Geoman tools', 'Search any location', 'Draw/edit polygon boundaries'] },
  { icon: <FiActivity size={24} />, title: 'Crop Health Analysis', desc: 'Get detailed health scores using NDVI, EVI, SAVI vegetation indices from 13-band Sentinel-2 satellite data.', bg: 'linear-gradient(135deg,#e0f2fe,#bae6fd)', points: ['13-band satellite data', 'Vegetation index tracking', 'Health score 0-100'] },
  { icon: <FiCpu size={24} />, title: 'ML Predictions', desc: 'XGBoost model trained on 6 years of satellite data predicts crop health with 99.92% R² accuracy.', bg: 'linear-gradient(135deg,#fef9c3,#fef08a)', points: ['Google Earth Engine', 'Real-time predictions', 'Actionable recommendations'] },
  { icon: <FiCloud size={24} />, title: 'Weather Intelligence', desc: 'Real-time weather data with 7-day forecast, agricultural advisories, and auto alerts for your farm.', bg: 'linear-gradient(135deg,#dbeafe,#bfdbfe)', points: ['OpenWeather integration', '7-day forecast', 'Farming advisories'] },
  { icon: <FiShield size={24} />, title: 'Pest Risk Alerts', desc: 'AI-powered pest risk assessment combining weather, crop stage, and satellite health data.', bg: 'linear-gradient(135deg,#fce7f3,#fbcfe8)', points: ['Risk level scoring', 'Prevention tips', 'Treatment guidance'] },
  { icon: <FiBell size={24} />, title: 'Smart Notifications', desc: 'Get alerts via email and phone for critical conditions — frost, pest outbreaks, drought, and more.', bg: 'linear-gradient(135deg,#fed7aa,#fdba74)', points: ['Email notifications', 'Phone SMS alerts', 'Priority-based alerts'] },
];

const steps = [
  { icon: '📍', title: 'Select Your Farm', desc: 'Search your location and draw precise farm boundaries using polygon tools on the interactive map.' },
  { icon: '🛰️', title: 'Satellite Scans', desc: 'We fetch the latest Sentinel-2 imagery from Google Earth Engine automatically for your region.' },
  { icon: '🤖', title: 'AI Analysis', desc: 'Our XGBoost model analyzes 13 spectral bands + environmental data to predict crop health.' },
  { icon: '📊', title: 'Get Insights', desc: 'View health scores, interactive charts, recommendations, and real-time alerts on your dashboard.' },
];

const techStack = [
  { icon: '🛰️', name: 'Sentinel-2 (ESA)', desc: 'European Space Agency satellite providing 13-band multispectral imagery with 10m resolution.' },
  { icon: '🌍', name: 'Google Earth Engine', desc: 'Cloud computing platform for planetary-scale geospatial analysis and satellite data processing.' },
  { icon: '🤖', name: 'XGBoost ML', desc: 'Gradient boosted decision tree model achieving 99.92% R² accuracy on crop health prediction.' },
  { icon: '🌤️', name: 'OpenWeather API', desc: 'Real-time weather data, 7-day forecasts, and historical climate information for any location.' },
  { icon: '🗺️', name: 'Leaflet + Geoman', desc: 'Interactive mapping with drawing tools, satellite tile layers, and precise polygon editing.' },
  { icon: '⚡', name: 'Next.js + Node.js', desc: 'Modern full-stack framework with server-side rendering, API routes, and real-time data handling.' },
];

// ─── Styles ───

const styles = {
  // Navbar
  navbar: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '0 24px',
  },
  navInner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 70 },
  logo: { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' },
  logoIcon: { fontSize: 28 },
  logoText: { fontWeight: 800, fontSize: 20, color: '#111827', letterSpacing: '-0.02em' },
  navLinks: { display: 'flex', alignItems: 'center', gap: 28 },
  navLink: { fontSize: 14, fontWeight: 500, color: '#4b5563', transition: 'color 0.2s' },

  // Hero
  hero: {
    position: 'relative', overflow: 'hidden', padding: '160px 24px 100px', textAlign: 'center',
    background: 'linear-gradient(160deg, #f0fdf4 0%, #ecfdf5 20%, #f0f9ff 40%, #faf5ff 60%, #f0fdf4 80%, #ecfdf5 100%)',
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  heroMeshBg: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(ellipse at 20% 50%, rgba(34,197,94,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(14,165,233,0.06) 0%, transparent 50%), radial-gradient(ellipse at 60% 80%, rgba(168,85,247,0.05) 0%, transparent 50%)',
    animation: 'meshShift 15s ease-in-out infinite alternate',
  },
  heroGlowOrb1: {
    position: 'absolute', width: 400, height: 400, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)',
    top: '10%', left: '10%', animation: 'orbFloat 8s ease-in-out infinite',
  },
  heroGlowOrb2: {
    position: 'absolute', width: 300, height: 300, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)',
    top: '60%', right: '10%', animation: 'orbFloat 10s ease-in-out infinite reverse',
  },
  heroGlowOrb3: {
    position: 'absolute', width: 250, height: 250, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
    bottom: '20%', left: '30%', animation: 'orbFloat 12s ease-in-out infinite',
  },
  heroBg: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  particle: { position: 'absolute', top: '-20px', animation: 'particleFall linear infinite' },
  heroContent: { position: 'relative', maxWidth: 800, margin: '0 auto', zIndex: 2 },
  heroBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 24px',
    borderRadius: 999, background: 'rgba(22,163,74,0.08)', color: '#15803d',
    fontSize: 14, fontWeight: 600, marginBottom: 28, border: '1px solid rgba(22,163,74,0.15)',
    backdropFilter: 'blur(8px)',
  },
  badgeDot: {
    width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
    boxShadow: '0 0 8px rgba(34,197,94,0.5)', animation: 'pulse 2s ease-in-out infinite',
  },
  heroTitle: { fontSize: 64, fontWeight: 900, lineHeight: 1.08, color: '#111827', letterSpacing: '-0.04em' },
  heroGradientText: {
    background: 'linear-gradient(135deg, #16a34a 0%, #0ea5e9 50%, #8b5cf6 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundSize: '200% auto', animation: 'gradientShift 4s ease-in-out infinite alternate',
  },
  heroSub: { fontSize: 19, color: '#4b5563', marginTop: 24, lineHeight: 1.8, maxWidth: 620, margin: '24px auto 0' },
  heroCta: { display: 'flex', gap: 16, justifyContent: 'center', marginTop: 40, flexWrap: 'wrap' },
  heroBtn: { fontSize: 16, padding: '16px 36px', borderRadius: 16, fontWeight: 700 },
  heroBtn2: { fontSize: 16, padding: '16px 36px', borderRadius: 16 },
  heroCards: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 64,
  },
  heroCard: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.04)', cursor: 'default', transition: 'all 0.4s',
  },

  // Trusted Section
  trustedSection: { padding: '40px 0', background: '#fafafa', borderBottom: '1px solid #f3f4f6' },
  trustedLogos: { display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap', alignItems: 'center' },
  trustedItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: '#6b7280' },

  // Section headers
  sectionHeader: { textAlign: 'center', marginBottom: 56 },
  sectionTag: {
    display: 'inline-block', padding: '6px 18px', borderRadius: 999,
    background: '#f0fdf4', color: '#16a34a', fontSize: 13, fontWeight: 600, marginBottom: 16,
    border: '1px solid #dcfce7',
  },
  sectionTitle: { fontSize: 40, fontWeight: 900, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1.2 },
  sectionSub: { fontSize: 17, color: '#6b7280', marginTop: 12, lineHeight: 1.6 },

  // Features
  featuresSection: { padding: '100px 0', background: 'white' },
  featureCard: {
    background: 'white', borderRadius: 24, padding: 32, border: '1px solid #f3f4f6',
    transition: 'all 0.4s', cursor: 'default', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  featureIcon: {
    width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#166534', marginBottom: 20, fontSize: 22,
  },
  featureTitle: { fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 },
  featureDesc: { fontSize: 14, color: '#6b7280', lineHeight: 1.7, marginBottom: 16 },
  featureList: { display: 'flex', flexDirection: 'column', gap: 8 },
  featurePoint: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151' },

  // How it works
  howSection: { padding: '100px 0', background: '#f8faf9' },
  stepsContainer: { position: 'relative' },
  stepsLine: {
    position: 'absolute', top: '50%', left: '10%', right: '10%', height: 2,
    background: 'linear-gradient(90deg, #dcfce7, #16a34a, #0ea5e9, #dcfce7)',
    zIndex: 0, borderRadius: 2,
  },
  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24, position: 'relative', zIndex: 1 },
  stepCard: {
    background: 'white', borderRadius: 24, padding: 32, textAlign: 'center',
    border: '1px solid #e5e7eb', position: 'relative', boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
    transition: 'all 0.3s',
  },
  stepBadge: {
    position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
    width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#16a34a,#0ea5e9)',
    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 800, boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
  },
  stepIconWrap: {
    width: 72, height: 72, borderRadius: 20, background: '#f0fdf4',
    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
  },

  // Stats
  statsSection: {
    padding: '80px 0',
    background: 'linear-gradient(135deg, #166534 0%, #15803d 30%, #0f766e 60%, #0e7490 100%)',
  },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 32, textAlign: 'center' },
  statBox: { padding: 24 },
  statNum: { fontSize: 48, fontWeight: 900, color: 'white', letterSpacing: '-0.03em' },
  statLabel: { fontSize: 15, color: 'rgba(255,255,255,0.7)', marginTop: 8, fontWeight: 500 },

  // Technology
  techSection: { padding: '100px 0', background: 'white' },
  techGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 },
  techCard: {
    padding: 28, borderRadius: 20, border: '2px solid #f3f4f6', transition: 'all 0.3s',
    textAlign: 'center', background: '#fafafa',
  },

  // CTA
  ctaSection: {
    padding: '120px 24px', textAlign: 'center', position: 'relative',
    background: 'linear-gradient(135deg, #14532d 0%, #166534 25%, #15803d 50%, #0f766e 75%, #0e7490 100%)',
    overflow: 'hidden',
  },
  ctaGlow1: {
    position: 'absolute', width: 400, height: 400, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(34,197,94,0.2) 0%, transparent 70%)',
    top: '-100px', right: '-50px',
  },
  ctaGlow2: {
    position: 'absolute', width: 300, height: 300, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)',
    bottom: '-100px', left: '10%',
  },
  ctaInner: { maxWidth: 650, margin: '0 auto', position: 'relative', zIndex: 1 },
  ctaBadge: {
    display: 'inline-block', padding: '8px 20px', borderRadius: 999,
    background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)',
    fontSize: 14, fontWeight: 600, marginBottom: 24, backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  ctaBtn: {
    background: 'white', color: '#166534', fontWeight: 700, padding: '18px 44px',
    borderRadius: 18, fontSize: 17, boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
    transition: 'all 0.3s',
  },

  // Footer
  footer: { padding: '80px 0 0', background: '#f9fafb', borderTop: '1px solid #e5e7eb' },
  footerGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40 },
  footerHead: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16 },
  footerLink: { display: 'block', fontSize: 14, color: '#6b7280', marginBottom: 10, cursor: 'pointer', transition: 'color 0.2s' },
  socialBtn: {
    width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280',
    transition: 'all 0.2s', background: 'white',
  },
  footerBottom: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0',
    borderTop: '1px solid #e5e7eb', marginTop: 48, flexWrap: 'wrap', gap: 16,
  },
};
