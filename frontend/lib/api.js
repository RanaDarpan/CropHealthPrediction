import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('agrisense_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem('agrisense_token');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ──── Auth ────
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/update-profile', data),
};

// ──── Farms ────
export const farmAPI = {
    getAll: () => api.get('/farms'),
    getById: (id) => api.get(`/farms/${id}`),
    create: (data) => api.post('/farms', data),
    update: (id, data) => api.put(`/farms/${id}`, data),
    delete: (id) => api.delete(`/farms/${id}`),
};

// ──── Satellite ────
export const satelliteAPI = {
    fetch: (farmId) => api.post(`/satellite/fetch/${farmId}`),
    history: (farmId) => api.get(`/satellite/history/${farmId}`),
    latest: (farmId) => api.get(`/satellite/latest/${farmId}`),
    analyze: (farmId) => api.post(`/satellite/analyze/${farmId}`),
};

// ──── Crop Health ────
export const cropHealthAPI = {
    history: (farmId) => api.get(`/crop-health/${farmId}`),
    latest: (farmId) => api.get(`/crop-health/${farmId}/latest`),
    analyze: (farmId) => api.post(`/crop-health/${farmId}/analyze`),
};

// ──── Soil Analysis ────
export const soilAPI = {
    history: (farmId) => api.get(`/soil-analysis/${farmId}`),
    manual: (farmId, data) => api.post(`/soil-analysis/${farmId}`, data),
    satellite: (farmId) => api.post(`/soil-analysis/${farmId}/satellite`),
};

// ──── Pest Risk ────
export const pestAPI = {
    history: (farmId) => api.get(`/pest-risk/${farmId}`),
    latest: (farmId) => api.get(`/pest-risk/${farmId}/latest`),
    assess: (farmId) => api.post(`/pest-risk/${farmId}/assess`),
};

// ──── Weather ────
export const weatherAPI = {
    current: (farmId) => api.get(`/weather/${farmId}/current`),
    forecast: (farmId) => api.get(`/weather/${farmId}/forecast`),
};

// ──── Alerts ────
export const alertAPI = {
    getAll: () => api.get('/alerts'),
    markRead: (id) => api.put(`/alerts/${id}/read`),
    markAllRead: () => api.put('/alerts/mark-all-read'),
    delete: (id) => api.delete(`/alerts/${id}`),
};

// ──── Dashboard ────
export const dashboardAPI = {
    get: () => api.get('/dashboard'),
};

// ──── ML Predictions ────
export const mlAPI = {
    predict: (farmId) => api.post(`/ml/predict/${farmId}`),
    predictPolygon: (data) => api.post('/ml/predict-polygon', data),
    health: () => api.get('/ml/health'),
    modelInfo: () => api.get('/ml/model-info'),
    geeStatus: () => api.get('/ml/gee-status'),
};

export default api;
