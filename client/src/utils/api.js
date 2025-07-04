import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth headers here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

// Import API functions
export const importAPI = {
  // Get import status
  getStatus: () => api.get('/api/import/status'),
};

// Import logs API functions
export const importLogsAPI = {
  // Get import logs with pagination
  getLogs: (params = {}) => api.get('/api/import-logs', { params }),
  
  // Get import statistics overview
  getStats: (days = 30) => api.get('/api/import-logs/stats/overview', { params: { days } }),
};

export default api; 