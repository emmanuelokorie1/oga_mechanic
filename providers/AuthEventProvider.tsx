import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { router, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from '@/lib/authEvents';
import { routes } from '@/constants/routes';
import { useMechanicStore } from '@/stores/mechanicStore';
import { useRegistrationStore } from '@/stores/registrationStore';
import { useUserStore } from '@/stores/userStore';
import { secureStorage } from '@/utils/secureStorage';
import { useAuthContext } from '@/contexts/AuthContext';

export const AuthEventProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const auth = useAuthContext();
  const pathname = usePathname();
  const isHandlingRef = useRef(false);

  useEffect(() => {
    const unsubscribe = authEvents.onUnauthorized.subscribe(async () => {
      if (isHandlingRef.current) return;
      isHandlingRef.current = true;
      console.log('🔒 401 Unauthorized - Logging out user...');
      
      try {
        // Cancel active queries first to prevent TanStack Query from immediately refetching
        await queryClient.cancelQueries();
        queryClient.clear();
        
        // Clear global stores
        useMechanicStore.getState().reset();
        useRegistrationStore.getState().clearStepByStepData();
        useUserStore.getState().logout();

        // Clear all auth data (secureStorage + AsyncStorage)
        try {
          await secureStorage.clearAllData();
        } catch (_) {}

        await AsyncStorage.multiRemove([
          'auth_token',
          'refresh_token',
          'user_data',
          'is_logged_in',
          'current_active_role',
          'user_roles_data'
        ]).catch(() => {});
        
        // Sync auth context status to update isAuthenticated to false
        await auth.checkAuthStatus().catch(() => {});

        console.log('✅ Auth data cleared, redirecting to login...');
        
        // Only navigate to login if not already on an auth screen
        const isAuthScreen =
          pathname?.includes('sign_in') ||
          pathname?.includes('login') ||
          pathname?.includes('welcome') ||
          pathname?.includes('register');

        if (!isAuthScreen) {
          router.replace(routes?.signIn as any);
        }
      } catch (error) {
        console.error('❌ Error during 401 logout:', error);
        const isAuthScreen =
          pathname?.includes('sign_in') ||
          pathname?.includes('login') ||
          pathname?.includes('welcome') ||
          pathname?.includes('register');

        if (!isAuthScreen) {
          router.replace(routes?.signIn as any);
        }
      } finally {
        setTimeout(() => {
          isHandlingRef.current = false;
        }, 2500);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [auth, queryClient, pathname]);

  return <>{children}</>;
};
