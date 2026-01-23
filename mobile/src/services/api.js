/**
 * API Service - Communication with Backend
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Backend URL configuration
// Priority (first available):
// 1. expo config extra: app.json -> expo.extra.API_URL (recommended for per-device/runtime overrides)
// 2. manifest.extra (older SDKs)
// 3. Fallback default for local development
const DEFAULT_LOCAL_API = 'https://timisoaralens.onrender.com';
export const API_URL =
  Constants?.expoConfig?.extra?.API_URL ||
  Constants?.manifest?.extra?.API_URL ||
  DEFAULT_LOCAL_API;

// Debug: print resolved API_URL at runtime so we can confirm the app is pointing
// to the expected backend when running in Expo/Expo Go. This will appear in Metro logs.
try {
  // eslint-disable-next-line no-console
  console.log('[api] Resolved API_URL ->', API_URL);
} catch (e) {
  // ignore logging errors in environments where console isn't available
}

const API_BASE = `${API_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Development override support: allows setting a runtime API URL without
// editing app.json. The override is persisted to AsyncStorage under
// 'DEV_API_URL' so it survives reloads until cleared.
let OVERRIDE_API_URL = null;

export const setDevApiUrl = (url) => {
  try {
    if (!url) return;
    const trimmed = url.replace(/\/$/, '');
    OVERRIDE_API_URL = trimmed;
    api.defaults.baseURL = `${trimmed}/api`;
    // persist for subsequent reloads
    AsyncStorage.setItem('DEV_API_URL', trimmed).catch(() => {});
    // eslint-disable-next-line no-console
    console.log('[api] Dev API override set ->', trimmed);
  } catch (e) {
    // ignore
  }
};

export const clearDevApiUrl = async () => {
  try {
    OVERRIDE_API_URL = null;
    api.defaults.baseURL = API_BASE;
    await AsyncStorage.removeItem('DEV_API_URL');
    // eslint-disable-next-line no-console
    console.log('[api] Dev API override cleared');
  } catch (e) {
    // ignore
  }
};

// On module load, apply any persisted dev override.
(async () => {
  try {
    const v = await AsyncStorage.getItem('DEV_API_URL');
    if (v) {
      OVERRIDE_API_URL = v;
      api.defaults.baseURL = `${v.replace(/\/$/, '')}/api`;
      // eslint-disable-next-line no-console
      console.log('[api] Applied persisted DEV_API_URL ->', v);
    }
  } catch (e) {
    // ignore
  }
})();

// Add token to requests if available
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token && config) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Helper to format axios errors for logging
 */
function formatAxiosError(err) {
  if (!err) return 'Unknown error';
  const out = {
    message: err.message,
    code: err.code,
    status: err.response?.status,
    url: err.config?.url,
    method: err.config?.method,
    responseData: err.response?.data,
  };
  try {
    return JSON.stringify(out);
  } catch (e) {
    return String(out.message || out.code || 'Axios error');
  }
}

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
      // Log full error for debugging in Metro / device logs
      // eslint-disable-next-line no-console
      console.error('[api] register error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Registration failed',
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
      // eslint-disable-next-line no-console
      console.error('[api] login error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Login failed',
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
      // eslint-disable-next-line no-console
      console.error('[api] getCurrentUser error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to get user info',
      };
    }
  },

  /**
   * Logout user
   */
  logout: async () => {
    await AsyncStorage.removeItem('userToken');
  },

  /**
   * Google Sign-In with ID Token (Native)
   */
  googleSignIn: async (idToken) => {
    try {
      const response = await api.post('/auth/google', {
        token: idToken,
      });
      
      if (response.data.access_token) {
        await AsyncStorage.setItem('userToken', response.data.access_token);
        return { success: true, token: response.data.access_token };
      }
      
      return { success: false, error: 'No token received' };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[api] googleSignIn error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Google sign-in failed',
      };
    }
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
      // eslint-disable-next-line no-console
      console.error('[api] checkLocation error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'GPS check failed',
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
      // eslint-disable-next-line no-console
      console.error('[api] getAllLandmarks error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to get landmarks',
      };
    }
  },
};

// RAG API
export const ragAPI = {
  /**
   * Query RAG system for information with optional conversation history
   * @param {string} query - The user's question
   * @param {Array} conversation_history - Array of {role: "user"|"assistant", content: string}
   * @param {number} top_k - Number of sources to retrieve
   */
  query: async (query, conversation_history = [], top_k = 5) => {
    try {
      const response = await api.post('/rag/query', {
        query,
        conversation_history,
        top_k,
      }, {
        timeout: 60000, // 60s timeout for RAG (HF Space cold start can be slow)
      });
      return { success: true, data: response.data };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[api] ragAPI.query error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'RAG query failed',
      };
    }
  },

  /**
   * Check RAG system health
   */
  health: async () => {
    try {
      const response = await api.get('/rag/status');
      return { success: true, data: response.data };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[api] ragAPI.health error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'RAG health check failed',
      };
    }
  },
};

export default api;
