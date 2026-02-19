'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { farmAPI, weatherAPI, cropHealthAPI, pestAPI, soilAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiFileText, FiRefreshCw, FiCpu } from 'react-icons/fi';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

const PRIORITY_STYLES = {
    high: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'High' },
    medium: { bg: '#fefce8', color: '#ca8a04', border: '#fef08a', label: 'medium' },
    low: { bg: '#f0fdf4', color: '#16a34a', border: '#dcfce7', label: 'low' },
};

const CATEGORY_ICONS = {
    irrigation: '💧',
    nutrient: '🌿',
    pest: '🐛',
    soil: '🌾',
};

const DEFAULT_ADVISORIES = [
    {
        title: 'Irrigation Optimization',
        icon: '💧',
        description: 'Maintain consistent moisture with a short irrigation cycle in 2 days.',
        priority: 'high',
        category: 'irrigation',
    },
    {
        title: 'Nutrient Management',
        icon: '🌿',
        description: 'NDVI plateau suggests checking nitrogen levels via leaf tissue test.',
        priority: 'medium',
        category: 'nutrient',
    },
    {
        title: 'Pest Scouting',
        icon: '🐛',
        description: 'Medium pest risk; inspect leaf undersides and place sticky traps.',
        priority: 'low',
        category: 'pest',
    },
    {
        title: 'Soil Health',
        icon: '🌾',
        description: 'Consider organic matter amendment to improve water retention and soil structure.',
        priority: 'medium',
        category: 'soil',
    },
];

