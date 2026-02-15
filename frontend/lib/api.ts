import axios from 'axios';

// Create axios instance with base URL pointing to FastAPI backend
const api = axios.create({
    baseURL: 'http://localhost:8000/api', 
    "https://legal-ai-whhe.onrender.com",// Update for production
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the auth token
api.interceptors.request.use(
    (config) => {
        // Check if running in browser
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token'); // Or get from NextAuth session
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle 401 errors globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== 'undefined' && error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            if (!window.location.pathname.includes('/auth/login')) {
                window.location.href = '/auth/login';
                // Use window.location to force a hard refresh and state reset
            }
        }
        return Promise.reject(error);
    }
);

export default api;
