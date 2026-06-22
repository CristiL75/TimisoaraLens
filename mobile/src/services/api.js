/**
 * API Service - Communication with Backend
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from './secureAuthStorage';

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
  // eslint-disable-next-line no-console
  console.log('[api] Resolved API_BASE ->', api.defaults.baseURL);
} catch (e) {
  // ignore logging errors in environments where console isn't available
}

const API_BASE = `${API_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise = null;

const SESSION_EXPIRED_MESSAGE = 'Sesiunea a expirat. Te rugam sa te autentifici din nou.';

const isMissingRefreshTokenError = (error) => {
  return String(error?.message || '').includes('No refresh token available');
};

const refreshAccessToken = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post(
      '/auth/refresh',
      { refresh_token: refreshToken },
      { _skipAuthRefresh: true }
    );
    await setAuthTokens(response.data);
    return response.data.access_token;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

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
    const token = await getAccessToken();
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;

    if (
      status !== 401 ||
      originalRequest._retry ||
      originalRequest._skipAuthRefresh ||
      String(originalRequest.url || '').includes('/auth/login') ||
      String(originalRequest.url || '').includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    try {
      originalRequest._retry = true;
      const newAccessToken = await refreshAccessToken();
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      await clearAuthTokens();
      return Promise.reject(refreshError);
    }
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
        await setAuthTokens(response.data);
        return { success: true, token: response.data.access_token };
      }
      
      return { success: false, error: 'No token received' };
    } catch (error) {
      if (error.response?.status !== 401) {
        // eslint-disable-next-line no-console
        console.error('[api] login error:', formatAxiosError(error));
      }
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
      const isSessionExpired =
        error.response?.status === 401 || isMissingRefreshTokenError(error);
      if (!isSessionExpired) {
        // eslint-disable-next-line no-console
        console.error('[api] getCurrentUser error:', formatAxiosError(error));
      }
      return {
        success: false,
        error: isSessionExpired
          ? SESSION_EXPIRED_MESSAGE
          : error.response?.data?.detail || error.message || 'Failed to get user info',
      };
    }
  },

  /**
   * Refresh current session using the stored refresh token
   */
  refreshSession: async () => {
    try {
      const accessToken = await refreshAccessToken();
      return { success: true, token: accessToken };
    } catch (error) {
      return {
        success: false,
        error: isMissingRefreshTokenError(error)
          ? SESSION_EXPIRED_MESSAGE
          : error.message || 'Session refresh failed',
      };
    }
  },

  /**
   * Logout user
   */
  logout: async () => {
    const refreshToken = await getRefreshToken();
    try {
      await api.post(
        '/auth/logout',
        { refresh_token: refreshToken },
        { _skipAuthRefresh: true }
      );
    } catch (error) {
      // Local logout should still complete even if the server is unavailable.
    }
    await clearAuthTokens();
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
        await setAuthTokens(response.data);
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

// Bookings API
export const bookingsAPI = {
  /**
   * Create a new service provider
   */
  createProvider: async (providerData) => {
    try {
      const token = await getAccessToken();
      const response = await api.post(
        '/bookings/providers',
        providerData,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : undefined,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] createProvider error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to create provider',
      };
    }
  },

  /**
   * Get all active providers
   */
  getProviders: async () => {
    try {
      const response = await api.get('/bookings/providers');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] getProviders error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to get providers',
      };
    }
  },

  /**
   * Delete provider by id
   */
  deleteProvider: async (providerId) => {
    try {
      const token = await getAccessToken();
      const response = await api.delete(`/bookings/providers/${providerId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : undefined,
        },
        timeout: 10000,
      });
      return { success: true };
    } catch (error) {
      console.error('[api] deleteProvider error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to delete provider',
      };
    }
  },

  /**
   * Get provider details
   */
  getProvider: async (providerId) => {
    try {
      const response = await api.get(`/bookings/providers/${providerId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] getProvider error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to get provider',
      };
    }
  },

  /**
   * Update provider
   */
  updateProvider: async (providerId, providerData) => {
    try {
      const response = await api.put(`/bookings/providers/${providerId}`, providerData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] updateProvider error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to update provider',
      };
    }
  },

  /**
   * Add a table to provider
   */
  createTable: async (tableData) => {
    try {
      const response = await api.post('/bookings/tables', tableData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] createTable error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to create table',
      };
    }
  },

  /**
   * Get tables for a provider
   */
  getTables: async (providerId) => {
    try {
      const response = await api.get(`/bookings/tables/${providerId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] getTables error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to get tables',
      };
    }
  },

  /**
   * Delete (deactivate) a table
   */
  deleteTable: async (tableId) => {
    try {
      const response = await api.delete(`/bookings/tables/${tableId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] deleteTable error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to delete table',
      };
    }
  },

  /**
   * Add a room/hall to provider
   */
  createRoom: async (roomData) => {
    try {
      const response = await api.post('/bookings/rooms', roomData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] createRoom error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to create room',
      };
    }
  },

  /**
   * Get rooms for a provider
   */
  getRooms: async (providerId) => {
    try {
      const response = await api.get(`/bookings/rooms/${providerId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] getRooms error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to get rooms',
      };
    }
  },

  /**
   * Update a room/hall
   */
  updateRoom: async (roomId, roomData) => {
    try {
      const response = await api.put(`/bookings/rooms/${roomId}`, roomData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] updateRoom error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to update room',
      };
    }
  },

  /**
   * Delete (deactivate) a room
   */
  deleteRoom: async (roomId) => {
    try {
      const response = await api.delete(`/bookings/rooms/${roomId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] deleteRoom error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to delete room',
      };
    }
  },

  /**
   * Create a booking
   */
  createBooking: async (bookingData) => {
    try {
      const response = await api.post('/bookings/', bookingData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] createBooking error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to create booking',
      };
    }
  },

  /**
   * Booking assistant orchestration (intent, availability, create/cancel)
   */
  bookingAssistant: async (assistantPayload) => {
    try {
      const response = await api.post('/bookings/assistant', assistantPayload, {
        timeout: 45000,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] bookingAssistant error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Booking assistant failed',
      };
    }
  },

  /**
   * Check availability
   */
  checkAvailability: async (
    providerId,
    date,
    partySize,
    startTime,
    durationMinutes,
    serviceId,
    employeeId,
    carId,
    endDate,
    endTime,
    roomId
  ) => {
    try {
      const response = await api.get(`/bookings/availability/${providerId}`, {
        params: {
          date,
          party_size: partySize,
          start_time: startTime || undefined,
          duration_minutes: durationMinutes || undefined,
          service_id: serviceId || undefined,
          employee_id: employeeId || undefined,
          car_id: carId || undefined,
          room_id: roomId || undefined,
          end_date: endDate || undefined,
          end_time: endTime || undefined,
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] checkAvailability error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to check availability',
      };
    }
  },

  /**
   * Cancel a booking
   */
  cancelBooking: async (bookingId) => {
    try {
      const response = await api.delete(`/bookings/${bookingId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] cancelBooking error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to cancel booking',
      };
    }
  },

  /**
   * Get bookings for all providers owned by current user
   */
  getProviderBookings: async () => {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await api.get('/bookings/provider-bookings', {
          timeout: 45000,
        });
        return { success: true, data: response.data };
      } catch (error) {
        const status = error?.response?.status;
        const shouldRetry = attempt < maxAttempts && (status === 502 || status === 503 || status === 504 || error?.code === 'ECONNABORTED');
        console.error('[api] getProviderBookings error:', formatAxiosError(error), `attempt=${attempt}/${maxAttempts}`);

        if (!shouldRetry) {
          return {
            success: false,
            error: error.response?.data?.detail || error.message || 'Failed to get provider bookings',
          };
        }

        await new Promise((resolve) => setTimeout(resolve, attempt * 700));
      }
    }

    return {
      success: false,
      error: 'Failed to get provider bookings',
    };
  },

  /**
   * Confirm or reject a booking (owner only)
   */
  updateBookingStatus: async (bookingId, status) => {
    try {
      const response = await api.patch(`/bookings/${bookingId}/status`, { status });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] updateBookingStatus error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to update booking status',
      };
    }
  },

  /**
   * Get provider calendar (blocked/full days)
   */
  getProviderCalendar: async (providerId) => {
    try {
      const response = await api.get(`/bookings/calendar/${providerId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] getProviderCalendar error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to load calendar',
      };
    }
  },

  /**
   * Block a day for a provider calendar
   */
  blockProviderDay: async (providerId, date, reason = null) => {
    try {
      const token = await getAccessToken();
      const response = await api.post(
        '/bookings/calendar/block',
        { provider_id: providerId, date, reason },
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : undefined,
          },
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] blockProviderDay error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to block day',
      };
    }
  },

  /**
   * Get rent-a-car calendar (booked cars in date range)
   */
  getProviderCarCalendar: async (providerId, startDate, endDate) => {
    try {
      const response = await api.get(`/bookings/calendar/cars/${providerId}`, {
        params: {
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        },
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] getProviderCarCalendar error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to load car calendar',
      };
    }
  },

  /**
   * Create a service
   */
  createService: async (serviceData) => {
    try {
      const response = await api.post('/bookings/services', serviceData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] createService error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to create service',
      };
    }
  },

  /**
   * Get services for a provider
   */
  getServices: async (providerId) => {
    try {
      const response = await api.get(`/bookings/services/${providerId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] getServices error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to get services',
      };
    }
  },

  /**
   * Update a service
   */
  updateService: async (serviceId, serviceData) => {
    try {
      const response = await api.put(`/bookings/services/${serviceId}`, serviceData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] updateService error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to update service',
      };
    }
  },

  /**
   * Delete (deactivate) a service
   */
  deleteService: async (serviceId) => {
    try {
      const response = await api.delete(`/bookings/services/${serviceId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] deleteService error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to delete service',
      };
    }
  },

  /**
   * Create an employee
   */
  createEmployee: async (employeeData) => {
    try {
      const response = await api.post('/bookings/employees', employeeData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] createEmployee error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to create employee',
      };
    }
  },

  /**
   * Get employees for a provider
   */
  getEmployees: async (providerId) => {
    try {
      const response = await api.get(`/bookings/employees/${providerId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] getEmployees error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to get employees',
      };
    }
  },

  /**
   * Update an employee
   */
  updateEmployee: async (employeeId, employeeData) => {
    try {
      const response = await api.put(`/bookings/employees/${employeeId}`, employeeData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] updateEmployee error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to update employee',
      };
    }
  },

  /**
   * Delete (deactivate) an employee
   */
  deleteEmployee: async (employeeId) => {
    try {
      const response = await api.delete(`/bookings/employees/${employeeId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] deleteEmployee error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to delete employee',
      };
    }
  },
};

