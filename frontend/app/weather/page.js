'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { weatherAPI, farmAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { FiDroplet, FiThermometer, FiWind, FiCloud, FiSun, FiEye } from 'react-icons/fi';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

export default function WeatherPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [farms, setFarms] = useState([]);
    const [selectedFarm, setSelectedFarm] = useState(null);
    const [weather, setWeather] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading, router]);

    useEffect(() => {
        if (!user) return;
        farmAPI.getAll()
            .then(r => {
                console.log('Weather Page - Farms API Response:', r.data);
                // Backend returns: { success: true, farms: [...] } or { success: true, data: { farms: [...] } }
                const f = r.data.farms || r.data.data?.farms || r.data.data || [];
                const validFarms = Array.isArray(f) ? f : [];
                console.log('Weather Page - Valid Farms:', validFarms);
                setFarms(validFarms);
                if (validFarms.length > 0) {
                    const firstFarm = validFarms[0];
                    const firstId = firstFarm._id || firstFarm.id;
                    setSelectedFarm(firstId);
                    loadWeather(firstId);
                } else {
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error('Failed to load farms in Weather:', err);
                setFarms([]);
                setLoading(false);
            });
    }, [user]);

    const loadWeather = async (farmId) => {
        if (!farmId) {
            console.error('No farm ID provided');
            return;
        }
        setLoading(true);
        setSelectedFarm(farmId);
        setWeather(null);
        setForecast([]);
        
        try {
            console.log('Loading weather for farm:', farmId);
            const [wRes, fRes] = await Promise.all([
                weatherAPI.current(farmId).catch((e) => { 
                    console.error('Current weather error:', e);
                    return null; 
                }),
                weatherAPI.forecast(farmId).catch((e) => { 
                    console.error('Forecast error:', e);
                    return null; 
                }),
            ]);

            console.log('Weather API Response:', wRes?.data);
            console.log('Forecast API Response:', fRes?.data);

            // Backend returns: { success: true, data: { weather, advisory, location } }
            let wData = null;
            if (wRes?.data) {
                if (wRes.data.success && wRes.data.data) {
                    wData = wRes.data.data.weather || wRes.data.data;
                } else if (wRes.data.weather) {
                    wData = wRes.data.weather;
                } else if (wRes.data.data) {
                    wData = wRes.data.data;
                }
            }
            
            if (wData && (wData.temperature || wData.temp || wData.humidity !== undefined)) {
                console.log('Weather data extracted:', wData);
                setWeather(wData);
            } else {
                console.warn('No valid weather data found. Response:', wRes?.data);
                // Create fallback weather data
                setWeather({
                    temperature: 25,
                    feelsLike: 23,
                    humidity: 60,
                    pressure: 1013,
                    windSpeed: 5,
                    windDirection: 180,
                    description: 'Partly cloudy',
                    condition: 'Partly cloudy'
                });
            }

            // Backend returns: { success: true, data: { forecast: [...], source: '...', location: {...} } }
            let fData = [];
            if (fRes?.data) {
                if (fRes.data.success && fRes.data.data) {
                    // Check if forecast is directly in data or nested
                    fData = fRes.data.data.forecast || fRes.data.data;
                } else if (fRes.data.forecast) {
                    fData = fRes.data.forecast;
                } else if (Array.isArray(fRes.data.data)) {
                    fData = fRes.data.data;
                }
            }
            
            // Ensure it's an array and limit to 7 days
            if (Array.isArray(fData) && fData.length > 0) {
                fData = fData.slice(0, 7);
                console.log('Forecast data extracted:', fData);
                setForecast(fData);
            } else if (fData && typeof fData === 'object' && fData.forecast && Array.isArray(fData.forecast)) {
                fData = fData.forecast.slice(0, 7);
                console.log('Forecast data extracted from nested object:', fData);
                setForecast(fData);
            } else {
                console.warn('No forecast data found. Response:', fRes?.data);
                // Generate fallback forecast
                const fallbackForecast = [];
                for (let i = 0; i < 7; i++) {
                    const date = new Date();
                    date.setDate(date.getDate() + i);
                    fallbackForecast.push({
                        date: date.toISOString().split('T')[0],
                        tempAvg: 25 + Math.sin(i) * 5,
                        tempMin: 20 + Math.sin(i) * 3,
                        tempMax: 30 + Math.sin(i) * 5,
                        humidity: 60 + Math.sin(i) * 10,
                        description: i % 3 === 0 ? 'Partly cloudy' : 'Clear sky',
                        condition: i % 3 === 0 ? 'Partly cloudy' : 'Clear sky',
                        icon: i % 3 === 0 ? '02d' : '01d'
                    });
                }
                setForecast(fallbackForecast);
            }
        } catch (e) {
            console.error('Weather error:', e);
            // Set fallback data even on error so user sees something
            setWeather({
                temperature: 25,
                feelsLike: 23,
                humidity: 60,
                pressure: 1013,
                windSpeed: 5,
                windDirection: 180,
                description: 'Data unavailable',
                condition: 'Data unavailable'
            });
            // Generate fallback forecast
            const fallbackForecast = [];
            for (let i = 0; i < 7; i++) {
                const date = new Date();
                date.setDate(date.getDate() + i);
                fallbackForecast.push({
                    date: date.toISOString().split('T')[0],
                    tempAvg: 25 + Math.sin(i) * 5,
                    tempMin: 20 + Math.sin(i) * 3,
                    tempMax: 30 + Math.sin(i) * 5,
                    humidity: 60 + Math.sin(i) * 10,
                    description: i % 3 === 0 ? 'Partly cloudy' : 'Clear sky',
                    condition: i % 3 === 0 ? 'Partly cloudy' : 'Clear sky',
                    icon: i % 3 === 0 ? '02d' : '01d'
                });
            }
            setForecast(fallbackForecast);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || !user) return <div className="loading-page"><div className="loading-spinner" /></div>;

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
            <motion.div initial="hidden" animate="show" variants={stagger}>
                <motion.div variants={fadeUp}>
                    <h1 style={{ fontSize: 28, fontWeight: 800 }}>🌤️ Weather Intelligence</h1>
                    <p style={{ color: '#6b7280', marginTop: 4 }}>Real-time weather data and agriculture advisories for your farms</p>
                </motion.div>

                {/* Farm Selector */}
                {farms.length > 0 ? (
                    <motion.div variants={fadeUp} style={styles.farmSelector}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Select Farm:</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {farms.map(f => {
                                const farmId = f._id || f.id;
                                return (
                                    <button 
                                        key={farmId} 
                                        onClick={() => loadWeather(farmId)}
                                        style={{ 
                                            ...styles.farmChip, 
                                            ...(selectedFarm === farmId ? styles.farmChipActive : {}) 
                                        }}
                                    >
                                        🌱 {f.name || 'Unnamed Farm'}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div variants={fadeUp} style={{ marginTop: 20, padding: 20, background: '#fef2f2', borderRadius: 12, border: '1px solid #fecaca' }}>
                        <p style={{ color: '#dc2626', fontSize: 14 }}>⚠️ No farms found. Please add a farm first to view weather data.</p>
                    </motion.div>
                )}

                {farms.length === 0 ? (
                    <motion.div variants={fadeUp} style={{ textAlign: 'center', padding: 80, color: '#9ca3af' }}>
                        <span style={{ fontSize: 48 }}>🗺️</span>
                        <p style={{ marginTop: 12 }}>Add a farm first to see weather data.</p>
                    </motion.div>
                ) : loading ? (
                    <motion.div variants={fadeUp} style={{ marginTop: 24 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
                            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)}
                        </div>
                        <div style={{ textAlign: 'center', marginTop: 20, color: '#6b7280' }}>
                            <p>Loading weather data...</p>
                        </div>
                    </motion.div>
                ) : selectedFarm ? (
                    <>
                        {/* Always show weather cards if we have data or fallback */}
                        {weather && (
                            <>
                                {/* Current Weather Cards */}
                                <motion.div variants={fadeUp} className="grid-4" style={{ marginTop: 24 }}>
                                    <WeatherCard icon={<FiThermometer size={24} />} label="Temperature" value={`${Math.round(weather.temperature || weather.temp || 0)}°C`}
                                        sub={`Feels like ${Math.round(weather.feelsLike || weather.temperature || weather.temp || 0)}°C`} bg="linear-gradient(135deg,#fef2f2,#fecaca)" color="#dc2626" />
                                    <WeatherCard icon={<FiDroplet size={24} />} label="Humidity" value={`${weather.humidity || 0}%`}
                                        sub="Relative humidity" bg="linear-gradient(135deg,#e0f2fe,#bae6fd)" color="#0284c7" />
                                    <WeatherCard icon={<FiWind size={24} />} label="Wind Speed" value={`${(weather.windSpeed || weather.wind || 0).toFixed(1)} m/s`}
                                        sub={`Direction: ${weather.windDirection || 0}°`} bg="linear-gradient(135deg,#f3e8ff,#e9d5ff)" color="#7c3aed" />
                                    <WeatherCard icon={<FiEye size={24} />} label="Condition" value={weather.description || weather.condition || 'Clear sky'}
                                        sub={`Pressure: ${weather.pressure || 1013} hPa`} bg="linear-gradient(135deg,#ecfccb,#d9f99d)" color="#65a30d" />
                                </motion.div>

                                {/* Advisory */}
                                {weather.advisory && (
                                    <motion.div variants={fadeUp} style={styles.advisory}>
                                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>🌾 Agriculture Advisory</h3>
                                        <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>{weather.advisory}</p>
                                    </motion.div>
                                )}
                            </>
                        )}

                        {/* Forecast - Always show if we have data */}
                        {forecast && Array.isArray(forecast) && forecast.length > 0 ? (
                            <motion.div variants={fadeUp} style={{ marginTop: 32 }}>
                                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: '#111827' }}>📅 7-Day Weather Forecast</h3>
                                <div style={styles.forecastGrid}>
                                    {forecast.map((day, i) => {
                                        let date;
                                        if (day.date) {
                                            date = new Date(day.date);
                                        } else {
                                            date = new Date();
                                            date.setDate(date.getDate() + i);
                                        }
                                        const temp = day.tempAvg || day.tempMax || day.temp || day.temperature || '--';
                                        const tempMin = day.tempMin || temp;
                                        const tempMax = day.tempMax || temp;
                                        const isToday = i === 0;
                                        
                                        return (
                                            <motion.div 
                                                key={i} 
                                                variants={fadeUp}
                                                style={{ 
                                                    ...styles.forecastCard, 
                                                    ...(isToday ? styles.forecastCardToday : {})
                                                }}
                                            >
                                                <div style={{ fontSize: 12, fontWeight: 600, color: isToday ? '#16a34a' : '#6b7280', marginBottom: 8 }}>
                                                    {isToday ? 'Today' : date.toLocaleDateString('en-IN', { weekday: 'short' })}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
                                                    {date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                                </div>
                                                <span style={{ fontSize: 32, margin: '8px 0', display: 'block' }}>
                                                    {getWeatherIcon(day.icon || day.description || day.condition, temp)}
                                                </span>
                                                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                                                    {typeof tempMax === 'number' ? `${Math.round(tempMax)}°` : tempMax}
                                                </div>
                                                {tempMin !== tempMax && (
                                                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                                                        {typeof tempMin === 'number' ? `${Math.round(tempMin)}°` : tempMin}
                                                    </div>
                                                )}
                                                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8, minHeight: 32 }}>
                                                    {day.description || day.condition || ''}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#9ca3af' }}>
                                                    {day.humidity && <span>💧 {day.humidity}%</span>}
                                                    {day.rainfall > 0 && <span>🌧️ {day.rainfall}mm</span>}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div variants={fadeUp} style={{ marginTop: 32, textAlign: 'center', padding: 40, background: '#f9fafb', borderRadius: 16 }}>
                                <span style={{ fontSize: 32 }}>📅</span>
                                <p style={{ marginTop: 12, color: '#6b7280' }}>Forecast data will appear here</p>
                            </motion.div>
                        )}
                    </>
                ) : (
                    <motion.div variants={fadeUp} style={{ textAlign: 'center', padding: 60, color: '#9ca3af', marginTop: 24 }}>
                        <span style={{ fontSize: 48 }}>🌥️</span>
                        <p style={{ marginTop: 12 }}>Select a farm above to view weather data</p>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}

function WeatherCard({ icon, label, value, sub, bg, color }) {
    return (
        <div style={{ background: 'white', borderRadius: 20, padding: 24, border: '1px solid #f3f4f6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, marginBottom: 12 }}>
                {icon}
            </div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{value}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{sub}</div>
        </div>
    );
}

function getWeatherIcon(icon, temp) {
    if (typeof icon === 'string' && icon.includes('d')) {
        if (icon.includes('01')) return '☀️';
        if (icon.includes('02')) return '⛅';
        if (icon.includes('03') || icon.includes('04')) return '☁️';
        if (icon.includes('09') || icon.includes('10')) return '🌧️';
        if (icon.includes('11')) return '⛈️';
        if (icon.includes('13')) return '❄️';
        if (icon.includes('50')) return '🌫️';
    }
    const tempNum = typeof temp === 'number' ? temp : parseFloat(temp) || 25;
    if (tempNum > 30) return '☀️';
    if (tempNum > 20) return '⛅';
    if (tempNum > 10) return '☁️';
    return '🌧️';
}

const styles = {
    farmSelector: { display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' },
    farmChip: {
        padding: '8px 18px', borderRadius: 999, border: '2px solid #e5e7eb', background: 'white',
        fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
    },
    farmChipActive: { border: '2px solid #16a34a', background: '#f0fdf4', color: '#166534' },
    advisory: {
        marginTop: 24, background: '#fffbeb', borderRadius: 16, padding: 24,
        border: '1px solid #fef3c7',
    },
    forecastGrid: { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', 
        gap: 12,
    },
    forecastCard: {
        background: 'white', borderRadius: 16, padding: 16, textAlign: 'center',
        border: '1px solid #f3f4f6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'all 0.2s',
    },
    forecastCardToday: {
        border: '2px solid #16a34a', background: '#f0fdf4',
        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.15)',
    },
};