export default function AdvisoryPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [farms, setFarms] = useState([]);
    const [selectedFarm, setSelectedFarm] = useState(null);
    const [advisories, setAdvisories] = useState([]);
    const [doneItems, setDoneItems] = useState({});
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [detailOpen, setDetailOpen] = useState(null);

    useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

    useEffect(() => {
        if (!user) return;
        farmAPI.getAll()
            .then(r => {
                // Backend returns: { success: true, farms: [...] } or { success: true, data: { farms: [...] } }
                const f = r.data.farms || r.data.data?.farms || r.data.data || [];
                const validFarms = Array.isArray(f) ? f : [];
                setFarms(validFarms);
                if (validFarms.length > 0) {
                    setSelectedFarm(validFarms[0]);
                    generateAdvisory(validFarms[0]);
                } else {
                    setLoading(false);
                }
            })
            .catch((err) => {
                console.error('Failed to load farms:', err);
                setLoading(false);
            });
    }, [user]);

    const generateAdvisory = async (farm) => {
        if (!farm || (!farm._id && !farm.id)) {
            console.error('Invalid farm object:', farm);
            setAdvisories(DEFAULT_ADVISORIES);
            setGenerating(false);
            setLoading(false);
            return;
        }

        setGenerating(true);
        setSelectedFarm(farm);
        setDoneItems({});
        // Don't clear advisories immediately - show defaults while loading
        setAdvisories(DEFAULT_ADVISORIES);

        const farmId = farm._id || farm.id;

        // Fetch latest data for the farm
        let healthScore = farm.healthScore || null;
        let ndvi = null;
        let temp = null;
        let humidity = null;
        let pestRisk = 'Unknown';
        let soilStatus = 'Unknown';

        try {
            console.log('Fetching data for farm:', farmId);
            // 1. Try to fetch existing data
            let [healthRes, weatherRes, pestRes, soilRes] = await Promise.all([
                cropHealthAPI.latest(farmId).catch((e) => { console.warn('Health API error:', e); return null; }),
                weatherAPI.current(farmId).catch((e) => { console.warn('Weather API error:', e); return null; }),
                pestAPI.latest(farmId).catch((e) => { console.warn('Pest API error:', e); return null; }),
                soilAPI.history(farmId).catch((e) => { console.warn('Soil API error:', e); return null; }),
            ]);

            // 2. Auto-trigger analysis if no health data exists
            if (!healthRes?.data?.data) {
                try {
                    console.log('No health data, triggering analysis...');
                    await cropHealthAPI.analyze(farmId);
                    // Re-fetch after analysis
                    healthRes = await cropHealthAPI.latest(farmId).catch(() => null);
                } catch (e) { console.warn('Auto-analysis trigger failed:', e); }
            }

            // 3. Extract Data
            if (healthRes?.data?.data) {
                healthScore = healthRes.data.data.healthScore || healthRes.data.data.health_score || healthScore;
                ndvi = healthRes.data.data.ndviValue || healthRes.data.data.ndvi || healthRes.data.data.NDVI;
            }

            if (weatherRes?.data?.data) {
                const wd = weatherRes.data.data.weather || weatherRes.data.data;
                temp = wd.temperature || wd.temp;
                humidity = wd.humidity;
            }

            if (pestRes?.data?.data) {
                pestRisk = pestRes.data.data.riskLevel || 'Low';
            }

            if (soilRes?.data?.data && soilRes.data.data.length > 0) {
                const s = soilRes.data.data[0]; // Latest soil record
                soilStatus = `N: ${s.nitrogen || '?'} P: ${s.phosphorus || '?'} K: ${s.potassium || '?'}`;
            }

        } catch (e) { console.error('Data fetch error:', e); }

        const farmDataPayload = {
            name: farm.name || 'Unknown Farm',
            cropType: farm.cropType || 'General',
            area: farm.area || 'N/A',
            soilType: farm.soilType || 'N/A',
            healthScore: healthScore || null,
            ndvi: ndvi || null,
            temperature: temp || null,
            humidity: humidity || null,
            pestRisk: pestRisk || 'Unknown',
            soilStatus: soilStatus || 'Unknown'
        };

        console.log('Sending advisory request with data:', farmDataPayload);

        try {
            const res = await fetch('/api/groq', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analysisType: 'advisory',
                    farmData: farmDataPayload,
                }),
            });

            console.log('Advisory API response status:', res.status);

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Advisory API error:', res.status, errorText);
                // Use default advisories on API error
                setAdvisories(DEFAULT_ADVISORIES);
                setGenerating(false);
                setLoading(false);
                return;
            }

            const data = await res.json();
            console.log('Advisory API response data:', data);
            
            if (data.error) {
                console.error('Advisory API returned error:', data.error);
                // Use default advisories on error
                setAdvisories(DEFAULT_ADVISORIES);
                setGenerating(false);
                setLoading(false);
                return;
            }

            if (data.response) {
                try {
                    // Parse JSON from AI response - handle various formats
                    let clean = data.response.trim();
                    console.log('Raw AI response:', clean);
                    
                    // Remove markdown code blocks if present
                    clean = clean.replace(/```json?/g, '').replace(/```/g, '').trim();
                    
                    // Remove any leading/trailing text that's not JSON
                    // Try to extract JSON array if wrapped in other text
                    const jsonMatch = clean.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        clean = jsonMatch[0];
                    }
                    
                    // Fix common JSON issues with emojis - ensure icon values are properly quoted
                    // Pattern: "icon": 💧 should become "icon": "💧"
                    clean = clean.replace(/"icon"\s*:\s*([^\s",}]+)/g, (match, value) => {
                        const trimmed = value.trim();
                        if (trimmed && 
                            !trimmed.startsWith('"') && 
                            !trimmed.startsWith("'") &&
                            trimmed !== 'null' &&
                            trimmed !== 'true' &&
                            trimmed !== 'false' &&
                            isNaN(trimmed)) {
                            const escaped = trimmed.replace(/"/g, '\\"');
                            return `"icon": "${escaped}"`;
                        }
                        return match;
                    });
                    
                    console.log('Cleaned JSON string:', clean);
                    
                    // Try parsing the cleaned JSON
                    const parsed = JSON.parse(clean);
                    console.log('Parsed advisory JSON:', parsed);

                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const formattedAdvisories = parsed.map(a => ({
                            title: a.title || 'Advisory',
                            icon: a.icon || CATEGORY_ICONS[a.category] || '🌱',
                            description: a.description || 'No description available',
                            priority: a.priority || 'medium',
                            category: a.category || 'general',
                        }));
                        console.log('Setting advisories:', formattedAdvisories);
                        setAdvisories(formattedAdvisories);
                    } else {
                        console.warn('Parsed advisory is not a valid array, using defaults');
                        setAdvisories(DEFAULT_ADVISORIES);
                    }
                } catch (parseErr) {
                    console.error('Failed to parse advisory JSON:', parseErr);
                    console.error('Raw response that failed:', data.response);
                    // Fallback: use default advisories if parsing fails
                    console.log('Using default advisories as fallback');
                    setAdvisories(DEFAULT_ADVISORIES);
                }
            } else {
                console.warn('No response from AI API, using defaults');
                setAdvisories(DEFAULT_ADVISORIES);
            }
        } catch (e) {
            console.error('Advisory generation failed:', e);
            // Show default advisories on error as fallback
            setAdvisories(DEFAULT_ADVISORIES);
        }
        setGenerating(false);
        setLoading(false);
    };

    const toggleDone = (idx) => {
        setDoneItems(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    if (authLoading || !user) return null;
    if (loading && !generating) return <div className="loading-page"><div className="loading-spinner" /><p>Loading advisory...</p></div>;

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
            <motion.div initial="hidden" animate="show" variants={stagger}>
                {/* Header */}
                <motion.div variants={fadeUp} style={{ marginBottom: 8 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 800 }}>🌿 Advisory System</h1>
                    <p style={{ color: '#6b7280', marginTop: 4 }}>AI-powered recommendations for your farm, updated with latest data</p>
                </motion.div>

                {/* Farm Selector */}
                {farms.length > 0 && (
                    <motion.div variants={fadeUp} style={styles.farmBar}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Farm:</span>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {farms.map(f => {
                                const farmId = f._id || f.id;
                                const isSelected = selectedFarm && (selectedFarm._id === farmId || selectedFarm.id === farmId);
                                return (
                                    <button 
                                        key={farmId} 
                                        onClick={() => generateAdvisory(f)}
                                        style={{ 
                                            ...styles.farmBtn, 
                                            ...(isSelected ? styles.farmBtnActive : {}) 
                                        }}
                                    >
                                        🌱 {f.name || 'Unnamed Farm'}
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={() => selectedFarm && generateAdvisory(selectedFarm)} disabled={generating}
                            style={styles.refreshBtn}>
                            <FiRefreshCw size={14} className={generating ? 'spin' : ''} />
                            {generating ? 'Generating...' : 'Refresh'}
                        </button>
                    </motion.div>
                )}

                {farms.length === 0 && (
                    <motion.div variants={fadeUp} style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
                        <span style={{ fontSize: 48 }}>🌱</span>
                        <p style={{ marginTop: 12, fontSize: 16 }}>Add a farm first to get personalized advisory</p>
                        <a href="/farms/new" className="btn btn-primary" style={{ marginTop: 16 }}>Add Farm</a>
                    </motion.div>
                )}

                {/* Loading state - show advisories while loading */}
                {generating && advisories.length > 0 && (
                    <motion.div variants={fadeUp} style={{ textAlign: 'center', padding: 20, marginBottom: 20, background: '#f0f9ff', borderRadius: 12, border: '1px solid #bae6fd' }}>
                        <div className="loading-spinner" style={{ margin: '0 auto' }} />
                        <p style={{ marginTop: 16, color: '#6b7280', fontSize: 14 }}>🤖 Generating AI advisory for {selectedFarm?.name}...</p>
                        <p style={{ marginTop: 8, color: '#9ca3af', fontSize: 12 }}>Showing default recommendations below</p>
                    </motion.div>
                )}

                {/* Advisory Cards - Show always if we have advisories */}
                {farms.length > 0 && advisories.length > 0 && (
                    <motion.div variants={stagger} style={styles.advisoryGrid}>
                        {advisories.map((adv, idx) => {
                            const done = doneItems[idx];
                            const pstyle = PRIORITY_STYLES[adv.priority] || PRIORITY_STYLES.medium;
                            return (
                                <motion.div key={idx} variants={fadeUp}
                                    style={{ ...styles.advisoryCard, opacity: done ? 0.6 : 1 }}>
                                    {/* Title + Priority */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                                        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#166534' }}>
                                            {adv.icon} {adv.title}
                                        </h3>
                                        <span style={{
                                            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                            background: pstyle.bg, color: pstyle.color, border: `1px solid ${pstyle.border}`,
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {pstyle.label}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, marginTop: 12, marginBottom: 20 }}>
                                        {adv.description}
                                    </p>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <button onClick={() => toggleDone(idx)}
                                            style={{ ...styles.actionBtn, ...(done ? styles.actionBtnDone : {}) }}>
                                            <FiCheck size={14} /> {done ? 'Done' : 'Mark Done'}
                                        </button>
                                        <button onClick={() => setDetailOpen(detailOpen === idx ? null : idx)} style={styles.detailBtn}>
                                            <FiFileText size={14} /> Details
                                        </button>
                                    </div>

                                    {/* Detail expansion */}
                                    <AnimatePresence>
                                        {detailOpen === idx && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                style={{ overflow: 'hidden', marginTop: 16 }}>
                                                <div style={styles.detailBox}>
                                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>📋 Detailed Guidance</div>
                                                    <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>
                                                        {adv.category === 'irrigation' && `For ${selectedFarm?.cropType || 'your crop'}, maintain soil moisture at 60-70% field capacity. Check soil moisture 10cm deep — if dry, schedule irrigation within 24-48 hours. Use drip irrigation if available for water conservation. Monitor weather forecast before irrigating.`}
                                                        {adv.category === 'nutrient' && `Current NDVI readings suggest the crop may benefit from foliar spray or basal dose of NPK. Collect soil samples from 3-4 points in the field for testing. Apply nitrogen at 40-60 kg/ha during active growth. Consider organic alternatives like neem cake.`}
                                                        {adv.category === 'pest' && `Scout the field early morning when pests are most active. Check leaf undersides for eggs/larvae. Place yellow sticky traps at 5-6 locations. If infestation is > 10%, consider biological control (Trichogramma) or neem-based spray. Avoid broad-spectrum pesticides.`}
                                                        {adv.category === 'soil' && `Incorporate green manure or FYM at 5-8 tons/ha to improve organic carbon. Maintain pH between 6.0-7.5. Apply gypsum if soil is saline. Mulching with crop residue improves moisture retention and microbial activity. Avoid soil compaction from heavy machinery.`}
                                                        {!['irrigation', 'nutrient', 'pest', 'soil'].includes(adv.category) && `Follow the specific recommendation above. Consult your local agricultural extension officer for region-specific guidance. Regular monitoring and timely action are key to maintaining crop health.`}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}

                {!generating && farms.length > 0 && advisories.length === 0 && selectedFarm && (
                    <motion.div variants={fadeUp} style={{ textAlign: 'center', padding: 60, color: '#9ca3af', background: 'white', borderRadius: 20, border: '1px solid #f3f4f6' }}>
                        <span style={{ fontSize: 48 }}>🧘</span>
                        <p style={{ marginTop: 12, fontSize: 16 }}>No specific advisories at the moment.</p>
                        <p style={{ fontSize: 13, color: '#d1d5db', marginTop: 4 }}>Your farm looks good! Check back later as conditions change.</p>
                        <button 
                            onClick={() => selectedFarm && generateAdvisory(selectedFarm)} 
                            className="btn btn-primary" 
                            style={{ marginTop: 20 }}
                        >
                            <FiRefreshCw size={14} /> Try Again
                        </button>
                    </motion.div>
                )}

                {!generating && farms.length > 0 && !selectedFarm && (
                    <motion.div variants={fadeUp} style={{ textAlign: 'center', padding: 60, color: '#9ca3af', background: 'white', borderRadius: 20, border: '1px solid #f3f4f6' }}>
                        <span style={{ fontSize: 48 }}>🌱</span>
                        <p style={{ marginTop: 12, fontSize: 16 }}>Select a farm above to get personalized advisory</p>
                    </motion.div>
                )}

                {/* Powered By */}
                <motion.div variants={fadeUp} style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: '#9ca3af' }}>
                    Powered by <strong>Groq AI</strong> • Llama 3.3 70B • Updated with latest satellite & weather data
                </motion.div>
            </motion.div>
        </div>
    );
}

const styles = {
    farmBar: {
        display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, marginBottom: 24, padding: '14px 20px',
        background: '#f9fafb', borderRadius: 16, border: '1px solid #f3f4f6', flexWrap: 'wrap',
    },
    farmBtn: {
        padding: '8px 16px', borderRadius: 10, border: '1px solid #e5e7eb', background: 'white',
        fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
    },
    farmBtnActive: { border: '1px solid #16a34a', background: '#f0fdf4', color: '#166534' },
    refreshBtn: {
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
        border: '1px solid #e5e7eb', background: 'white', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', marginLeft: 'auto', color: '#16a34a',
    },
    advisoryGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20,
    },
    advisoryCard: {
        background: 'white', borderRadius: 20, padding: 24,
        border: '1px solid #dcfce7', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'all 0.2s',
    },
    actionBtn: {
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
        border: '2px solid #16a34a', background: 'white', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', color: '#16a34a', transition: 'all 0.2s',
    },
    actionBtnDone: {
        background: '#f0fdf4', color: '#166534',
    },
    detailBtn: {
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
        border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', color: '#6b7280',
    },
    detailBox: {
        background: '#f9fafb', padding: 16, borderRadius: 14, border: '1px solid #f3f4f6',
    },
};
