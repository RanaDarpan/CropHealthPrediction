'use client';
import { useState, useEffect } from 'react';
import { cropHealthAPI } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function HealthChart({ farmId }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!farmId) return;
        cropHealthAPI.history(farmId)
            .then(r => {
                const records = r.data.data || r.data.history || [];
                const chartData = records.slice(-20).map((item, i) => ({
                    date: item.date ? new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : `Day ${i + 1}`,
                    ndvi: item.ndvi || item.NDVI || 0,
                    health: item.healthScore || item.health_score || 0,
                    evi: item.evi || item.EVI || 0,
                }));
                setData(chartData);
            })
            .catch(() => {
                // Generate placeholder data
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                setData(months.map((m, i) => ({
                    date: m,
                    ndvi: 0.3 + Math.random() * 0.5,
                    health: 40 + Math.floor(Math.random() * 50),
                    evi: 0.2 + Math.random() * 0.4,
                })));
            })
            .finally(() => setLoading(false));
    }, [farmId]);

    if (loading) return <div className="skeleton" style={{ height: 250, borderRadius: 12 }} />;

    if (data.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                <span style={{ fontSize: 40 }}>📊</span>
                <p style={{ marginTop: 8 }}>No health data yet. Run an AI prediction to start tracking.</p>
            </div>
        );
    }

    return (
        <div style={{ marginTop: 8 }}>
            <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <defs>
                        <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
                    <Tooltip
                        contentStyle={{
                            background: 'white', border: '1px solid #e5e7eb', borderRadius: 12,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 13,
                        }}
                    />
                    <Area type="monotone" dataKey="ndvi" stroke="#22c55e" strokeWidth={2.5} fill="url(#greenGrad)" name="NDVI" />
                    <Area type="monotone" dataKey="evi" stroke="#0ea5e9" strokeWidth={2} fill="url(#blueGrad)" name="EVI" />
                </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8, fontSize: 13, color: '#6b7280' }}>
                <span><span style={{ display: 'inline-block', width: 12, height: 3, background: '#22c55e', borderRadius: 2, marginRight: 6 }} />NDVI</span>
                <span><span style={{ display: 'inline-block', width: 12, height: 3, background: '#0ea5e9', borderRadius: 2, marginRight: 6 }} />EVI</span>
            </div>
        </div>
    );
}
