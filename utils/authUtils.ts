import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from '@/utils/secureStorage';
import { router } from 'expo-router';
import { routes, mechanicRoutes, sellerRoutes } from '@/constants/routes';

export const normalizeRoleName = (role: any): string => {
  if (!role) return 'primary_user';
  if (typeof role === 'object') {
    return role.name || role.roleName || role.role || 'primary_user';
  }
  return String(role).trim().toLowerCase();
};

// Get role-specific home route
export const getRoleHomeRoute = (role: any): string => {
  const normalized = normalizeRoleName(role);
  switch (normalized) {
    case 'mechanic':
      return mechanicRoutes?.home || '/(root)/(tabs)/(mechanic)/home';
    case 'merchant':
    case 'seller':
    case 'vehicle_rental':
      return sellerRoutes?.home || '/(root)/(tabs)/(sellers)/home';
    case 'primary_user':
    case 'user':
    default:
      return routes?.userHome || '/(root)/(tabs)/(user)/home';
  }
};

export interface MockUserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

// Mock user data for different roles
const mockUsers: Record<string, MockUserData> = {
  user: {
    id: 'user-123',
    email: 'user@example.com',
    first_name: 'John',
    last_name: 'Doe',
    role: 'primary_user'
  },
  mechanic: {
    id: 'mechanic-123',
    email: 'mechanic@example.com',
    first_name: 'Mike',
    last_name: 'Johnson',
    role: 'mechanic'
  },
};

// Direct login to specific role (for testing/development)
export const loginAsRole = async (role: 'user' | 'mechanic') => {
  try {
    const userData = mockUsers[role];
    const mockTokens = {
      access: `mock_access_token_${role}_${Date.now()}`,
      refresh: `mock_refresh_token_${role}_${Date.now()}`
    };

    // Store auth data
    await AsyncStorage.multiSet([
      ['auth_token', mockTokens.access],
      ['refresh_token', mockTokens.refresh],
      ['user_data', JSON.stringify(userData)],
      ['is_logged_in', 'true'],
      ['current_active_role', userData.role]
    ]);

    // Navigate to role-specific home
    const targetRoute = getRoleHomeRoute(role);
    router.replace(targetRoute as any);
    
    return { success: true, userData };
  } catch (error) {
    return { success: false, error };
  }
};

// Check if user is logged in
export const isLoggedIn = async (): Promise<boolean> => {
  try {
    const isLoggedIn = await AsyncStorage.getItem('is_logged_in');
    const accessToken = (await secureStorage.getSecureItem('auth_token')) || (await AsyncStorage.getItem('auth_token'));
    return isLoggedIn === 'true' && !!accessToken;
  } catch (error) {
    console.error('❌ Error checking login status:', error);
    return false;
  }
};

// Get current user data
export const getCurrentUser = async (): Promise<MockUserData | null> => {
  try {
    const userDataString = await AsyncStorage.getItem('user_data');
    if (userDataString) {
      return JSON.parse(userDataString);
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting current user:', error);
    return null;
  }
};

// Clear all auth data
export const clearAuthData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      'auth_token',
      'refresh_token',
      'user_data',
      'is_logged_in'
    ]);
    console.log('✅ Auth data cleared');
  } catch (error) {
    console.error('❌ Error clearing auth data:', error);
  }
};