import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  backoffMultiplier: 2,
  timeout: 30000,
};

// Retry function with exponential backoff
const retryRequest = async (fn, retries = RETRY_CONFIG.maxRetries) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && (error.code === 'ECONNABORTED' || error.response?.status >= 500)) {
      const delay = RETRY_CONFIG.retryDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxRetries - retries);
      console.log(`Request failed, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(fn, retries - 1);
    }
    throw error;
  }
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: RETRY_CONFIG.timeout,
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
    // Handle 502 Gateway errors specifically
    if (error.response?.status === 502) {
      console.warn('502 Gateway error - server may be starting up');
    }
    
    const message = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

// Import API functions
export const importAPI = {
  // Get import status
  getStatus: () => retryRequest(() => api.get('/api/import/status')),
};

// Import logs API functions
export const importLogsAPI = {
  // Get import logs with pagination
  getLogs: (params = {}) => retryRequest(() => api.get('/api/import-logs', { params })),
  
  // Get import statistics overview
  getStats: (days = 30) => retryRequest(() => api.get('/api/import-logs/stats/overview', { params: { days } })),
};

export default api; 