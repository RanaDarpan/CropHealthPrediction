'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadUser = useCallback(async () => {
        const token = localStorage.getItem('agrisense_token');
        if (!token) { setLoading(false); return; }
        try {
            const { data } = await authAPI.getMe();
            setUser(data.data || data.user || data);
        } catch {
            localStorage.removeItem('agrisense_token');
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadUser(); }, [loadUser]);

    const login = async (email, password) => {
        const { data } = await authAPI.login({ email, password });
        const token = data.token || data.data?.token;
        if (token) localStorage.setItem('agrisense_token', token);
        await loadUser();
        return data;
    };

    const register = async (userData) => {
        const { data } = await authAPI.register(userData);
        const token = data.token || data.data?.token;
        if (token) localStorage.setItem('agrisense_token', token);
        await loadUser();
        return data;
    };

    const logout = () => {
        localStorage.removeItem('agrisense_token');
        setUser(null);
        window.location.href = '/';
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, loadUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be within AuthProvider');
    return ctx;
}
