import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Points to Express backend
    withCredentials: true // CRITICAL: This allows the Http-Only cookie to be saved!
});

// Automatically intercept expired JWT tokens (401 Unauthorized) and force logout
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('fortress_user');
            if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;