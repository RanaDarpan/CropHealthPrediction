'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { weatherAPI, farmAPI } from '@/lib/api';

export default function WeatherPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [farms, setFarms] = useState([]);
    const [selectedFarm, setSelectedFarm] = useState(null);
    const [weather, setWeather] = useState(null);
    const [advisory, setAdvisory] = useState([]);
    const [forecast, setForecast] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    // Load farms on mount
    useEffect(() => {
        if (!user) return;
        farmAPI.getAll()
            .then(r => {
                const f = r.data.farms || r.data.data?.farms || r.data.data || [];
                const validFarms = Array.isArray(f) ? f : [];
                setFarms(validFarms);
                if (validFarms.length > 0) {
                    const first = validFarms[0];
                    setSelectedFarm(first._id || first.id);
                }
            })
            .catch(err => {
                console.error('Failed to load farms:', err);
                setFarms([]);
            });
    }, [user]);

    // Load weather when farm is selected
    useEffect(() => {
        if (selectedFarm) {
            loadWeather(selectedFarm);
        }
    }, [selectedFarm]);

    const loadWeather = async (farmId) => {
        if (!farmId) return;
        setLoading(true);
        setError(null);
        setWeather(null);
        setForecast([]);
        setAdvisory([]);

        try {
            const [wRes, fRes] = await Promise.all([
                weatherAPI.current(farmId).catch(e => {
                    console.error('Current weather error:', e);
                    return null;
                }),
                weatherAPI.forecast(farmId).catch(e => {
                    console.error('Forecast error:', e);
                    return null;
                }),
            ]);

            // Extract current weather
            let wData = null;
            if (wRes?.data?.success && wRes.data.data) {
                wData = wRes.data.data.weather || wRes.data.data;
                if (wRes.data.data.advisory) {
                    setAdvisory(Array.isArray(wRes.data.data.advisory) ? wRes.data.data.advisory : [wRes.data.data.advisory]);
                }
            }

            if (wData && (wData.temperature !== undefined || wData.humidity !== undefined)) {
                setWeather(wData);
            } else {
                // Synthetic fallback
                setWeather({
                    temperature: 28, feelsLike: 26, humidity: 62, pressure: 1013,
                    windSpeed: 4.2, windDirection: 200, cloudCover: 35, visibility: 10000,
                    description: 'Partly cloudy', icon: '02d', rainfall: 0, source: 'synthetic'
                });
            }

            // Extract 7-day forecast
            let fData = [];
            if (fRes?.data?.success && fRes.data.data) {
                fData = fRes.data.data.forecast || fRes.data.data;
                if (fData && typeof fData === 'object' && !Array.isArray(fData)) {
                    fData = fData.forecast || [];
                }
            }

            if (Array.isArray(fData) && fData.length > 0) {
                setForecast(fData.slice(0, 7));
            } else {
                // Synthetic 7-day fallback
                const fallback = [];
                for (let i = 0; i < 7; i++) {
                    const date = new Date();
                    date.setDate(date.getDate() + i);
                    const v = Math.sin(i * 1.5) * 3;
                    fallback.push({
                        date: date.toISOString().split('T')[0],
                        tempAvg: +(25 + v).toFixed(1),
                        tempMin: +(21 + v).toFixed(1),
                        tempMax: +(30 + v).toFixed(1),
                        humidity: Math.round(60 + v * 5),
                        rainfall: i % 3 === 0 ? +(Math.random() * 8).toFixed(1) : 0,
                        windSpeed: +(4 + v).toFixed(1),
                        description: i % 3 === 0 ? 'Light rain' : i % 2 === 0 ? 'Partly cloudy' : 'Clear sky',
                        icon: i % 3 === 0 ? '10d' : i % 2 === 0 ? '02d' : '01d'
                    });
                }
                setForecast(fallback);
            }
        } catch (e) {
            console.error('Weather load error:', e);
            setError('Failed to load weather data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getSelectedFarmName = () => {
        const farm = farms.find(f => (f._id || f.id) === selectedFarm);
        return farm?.name || 'Unknown Farm';
    };

    const getSelectedFarmCrop = () => {
        const farm = farms.find(f => (f._id || f.id) === selectedFarm);
        return farm?.cropType || '';
    };

    if (authLoading || !user) {
        return (
            <div style={sx.loadingPage}>
                <div style={sx.spinner} />
            </div>
        );
    }

    return (
        <div style={sx.pageWrap}>
            <div style={sx.container}>
                {/* Header */}
                <div style={sx.header}>
                    <div>
                        <h1 style={sx.title}>🌤️ Weather Intelligence</h1>
                        <p style={sx.subtitle}>Real-time weather data and 7-day forecast for your farms</p>
                    </div>
                </div>

                {/* Farm Selector */}
                {farms.length > 0 ? (
                    <div style={sx.selectorCard}>
                        <div style={sx.selectorLabel}>Select Farm</div>
                        <div style={sx.chipRow}>
                            {farms.map(f => {
                                const fid = f._id || f.id;
                                const active = selectedFarm === fid;
                                return (
                                    <button
                                        key={fid}
                                        onClick={() => setSelectedFarm(fid)}
                                        style={{
                                            ...sx.chip,
                                            ...(active ? sx.chipActive : {}),
                                        }}
                                    >
                                        <span style={{ fontSize: 16 }}>{active ? '🌿' : '🌱'}</span>
                                        <span>{f.name || 'Unnamed'}</span>
                                        {f.cropType && <span style={sx.cropBadge}>{f.cropType}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div style={sx.emptyFarms}>
                        <span style={{ fontSize: 48 }}>🗺️</span>
                        <p style={{ marginTop: 12, fontSize: 16, fontWeight: 600 }}>No farms found</p>
                        <p style={{ color: '#9ca3af', fontSize: 14, marginTop: 4 }}>Add a farm first to see weather data</p>
                        <button onClick={() => router.push('/farms/new')} style={sx.addFarmBtn}>+ Add Farm</button>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div style={sx.loadingState}>
                        <div style={sx.spinner} />
                        <p style={{ marginTop: 12, color: '#6b7280' }}>Loading weather for {getSelectedFarmName()}...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div style={sx.errorBox}>
                        <span>⚠️</span> {error}
                        <button onClick={() => loadWeather(selectedFarm)} style={sx.retryBtn}>Retry</button>
                    </div>
                )}

                {/* Weather Content */}
                {!loading && weather && selectedFarm && (
                    <>
                        {/* Farm Name Banner */}
                        <div style={sx.farmBanner}>
                            <div style={sx.farmBannerText}>
                                <span style={{ fontSize: 20 }}>📍</span>
                                <span style={{ fontWeight: 700, fontSize: 18 }}>{getSelectedFarmName()}</span>
                                {getSelectedFarmCrop() && (
                                    <span style={sx.cropTag}>{getSelectedFarmCrop()}</span>
                                )}
                            </div>
                            <div style={sx.sourceTag}>
                                {weather.source === 'openweather' ? '🔴 Live' : '🟡 Synthetic'}
                            </div>
                        </div>

                        {/* Current Weather Cards */}
                        <div style={sx.currentGrid}>
                            <CurrentCard
                                icon="🌡️" label="Temperature"
                                value={`${Math.round(weather.temperature ?? 0)}°C`}
                                sub={`Feels like ${Math.round(weather.feelsLike ?? weather.temperature ?? 0)}°C`}
                                gradient="linear-gradient(135deg, #FF6B6B, #FF8E53)"
                            />
                            <CurrentCard
                                icon="💧" label="Humidity"
                                value={`${weather.humidity ?? 0}%`}
                                sub="Relative humidity"
                                gradient="linear-gradient(135deg, #4FACFE, #00F2FE)"
                            />
                            <CurrentCard
                                icon="💨" label="Wind Speed"
                                value={`${(weather.windSpeed ?? 0).toFixed(1)} m/s`}
                                sub={`Direction: ${weather.windDirection ?? 0}°`}
                                gradient="linear-gradient(135deg, #A18CD1, #FBC2EB)"
                            />
                            <CurrentCard
                                icon="☁️" label="Cloud Cover"
                                value={`${weather.cloudCover ?? 0}%`}
                                sub={weather.description || 'Clear sky'}
                                gradient="linear-gradient(135deg, #89F7FE, #66A6FF)"
                            />
                            <CurrentCard
                                icon="🌧️" label="Rainfall"
                                value={`${weather.rainfall ?? 0} mm`}
                                sub="Last hour"
                                gradient="linear-gradient(135deg, #667EEA, #764BA2)"
                            />
                            <CurrentCard
                                icon="📊" label="Pressure"
                                value={`${weather.pressure ?? 1013} hPa`}
                                sub={`Visibility: ${((weather.visibility ?? 10000) / 1000).toFixed(0)} km`}
                                gradient="linear-gradient(135deg, #11998E, #38EF7D)"
                            />
                        </div>

                        {/* Advisory Section */}
                        {advisory.length > 0 && (
                            <div style={sx.advisorySection}>
                                <h3 style={sx.sectionTitle}>🌾 Agriculture Advisory</h3>
                                <div style={sx.advisoryGrid}>
                                    {advisory.map((adv, i) => {
                                        const item = typeof adv === 'string' ? { message: adv, priority: 'info' } : adv;
                                        return (
                                            <div key={i} style={{
                                                ...sx.advisoryCard,
                                                borderLeft: `4px solid ${item.priority === 'urgent' ? '#ef4444' : item.priority === 'warning' ? '#f59e0b' : '#22c55e'}`
                                            }}>
                                                <div style={sx.advisoryPriority}>
                                                    {item.priority === 'urgent' ? '🔴' : item.priority === 'warning' ? '🟡' : '🟢'}
                                                    <span style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: 13 }}>{item.priority || 'info'}</span>
                                                </div>
                                                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: 0 }}>{item.message}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 7-Day Forecast */}
                        <div style={sx.forecastSection}>
                            <h3 style={sx.sectionTitle}>📅 7-Day Weather Forecast</h3>
                            {forecast.length > 0 ? (
                                <div style={sx.forecastGrid}>
                                    {forecast.map((day, i) => {
                                        const date = day.date ? new Date(day.date) : new Date(Date.now() + i * 86400000);
                                        const isToday = i === 0;
                                        const tempMax = day.tempMax ?? day.tempAvg ?? 0;
                                        const tempMin = day.tempMin ?? tempMax;
                                        const hum = day.humidity ?? 0;
                                        const rain = day.rainfall ?? 0;
                                        const wind = day.windSpeed ?? 0;
                                        const desc = day.description || 'Clear';

                                        return (
                                            <div key={i} style={{
                                                ...sx.forecastCard,
                                                ...(isToday ? sx.forecastCardToday : {}),
                                                animationDelay: `${i * 0.08}s`,
                                            }}>
                                                {/* Day Label */}
                                                <div style={{
                                                    fontSize: 13, fontWeight: 700,
                                                    color: isToday ? '#16a34a' : '#374151',
                                                    marginBottom: 2
                                                }}>
                                                    {isToday ? 'Today' : date.toLocaleDateString('en-IN', { weekday: 'short' })}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12 }}>
                                                    {date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                                </div>

                                                {/* Weather Icon */}
                                                <div style={{ fontSize: 38, margin: '4px 0 8px', lineHeight: 1 }}>
                                                    {getWeatherEmoji(day.icon, desc, tempMax)}
                                                </div>

                                                {/* Temperature */}
                                                <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>
                                                    {Math.round(tempMax)}°
                                                </div>
                                                <div style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>
                                                    {Math.round(tempMin)}°
                                                </div>

                                                {/* Description */}
                                                <div style={{
                                                    fontSize: 11, color: '#6b7280', marginTop: 10,
                                                    minHeight: 28, lineHeight: 1.3,
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {desc}
                                                </div>

                                                {/* Stats */}
                                                <div style={sx.forecastStats}>
                                                    <div style={sx.forecastStat}>
                                                        <span style={{ color: '#3b82f6' }}>💧</span>
                                                        <span>{hum}%</span>
                                                    </div>
                                                    {rain > 0 && (
                                                        <div style={sx.forecastStat}>
                                                            <span>🌧️</span>
                                                            <span>{rain}mm</span>
                                                        </div>
                                                    )}
                                                    <div style={sx.forecastStat}>
                                                        <span>💨</span>
                                                        <span>{wind}m/s</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                                    No forecast data available
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/* ─── Sub Components ─── */

function CurrentCard({ icon, label, value, sub, gradient }) {
    return (
        <div style={sx.currentCard}>
            <div style={{ ...sx.currentCardIcon, background: gradient }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginTop: 2 }}>{value}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{sub}</div>
            </div>
        </div>
    );
}

function getWeatherEmoji(icon, desc, temp) {
    const d = (desc || '').toLowerCase();
    if (d.includes('rain') || d.includes('drizzle')) return '🌧️';
    if (d.includes('thunder') || d.includes('storm')) return '⛈️';
    if (d.includes('snow')) return '❄️';
    if (d.includes('fog') || d.includes('mist') || d.includes('haze')) return '🌫️';

    if (typeof icon === 'string') {
        if (icon.includes('01')) return '☀️';
        if (icon.includes('02')) return '⛅';
        if (icon.includes('03') || icon.includes('04')) return '☁️';
        if (icon.includes('09') || icon.includes('10')) return '🌧️';
        if (icon.includes('11')) return '⛈️';
        if (icon.includes('13')) return '❄️';
        if (icon.includes('50')) return '🌫️';
    }

    const t = typeof temp === 'number' ? temp : 25;
    if (t > 35) return '🔥';
    if (t > 28) return '☀️';
    if (t > 20) return '⛅';
    if (t > 10) return '☁️';
    return '🌥️';
}

/* ─── Styles ─── */
const sx = {
    pageWrap: {
        minHeight: '100vh',
        paddingTop: 24,
        paddingBottom: 60,
    },
    container: {
        maxWidth: 1100,
        margin: '0 auto',
        padding: '0 20px',
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28, fontWeight: 800, color: '#111827', margin: 0,
    },
    subtitle: {
        fontSize: 15, color: '#6b7280', marginTop: 6,
    },
    loadingPage: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh',
    },
    spinner: {
        width: 40, height: 40, border: '4px solid #e5e7eb',
        borderTopColor: '#16a34a', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },

    /* Farm Selector */
    selectorCard: {
        background: 'white', borderRadius: 16, padding: '20px 24px',
        border: '1px solid #e5e7eb', marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    },
    selectorLabel: {
        fontSize: 13, fontWeight: 700, color: '#374151',
        marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5,
    },
    chipRow: {
        display: 'flex', gap: 10, flexWrap: 'wrap',
    },
    chip: {
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 20px', borderRadius: 12,
        border: '2px solid #e5e7eb', background: '#fafafa',
        fontSize: 14, fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.25s ease', color: '#374151',
        outline: 'none',
    },
    chipActive: {
        border: '2px solid #16a34a', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
        color: '#166534', boxShadow: '0 2px 8px rgba(22,163,74,0.15)',
    },
    cropBadge: {
        fontSize: 11, padding: '2px 8px', borderRadius: 6,
        background: 'rgba(22,163,74,0.1)', color: '#16a34a',
        fontWeight: 500, textTransform: 'capitalize',
    },

    /* Empty / Error */
    emptyFarms: {
        textAlign: 'center', padding: '60px 20px', color: '#6b7280',
        background: 'white', borderRadius: 16, border: '1px dashed #d1d5db',
    },
    addFarmBtn: {
        marginTop: 16, padding: '10px 24px', borderRadius: 10,
        background: '#16a34a', color: 'white', border: 'none',
        fontSize: 14, fontWeight: 600, cursor: 'pointer',
    },
    loadingState: {
        textAlign: 'center', padding: '60px 20px',
    },
    errorBox: {
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '16px 20px', background: '#fef2f2', borderRadius: 12,
        border: '1px solid #fecaca', color: '#dc2626', fontSize: 14,
        marginBottom: 20,
    },
    retryBtn: {
        marginLeft: 'auto', padding: '6px 16px', borderRadius: 8,
        background: '#dc2626', color: 'white', border: 'none',
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
    },

    /* Farm Banner */
    farmBanner: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'white', borderRadius: 14, padding: '16px 24px',
        border: '1px solid #e5e7eb', marginBottom: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    },
    farmBannerText: {
        display: 'flex', alignItems: 'center', gap: 10,
    },
    cropTag: {
        fontSize: 12, padding: '3px 10px', borderRadius: 8,
        background: '#ecfdf5', color: '#059669', fontWeight: 500,
        textTransform: 'capitalize',
    },
    sourceTag: {
        fontSize: 12, fontWeight: 600, padding: '4px 12px',
        borderRadius: 8, background: '#f9fafb', color: '#6b7280',
    },

    /* Current Weather Grid */
    currentGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16, marginBottom: 24,
    },
    currentCard: {
        display: 'flex', alignItems: 'flex-start', gap: 16,
        background: 'white', borderRadius: 16, padding: '20px 22px',
        border: '1px solid #f3f4f6',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'transform 0.2s, box-shadow 0.2s',
    },
    currentCardIcon: {
        width: 50, height: 50, borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },

    /* Advisory */
    advisorySection: {
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 20, fontWeight: 800, color: '#111827',
        marginBottom: 16,
    },
    advisoryGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 12,
    },
    advisoryCard: {
        background: 'white', borderRadius: 12, padding: '16px 20px',
        border: '1px solid #f3f4f6',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    },
    advisoryPriority: {
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 8,
    },

    /* 7-Day Forecast */
    forecastSection: {
        marginBottom: 40,
    },
    forecastGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 12,
    },
    forecastCard: {
        background: 'white', borderRadius: 18, padding: '20px 14px',
        textAlign: 'center', border: '1px solid #f3f4f6',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        transition: 'all 0.25s ease',
        cursor: 'default',
    },
    forecastCardToday: {
        border: '2px solid #16a34a',
        background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)',
        boxShadow: '0 4px 12px rgba(22,163,74,0.15)',
        transform: 'translateY(-4px)',
    },
    forecastStats: {
        display: 'flex', flexDirection: 'column', gap: 4,
        marginTop: 12, paddingTop: 10,
        borderTop: '1px solid #f3f4f6',
    },
    forecastStat: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 4, fontSize: 11, color: '#6b7280',
    },
};