export default api;

// DEBUG: Log API_BASE and override at end of file
setTimeout(async () => {
  try {
    const devOverride = await AsyncStorage.getItem('DEV_API_URL');
    // eslint-disable-next-line no-console
    console.log('[api] FINAL API_BASE ->', api.defaults.baseURL);
    // eslint-disable-next-line no-console
    console.log('[api] FINAL DEV_API_URL ->', devOverride);
    // Extra: log platform
    console.log('[api] Platform ->', Platform.OS);
  } catch (e) {
    // ignore
  }
}, 1000);

// Bookings API - getMyProviders and getMyBookings
const bookingsAPIExtended = {
  /**
   * Get providers created by current user
   */
  getMyProviders: async () => {
    try {
      const response = await api.get('/bookings/my-providers');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] getMyProviders error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to get my providers',
      };
    }
  },

  /**
   * Get bookings made by current user
   */
  getMyBookings: async () => {
    try {
      const response = await api.get('/bookings/my-bookings');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] getMyBookings error:', formatAxiosError(error));
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to get my bookings',
      };
    }
  },
};

Object.assign(bookingsAPI, bookingsAPIExtended);

// Experiences API
const experiencesAPI = {
  createExperience: async (data) => {
    try {
      const response = await api.post('/bookings/experiences', data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] createExperience error:', formatAxiosError(error));
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },
  listExperiences: async () => {
    try {
      const response = await api.get('/bookings/experiences');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] listExperiences error:', formatAxiosError(error));
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },
  getMyExperiences: async () => {
    try {
      const response = await api.get('/bookings/experiences/my');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] getMyExperiences error:', formatAxiosError(error));
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },
  getExperience: async (id) => {
    try {
      const response = await api.get(`/bookings/experiences/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] getExperience error:', formatAxiosError(error));
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },
  updateExperience: async (id, data) => {
    try {
      const response = await api.put(`/bookings/experiences/${id}`, data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] updateExperience error:', formatAxiosError(error));
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },
  deleteExperience: async (id) => {
    try {
      const response = await api.delete(`/bookings/experiences/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] deleteExperience error:', formatAxiosError(error));
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },
  bookExperience: async (data) => {
    try {
      const response = await api.post('/bookings/experience-bookings', data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] bookExperience error:', formatAxiosError(error));
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },
  getMyExperienceBookings: async () => {
    try {
      const response = await api.get('/bookings/experience-bookings/my');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] getMyExperienceBookings error:', formatAxiosError(error));
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },
  getOwnerExperienceBookings: async () => {
    try {
      const response = await api.get('/bookings/experience-bookings/owner');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] getOwnerExperienceBookings error:', formatAxiosError(error));
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },
  updateExperienceBookingStatus: async (bookingId, statusVal) => {
    try {
      const response = await api.patch(`/bookings/experience-bookings/${bookingId}/status`, { status: statusVal });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] updateExperienceBookingStatus error:', formatAxiosError(error));
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },
};

export { experiencesAPI };

// ---------------------------------------------------------------------------
// Apartment Bookings API  (Stripe-powered)
// ---------------------------------------------------------------------------
/**
 * apartmentBookingsAPI
 *
 * All calls hit /api/apartment-bookings/* on the backend.
 *
 * Stripe integration notes for the mobile side:
 *   • Install:  yarn add @stripe/stripe-react-native
 *   • Init in App.js:  <StripeProvider publishableKey="pk_test_...">
 *   • Collect payment method:
 *       const { paymentMethod } = await createPaymentMethod({ paymentMethodType: 'Card', ... });
 *       // paymentMethod.id  →  pass as  payment_method_id  below
 *   • After creating the request the backend returns  stripe_client_secret.
 *     In TEST mode with manual capture you DON'T need to call confirmPayment from the client
 *     (the backend already confirms the intent). In production you may want to use
 *     confirmPayment(clientSecret) to handle 3DS challenges.
 */
const apartmentBookingsAPI = {
  /**
   * Guest: create a booking request for a listing.
   * @param {string} listingId  - MongoDB _id of the listing
   * @param {{ check_in: string, check_out: string, guests: number, payment_method_id: string, notes?: string }} data
   */
  createRequest: async (listingId, data) => {
    try {
      const response = await api.post(`/apartment-bookings/${listingId}/booking-requests`, data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] apartmentBookings.createRequest error:', formatAxiosError(error));
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  /** Guest: list own outgoing requests (optionally filtered by status). */
  getMyRequests: async (status = null) => {
    try {
      const params = status ? { status } : {};
      const response = await api.get('/apartment-bookings/my-requests', { params });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] apartmentBookings.getMyRequests error:', formatAxiosError(error));
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  /** Owner: list incoming booking requests for own listings (optionally filtered by status). */
  getIncomingRequests: async (status = null) => {
    try {
      const params = status ? { status } : {};
      const response = await api.get('/apartment-bookings/my-incoming-requests', { params });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] apartmentBookings.getIncomingRequests error:', formatAxiosError(error));
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  /** Get details for a single booking request (owner or guest). */
  getRequest: async (reqId) => {
    try {
      const response = await api.get(`/apartment-bookings/booking-requests/${reqId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] apartmentBookings.getRequest error:', formatAxiosError(error));
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  /** Owner: accept a pending request (captures Stripe payment). */
  acceptRequest: async (reqId) => {
    try {
      const response = await api.post(`/apartment-bookings/booking-requests/${reqId}/accept`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] apartmentBookings.acceptRequest error:', formatAxiosError(error));
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  /** Owner: reject a pending request (cancels Stripe payment, releases hold). */
  rejectRequest: async (reqId) => {
    try {
      const response = await api.post(`/apartment-bookings/booking-requests/${reqId}/reject`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] apartmentBookings.rejectRequest error:', formatAxiosError(error));
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  /** Public: get booked date ranges for a listing (no auth required). */
  getBookedDates: async (listingId) => {
    try {
      const response = await api.get(`/apartment-bookings/${listingId}/booked-dates`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] apartmentBookings.getBookedDates error:', formatAxiosError(error));
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  /** Guest: cancel own pending request (cancels Stripe payment, no charge). */
  cancelRequest: async (reqId) => {
    try {
      const response = await api.post(`/apartment-bookings/booking-requests/${reqId}/cancel`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('[api] apartmentBookings.cancelRequest error:', formatAxiosError(error));
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },
};

export { apartmentBookingsAPI };
