/**
 * API Service - Communication with Backend
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend URL - schimbă cu IP-ul tău local dacă testezi pe telefon real
// Pentru emulator: localhost:8000
// Pentru telefon real: 192.168.x.x:8000 (IP-ul PC-ului tău)
const API_URL = 'http://192.168.100.45:8000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  /**
   * Register a new user
   */
  register: async (email, username, password, fullName) => {
    try {
      const response = await api.post('/auth/register', {
        email,
        username,
        password,
        full_name: fullName,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Registration failed',
      };
    }
  },

  /**
   * Login user
   */
  login: async (username, password) => {
    try {
      const response = await api.post('/auth/login-json', {
        username,
        password,
      });
      
      if (response.data.access_token) {
        await AsyncStorage.setItem('userToken', response.data.access_token);
        return { success: true, token: response.data.access_token };
      }
      
      return { success: false, error: 'No token received' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  },

  /**
   * Get current user info
   */
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to get user info',
      };
    }
  },

  /**
   * Logout user
   */
  logout: async () => {
    await AsyncStorage.removeItem('userToken');
  },
};

// GPS API
export const gpsAPI = {
  /**
   * Check landmarks near location
   */
  checkLocation: async (latitude, longitude, accuracy = null) => {
    try {
      const response = await api.post('/gps/check', {
        latitude,
        longitude,
        accuracy,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'GPS check failed',
      };
    }
  },

  /**
   * Get all landmarks
   */
  getAllLandmarks: async () => {
    try {
      const response = await api.get('/gps/landmarks');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to get landmarks',
      };
    }
  },
};

export default api;
