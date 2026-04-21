import axios from 'axios';
import { API_BASE_URL, logout, getToken } from './session';

const api = axios.create({
  baseURL: API_BASE_URL,
});

const formatValidationError = (item) => {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    const location = Array.isArray(item.loc) ? item.loc.join('.') : '';
    const message = item.msg || item.message || JSON.stringify(item);
    return location ? `${location}: ${message}` : message;
  }
  return String(item);
};

export const getApiErrorMessage = (error, fallback = 'Request failed. Please try again.') => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map(formatValidationError).join(' | ');
  }
  if (detail && typeof detail === 'object') {
    if (typeof detail.message === 'string' && detail.message.trim()) return detail.message;
    return JSON.stringify(detail);
  }

  const payload = error?.response?.data;
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (payload && typeof payload === 'object') {
    if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;
  }

  if (typeof error?.message === 'string' && error.message.trim()) return error.message;
  return fallback;
};

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;






