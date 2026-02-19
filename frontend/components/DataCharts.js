'use client';
import { useState, useEffect } from 'react';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    Cell, PieChart, Pie
} from 'recharts';

// ─── Multi-Index Chart (NDVI, EVI, SAVI) ───
export function MultiIndexChart({ data }) {
    if (!data || data.length === 0) return <EmptyChart label="No vegetation index data available" />;

    return (
        <div>
            <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <defs>
                        <linearGradient id="ndviGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="eviGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="saviGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} domain={[0, 1]} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="ndvi" stroke="#22c55e" strokeWidth={2.5} fill="url(#ndviGrad)" name="NDVI" />
                    <Area type="monotone" dataKey="evi" stroke="#0ea5e9" strokeWidth={2} fill="url(#eviGrad)" name="EVI" />
                    <Area type="monotone" dataKey="savi" stroke="#8b5cf6" strokeWidth={2} fill="url(#saviGrad)" name="SAVI" />
                </AreaChart>
            </ResponsiveContainer>
            <ChartLegend items={[
                { color: '#22c55e', label: 'NDVI' },
                { color: '#0ea5e9', label: 'EVI' },
                { color: '#8b5cf6', label: 'SAVI' },
            ]} />
        </div>
    );
}

// ─── Pest Risk Chart ───
export function PestRiskChart({ data }) {
    if (!data || data.length === 0) return <EmptyChart label="No pest risk data available" />;

    const COLORS = { low: '#22c55e', moderate: '#f97316', high: '#dc2626', critical: '#7f1d1d' };

    return (
        <div>
            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} domain={[0, 100]} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="riskScore" name="Risk Score" radius={[6, 6, 0, 0]}>
                        {data.map((entry, i) => (
                            <Cell key={i} fill={
                                entry.riskScore > 75 ? COLORS.critical :
                                    entry.riskScore > 50 ? COLORS.high :
                                        entry.riskScore > 25 ? COLORS.moderate : COLORS.low
                            } />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            <ChartLegend items={[
                { color: '#22c55e', label: 'Low (0-25)' },
                { color: '#f97316', label: 'Moderate (26-50)' },
                { color: '#dc2626', label: 'High (51-75)' },
                { color: '#7f1d1d', label: 'Critical (76-100)' },
            ]} />
        </div>
    );
}

// ─── Soil Radar Chart ───
export function SoilRadarChart({ data }) {
    if (!data || data.length === 0) return <EmptyChart label="No soil data available" />;

    return (
        <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="property" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <PolarRadiusAxis tick={{ fontSize: 10, fill: '#9ca3af' }} domain={[0, 100]} />
                <Radar name="Current" dataKey="value" stroke="#16a34a" fill="#22c55e" fillOpacity={0.2} strokeWidth={2} />
                <Radar name="Optimal" dataKey="optimal" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" />
                <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
        </ResponsiveContainer>
    );
}

// ─── Weather Trend Chart ───
export function WeatherTrendChart({ data }) {
    if (!data || data.length === 0) return <EmptyChart label="No weather trend data available" />;

    return (
        <div>
            <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis yAxisId="temp" tick={{ fontSize: 11, fill: '#dc2626' }} />
                    <YAxis yAxisId="humidity" orientation="right" tick={{ fontSize: 11, fill: '#0ea5e9' }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line yAxisId="temp" type="monotone" dataKey="temp" stroke="#dc2626" strokeWidth={2.5} dot={{ fill: '#dc2626', r: 3 }} name="Temp (°C)" />
                    <Line yAxisId="humidity" type="monotone" dataKey="humidity" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: '#0ea5e9', r: 3 }} name="Humidity (%)" />
                </LineChart>
            </ResponsiveContainer>
            <ChartLegend items={[
                { color: '#dc2626', label: 'Temperature (°C)' },
                { color: '#0ea5e9', label: 'Humidity (%)' },
            ]} />
        </div>
    );
}

// ─── Health Gauge ───
export function HealthGauge({ score, size = 140 }) {
    const safeScore = Math.max(0, Math.min(100, score || 0));
    const color = safeScore > 70 ? '#22c55e' : safeScore > 40 ? '#f97316' : '#dc2626';
    const label = safeScore > 70 ? 'Healthy' : safeScore > 40 ? 'Moderate' : 'Poor';
    const pieData = [
        { value: safeScore },
        { value: 100 - safeScore },
    ];

    return (
        <div style={{ textAlign: 'center' }}>
            <ResponsiveContainer width={size} height={size}>
                <PieChart>
                    <Pie
                        data={pieData}
                        dataKey="value"
                        cx="50%" cy="50%"
                        innerRadius="68%" outerRadius="90%"
                        startAngle={90} endAngle={-270}
                        paddingAngle={2}
                    >
                        <Cell fill={color} />
                        <Cell fill="#f3f4f6" />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop: -size / 2 - 20, position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: size / 3.5, fontWeight: 900, color }}>{safeScore}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{label}</div>
            </div>
            <div style={{ height: size / 2 - 20 }} />
        </div>
    );
}

// ─── Satellite Band Bar Chart ───
export function SatelliteBandChart({ data }) {
    if (!data || data.length === 0) return <EmptyChart label="No satellite band data available" />;

    const bandColors = ['#22c55e', '#16a34a', '#15803d', '#166534', '#0ea5e9', '#0284c7', '#1d4ed8', '#4f46e5', '#7c3aed', '#9333ea', '#a855f7', '#c084fc', '#d946ef'];

    return (
        <div>
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="band" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="reflectance" name="Reflectance" radius={[4, 4, 0, 0]}>
                        {data.map((_, i) => (
                            <Cell key={i} fill={bandColors[i % bandColors.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── Helpers ───

function EmptyChart({ label }) {
    return (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
            <span style={{ fontSize: 40 }}>📊</span>
            <p style={{ marginTop: 8, fontSize: 14 }}>{label}</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Run an analysis to generate data.</p>
        </div>
    );
}

function ChartLegend({ items }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 10, fontSize: 12, color: '#6b7280', flexWrap: 'wrap' }}>
            {items.map((item, i) => (
                <span key={i}>
                    <span style={{ display: 'inline-block', width: 12, height: 3, background: item.color, borderRadius: 2, marginRight: 6 }} />
                    {item.label}
                </span>
            ))}
        </div>
    );
}

const tooltipStyle = {
    background: 'white', border: '1px solid #e5e7eb', borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 13, padding: '8px 12px',
};
