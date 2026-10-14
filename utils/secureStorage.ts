import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Secure storage keys
const SECURE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  API_KEY: 'api_key',
  BIOMETRIC_ENABLED: 'biometric_enabled',
} as const;

// Non-sensitive data that can be stored in AsyncStorage
const NON_SENSITIVE_KEYS = {
  IS_LOGGED_IN: 'is_logged_in',
  HAS_SEEN_WELCOME: 'has_seen_welcome',
  USER_ROLES_DATA: 'user_roles_data',
  CURRENT_ACTIVE_ROLE: 'current_active_role',
  APP_SETTINGS: 'app_settings',
} as const;

interface SecureStorageInterface {
  // Secure storage methods
  setSecureItem: (key: string, value: string) => Promise<void>;
  getSecureItem: (key: string) => Promise<string | null>;
  removeSecureItem: (key: string) => Promise<void>;
  clearSecureStorage: () => Promise<void>;
  
  // Non-sensitive storage methods
  setItem: (key: string, value: string) => Promise<void>;
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  clearStorage: () => Promise<void>;
  
  // Auth-specific methods
  setAuthTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  getAuthTokens: () => Promise<{ accessToken: string | null; refreshToken: string | null }>;
  clearAuthTokens: () => Promise<void>;
  
  // User data methods
  setUserData: (userData: any) => Promise<void>;
  getUserData: () => Promise<any>;
  clearUserData: () => Promise<void>;
  
  // Complete logout
  clearAllData: () => Promise<void>;
}

class SecureStorageManager implements SecureStorageInterface {
  // Secure storage methods using Expo SecureStore
  async setSecureItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Fallback to AsyncStorage for web
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.warn(`[SecureStorage] SecureStore failed for ${key}, falling back to AsyncStorage:`, error);
      try {
        await AsyncStorage.setItem(key, value);
      } catch (innerError) {
        console.error(`[SecureStorage] Fallback AsyncStorage failed for ${key}:`, innerError);
        throw new Error('Failed to store secure data');
      }
    }
  }

  async getSecureItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return await AsyncStorage.getItem(key);
      } else {
        const val = await SecureStore.getItemAsync(key);
        if (val !== null) return val;
        // Try fallback in case it was written to AsyncStorage
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.warn(`[SecureStorage] SecureStore.getItemAsync failed for ${key}, trying AsyncStorage:`, error);
      try {
        return await AsyncStorage.getItem(key);
      } catch (innerError) {
        console.error(`[SecureStorage] Fallback AsyncStorage.getItem failed for ${key}:`, innerError);
        return null;
      }
    }
  }

  async removeSecureItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
        await AsyncStorage.removeItem(key); // Clear fallback
      }
    } catch (error) {
      console.warn(`[SecureStorage] removeSecureItem failed for ${key}, trying AsyncStorage:`, error);
      try {
        await AsyncStorage.removeItem(key);
      } catch (innerError) {
        console.error(`[SecureStorage] Fallback AsyncStorage.removeItem failed for ${key}:`, innerError);
      }
    }
  }

  async clearSecureStorage(): Promise<void> {
    try {
      const keys = Object.values(SECURE_KEYS);
      await Promise.all(keys.map(key => this.removeSecureItem(key)));
    } catch (error) {
      console.error('Failed to clear secure storage:', error);
    }
  }

  // Non-sensitive storage methods using AsyncStorage
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to set item ${key}:`, error);
      throw new Error('Failed to store data');
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Failed to get item ${key}:`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove item ${key}:`, error);
    }
  }

  async clearStorage(): Promise<void> {
    try {
      // Only clear user session-related keys; preserve persistent device state like HAS_SEEN_WELCOME
      const sessionKeys = [
        NON_SENSITIVE_KEYS.IS_LOGGED_IN,
        NON_SENSITIVE_KEYS.USER_ROLES_DATA,
        NON_SENSITIVE_KEYS.CURRENT_ACTIVE_ROLE,
      ];
      await Promise.all(sessionKeys.map(key => this.removeItem(key)));
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  // Auth-specific methods
  async setAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await Promise.all([
        this.setSecureItem(SECURE_KEYS.AUTH_TOKEN, accessToken),
        this.setSecureItem(SECURE_KEYS.REFRESH_TOKEN, refreshToken),
        this.setItem(NON_SENSITIVE_KEYS.IS_LOGGED_IN, 'true'),
      ]);
    } catch (error) {
      console.error('Failed to set auth tokens:', error);
      throw new Error('Failed to store authentication tokens');
    }
  }

  async getAuthTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.getSecureItem(SECURE_KEYS.AUTH_TOKEN),
        this.getSecureItem(SECURE_KEYS.REFRESH_TOKEN),
      ]);
      
      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Failed to get auth tokens:', error);
      return { accessToken: null, refreshToken: null };
    }
  }

  async clearAuthTokens(): Promise<void> {
    try {
      await Promise.all([
        this.removeSecureItem(SECURE_KEYS.AUTH_TOKEN),
        this.removeSecureItem(SECURE_KEYS.REFRESH_TOKEN),
        this.removeItem(NON_SENSITIVE_KEYS.IS_LOGGED_IN),
      ]);
    } catch (error) {
      console.error('Failed to clear auth tokens:', error);
    }
  }

  // User data methods
  async setUserData(userData: any): Promise<void> {
    try {
      await this.setSecureItem(SECURE_KEYS.USER_DATA, JSON.stringify(userData));
    } catch (error) {
      console.error('Failed to set user data:', error);
      throw new Error('Failed to store user data');
    }
  }

  async getUserData(): Promise<any> {
    try {
      const userDataString = await this.getSecureItem(SECURE_KEYS.USER_DATA);
      return userDataString ? JSON.parse(userDataString) : null;
    } catch (error) {
      console.error('Failed to get user data:', error);
      return null;
    }
  }

  async clearUserData(): Promise<void> {
    try {
      await this.removeSecureItem(SECURE_KEYS.USER_DATA);
    } catch (error) {
      console.error('Failed to clear user data:', error);
    }
  }

  // Complete logout
  async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        this.clearSecureStorage(),
        this.clearStorage(),
      ]);
    } catch (error) {
      console.error('Failed to clear all data:', error);
    }
  }
}

// Export singleton instance
export const secureStorage = new SecureStorageManager();

// Export types and constants
export { SECURE_KEYS, NON_SENSITIVE_KEYS };
export type { SecureStorageInterface };
