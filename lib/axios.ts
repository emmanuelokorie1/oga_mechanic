import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, AUTH_ENDPOINTS, USER_ENDPOINTS } from './endpoints';
import { ENV_CONFIG } from '../config/env';
import { authEvents } from './authEvents';
import { Platform } from 'react-native';
import { secureStorage } from '../utils/secureStorage';

// Force network requests to show up in React Native Debugger / DevTools
if (__DEV__) {
  // @ts-ignore
  global.XMLHttpRequest = global.originalXMLHttpRequest || global.XMLHttpRequest;
}

// Create axios instance with enhanced security
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // Increased timeout for file uploads
  maxRedirects: 1, // Follow redirects only once to prevent loops
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Api-Key': ENV_CONFIG.API_KEY,
    'ngrok-skip-browser-warning': 'true', // Bypass ngrok browser warning
  },
});

// Refresh token queue to prevent race conditions when multiple requests 401 at once
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Debug logging for network requests
    console.log(`🌐 API ${config.method?.toUpperCase()}: ${config.url}`, config.params || "");
    try {
      // 1. Try in-memory Zustand store first (instant, synchronous)
      let token: string | null = null;
      try {
        const { useUserStore } = require('../stores/userStore');
        token = useUserStore.getState().accessToken;
      } catch (_) {}

      // 2. Fallback to Keychain/Keystore and AsyncStorage
      if (!token) {
        token = (await secureStorage.getSecureItem('auth_token')) || (await AsyncStorage.getItem('auth_token'));
      }

      const isPublicEndpoint = 
        config.url?.includes(USER_ENDPOINTS.LOGIN) ||
        config.url?.includes(AUTH_ENDPOINTS.LOGIN) ||
        config.url?.includes(USER_ENDPOINTS.REGISTER) ||
        config.url?.includes(AUTH_ENDPOINTS.REGISTER) ||
        config.url?.includes(AUTH_ENDPOINTS.REFRESH_TOKEN) ||
        config.url?.includes(AUTH_ENDPOINTS.FORGOT_PASSWORD) ||
        config.url?.includes(AUTH_ENDPOINTS.RESET_PASSWORD);

      if (token && !config.headers?.skipAuth && !isPublicEndpoint) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (isPublicEndpoint && config.headers?.Authorization) {
        delete config.headers.Authorization;
      }
      if (config.headers?.skipAuth) {
        delete config.headers.skipAuth;
      }

      // Add requestType: "inbound" only to POST/PUT/PATCH requests (skip object-spread on FormData)
      if (['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '')) {
        if (config.data instanceof FormData) {
          config.headers['Content-Type'] = 'multipart/form-data';
          if (!(config.data as any).getAll || (config.data as any).getAll('requestType').length === 0) {
            config.data.append('requestType', 'inbound');
          }
        } else if (
          config.data !== undefined &&
          config.data !== null &&
          typeof config.data === 'object' &&
          !Array.isArray(config.data)
        ) {
          config.data = {
            ...config.data,
            requestType: 'inbound',
          };
        } else {
          config.data = { requestType: 'inbound' };
        }
      }

      return config;
    } catch (error) {
      console.error('Request interceptor error:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response [${response.status}]: ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    console.error(`❌ API Error [${error.response?.status}]: ${originalRequest?.url}`, error.response?.data || error.message);

    if (!error.response) {
      console.error('🌐 Detailed Network Error Info:', {
        message: error.message,
        code: error.code,
        config: error.config?.url,
        isAxiosError: error.isAxiosError,
      });
    }

    // Handle 429 Too Many Requests (Throttling)
    if (error.response?.status === 429) {
      console.warn('⚠️ API throttling detected:', error.response?.data);
      
      const detail = error.response?.data?.detail;
      const waitTimeMatch = detail?.match(/(\d+)\s*seconds?/i);
      const waitTime = waitTimeMatch ? parseInt(waitTimeMatch[1]) : 60;
      
      error.userMessage = `Too many requests. Please wait ${waitTime} seconds before trying again.`;
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // 1. Never treat login or registration failures as session expiry.
      // These are form submission errors (e.g. invalid credentials or user deleted).
      const isLoginOrRegisterEndpoint =
        originalRequest?.url?.includes(AUTH_ENDPOINTS.LOGIN) ||
        originalRequest?.url?.includes(USER_ENDPOINTS.LOGIN) ||
        originalRequest?.url?.includes(AUTH_ENDPOINTS.REGISTER) ||
        originalRequest?.url?.includes(USER_ENDPOINTS.REGISTER);

      if (isLoginOrRegisterEndpoint) {
        processQueue(error, null);
        return Promise.reject(error);
      }

      const hadAuthHeader = !!originalRequest?.headers?.Authorization;
      if (!hadAuthHeader) {
        // Request was sent without credentials (user already logged out or guest).
        // Simply reject the request without triggering an unauthorized logout cascade.
        processQueue(error, null);
        return Promise.reject(error);
      }

      const isAuthEndpoint = 
        originalRequest?.url?.includes(AUTH_ENDPOINTS.REFRESH_TOKEN) ||
        originalRequest?.url?.includes(AUTH_ENDPOINTS.LOGOUT) ||
        originalRequest?.url?.includes(USER_ENDPOINTS.LOGOUT);

      const isUserNotFound = 
        error.response?.data?.code === 'user_not_found' || 
        error.response?.data?.detail === 'User not found';

      // If user is deleted/not found, or if auth endpoint itself 401s, or request was already retried:
      // Immediately wipe auth state and trigger unauthorized without attempting token refresh
      if (isUserNotFound || isAuthEndpoint || originalRequest._retry) {
        processQueue(error, null);
        try {
          const { useUserStore } = require('../stores/userStore');
          useUserStore.getState().logout();
        } catch (_) {}
        await secureStorage.clearAllData().catch(() => {});
        await AsyncStorage.multiRemove([
          'auth_token',
          'refresh_token',
          'user_data',
          'is_logged_in',
          'current_active_role',
          'user_roles_data'
        ]).catch(() => {});
        authEvents.onUnauthorized.emit();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If a refresh is already in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        let refreshToken: string | null = null;
        try {
          const { useUserStore } = require('../stores/userStore');
          refreshToken = useUserStore.getState().refreshToken;
        } catch (_) {}

        if (!refreshToken) {
          refreshToken = (await secureStorage.getSecureItem('refresh_token')) || (await AsyncStorage.getItem('refresh_token'));
        }

        if (refreshToken) {
          const response = await axios.post(`${BASE_URL}${AUTH_ENDPOINTS.REFRESH_TOKEN}`, { 
            refresh: refreshToken 
          });
          const newToken = response.data.access_token || response.data.access;
          const newRefreshToken = response.data.refresh_token || refreshToken;
          
          await secureStorage.setSecureItem('auth_token', newToken);
          await AsyncStorage.setItem('auth_token', newToken);
          if (newRefreshToken) {
            await secureStorage.setSecureItem('refresh_token', newRefreshToken);
            await AsyncStorage.setItem('refresh_token', newRefreshToken);
          }

          // Sync with the Zustand store to notify hooks (like useWebSocket)
          try {
            const { useUserStore } = require('../stores/userStore');
            useUserStore.getState().setTokens(newToken, newRefreshToken);
          } catch (e) {
            console.error('⚠️ Failed to sync refreshed token to store:', e);
          }

          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          processQueue(error, null);
          const isLoggedIn = (await AsyncStorage.getItem('is_logged_in')) === 'true';
          if (isLoggedIn) {
            try {
              const { useUserStore } = require('../stores/userStore');
              useUserStore.getState().logout();
            } catch (_) {}
            await secureStorage.clearAllData().catch(() => {});
            await AsyncStorage.multiRemove([
              'auth_token',
              'refresh_token',
              'user_data',
              'is_logged_in',
              'current_active_role',
              'user_roles_data'
            ]).catch(() => {});
            authEvents.onUnauthorized.emit();
          }
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        try {
          const { useUserStore } = require('../stores/userStore');
          useUserStore.getState().logout();
        } catch (_) {}
        await secureStorage.clearAllData().catch(() => {});
        await AsyncStorage.multiRemove([
          'auth_token',
          'refresh_token',
          'user_data',
          'is_logged_in',
          'current_active_role',
          'user_roles_data'
        ]).catch(() => {});
        authEvents.onUnauthorized.emit();
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;