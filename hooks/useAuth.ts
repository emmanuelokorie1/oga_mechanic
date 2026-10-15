import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from '@/utils/secureStorage';
import { routes } from '@/constants/routes';
import { userAPI } from '@/lib/api/user';
import { getRoleHomeRoute, normalizeRoleName } from '@/utils/authUtils';

interface UserData {
  access_token: string;
  refresh_token: string;
  user_id: string;
  email: string;
  role: string;
  message: string;
  referenceId: string;
}

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<string | null>(null);
  const router = useRouter();

  // Check authentication status on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Handle navigation after auth check is complete
  // router is intentionally excluded from deps — it's a stable singleton in Expo Router
  // and including it caused the effect to re-fire on re-renders.
  useEffect(() => {
    if (shouldNavigate && navigationTarget && !isLoading) {
      
      // Small delay to prevent navigation conflicts
      const timer = setTimeout(() => {
        router.replace(navigationTarget as any);
        setShouldNavigate(false);
        setNavigationTarget(null);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldNavigate, navigationTarget, isLoading]);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);

      // Check if this is the first time opening the app
      const hasSeenWelcome = await AsyncStorage.getItem('has_seen_welcome');

      // If first time user, show welcome screen
      if (!hasSeenWelcome) {
        setIsAuthenticated(false);
        setUserData(null);
        setNavigationTarget(routes?.welcome as any);
        setShouldNavigate(true);
        return;
      }

      // Check if user is logged in
      const isLoggedIn = await AsyncStorage.getItem('is_logged_in');
      const accessToken = (await secureStorage.getSecureItem('auth_token')) || (await AsyncStorage.getItem('auth_token'));
      const storedUserData = await AsyncStorage.getItem('user_data');

      if (isLoggedIn === 'true' && accessToken && storedUserData) {
        // Bug 14 fix: Check JWT expiry before trusting the stored token.
        // A stored token that has expired would pass the above check but cause
        // 401 errors on every subsequent API call.
        const isTokenExpired = (() => {
          try {
            const [, payload] = accessToken.split('.');
            const decoded = JSON.parse(atob(payload));
            // exp is in seconds; Date.now() is in milliseconds
            return decoded.exp * 1000 < Date.now();
          } catch {
            // If decoding fails, treat token as expired to be safe
            return true;
          }
        })();

        if (isTokenExpired) {
          // Attempt a token refresh before giving up
          const refreshed = await refreshToken();
          if (!refreshed) {
            // Refresh failed — send user to login
            setIsAuthenticated(false);
            setUserData(null);
            setNavigationTarget(routes?.signIn as any || '/sign-in');
            setShouldNavigate(true);
            return;
          }
        }

        const userData: UserData = JSON.parse(storedUserData);
        setUserData(userData);
        setIsAuthenticated(true);

        // Sync tokens to Zustand store so WebSockets and all subscribers immediately receive active token
        try {
          const storedRefreshToken = (await secureStorage.getSecureItem('refresh_token')) || (await AsyncStorage.getItem('refresh_token')) || '';
          const { useUserStore } = await import('@/stores/userStore');
          useUserStore.getState().setTokens(accessToken, storedRefreshToken);
          useUserStore.getState().setUser(userData as any);
        } catch (_) {}
        
        // Resolve role immediately from local cache or userData for instant cold start
        const storedActiveRole = await AsyncStorage.getItem('current_active_role');
        const initialRole = storedActiveRole ? normalizeRoleName(storedActiveRole) : normalizeRoleName(userData.role);
        const targetRoute = getRoleHomeRoute(initialRole);
        setNavigationTarget(targetRoute as any);
        setShouldNavigate(true);

        // Refresh active role from server in the background (non-blocking)
        userAPI.getUserRoles().then(async (rolesResponse) => {
          const activeRole = rolesResponse?.data?.active_role;
          if (activeRole) {
            const resolvedRole = normalizeRoleName(activeRole);
            await AsyncStorage.setItem('current_active_role', resolvedRole);
          }
        }).catch((err) => {
          console.warn('⚠️ [useAuth] Background role sync warning:', err?.message || err);
        });
      } else {
        setIsAuthenticated(false);
        setUserData(null);
        // Set navigation target for login/register flow
        setNavigationTarget(routes?.signIn as any || '/sign-in');
        setShouldNavigate(false);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUserData(null);
      setNavigationTarget(routes?.signIn as any || '/sign-in');
      setShouldNavigate(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Get refresh token for API logout
      const storedRefreshToken = await AsyncStorage.getItem('refresh_token');
      
      if (storedRefreshToken) {
        try {
          const { userAPI } = await import('@/lib/api/user');
          await userAPI.logout({ refresh: storedRefreshToken });
        } catch (apiError) {
          // Best-effort: server-side logout failure should not block local cleanup
        }
      }
      
      // Bug 1 & 15 fix: Do NOT call getUserRoles() after logout — the token is
      // about to be cleared, so the call may use an invalidated token. Persisting
      // role data also leaks information to any future session on the same device.
      try {
        await secureStorage.clearAllData();
      } catch (_) {}

      try {
        const { useUserStore } = await import('@/stores/userStore');
        useUserStore.getState().logout();
      } catch (_) {}

      await AsyncStorage.multiRemove([
        'auth_token',
        'refresh_token',
        'user_data',
        'is_logged_in',
        'user_roles_data',   // Bug 15: remove stale role data instead of writing it
        'current_active_role',
        'switched_account',
      ]);
      await AsyncStorage.setItem('just_logged_out', 'true');
      
      setIsAuthenticated(false);
      setUserData(null);
      
      // Navigate to login
      setNavigationTarget(routes?.signIn as any);
      setShouldNavigate(true);
      
    } catch (error) {
      // Ensure UI reflects logged-out state even if cleanup partially fails
      setIsAuthenticated(false);
      setUserData(null);
    }
  };

  const refreshToken = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const { BASE_URL } = await import('@/lib/endpoints'); // Accessing endpoints
      const response = await fetch(`${BASE_URL}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      const data = await response.json();
      if (data.access) {
        await AsyncStorage.setItem('auth_token', data.access);
        try {
          await secureStorage.setSecureItem('auth_token', data.access);
          const { useUserStore } = await import('@/stores/userStore');
          useUserStore.getState().setTokens(data.access, refreshToken);
        } catch (_) {}
        return true;
      }
      return false;
    } catch (error) {
      await logout();
      return false;
    }
  };

  // Utility function to reset welcome screen flag (for testing)
  const resetWelcomeFlag = async () => {
    try {
      await AsyncStorage.removeItem('has_seen_welcome');
      console.log('✅ Welcome screen flag reset - user will see welcome screen on next app start');
    } catch (error) {
      console.error('❌ Error resetting welcome flag:', error);
    }
  };

  return {
    isLoading,
    isAuthenticated,
    userData,
    logout,
    refreshToken,
    checkAuthStatus,
    shouldNavigate,
    navigationTarget,
    resetWelcomeFlag, // For testing purposes
  };
};
