import axios from 'axios';

// Create axios instance with base URL pointing to FastAPI backend
const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the auth token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor to handle 401 errors globally.
// Only redirect to login if the user HAD a token (i.e. it expired).
// Guests browsing without a token are NOT redirected.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== 'undefined' && error.response?.status === 401) {
            const hadToken = !!localStorage.getItem('token');
            if (hadToken) {
                // Token expired — clear it and send user to login
                localStorage.removeItem('token');
                if (!window.location.pathname.includes('/auth/login')) {
                    window.location.href = '/auth/login';
                }
            }
            // Guests (no token) just get the error propagated — no redirect
        }
        return Promise.reject(error);
    }
);

export default api;
