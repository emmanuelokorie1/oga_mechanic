import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { routes } from '@/constants/routes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userAPI } from '@/lib/api/user';
import { useMechanicStore } from '@/stores/mechanicStore';
import { useRegistrationStore } from '@/stores/registrationStore';
import { useUserStore } from '@/stores/userStore';
import { secureStorage } from '@/utils/secureStorage';

export const useCentralizedLogout = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const queryClient = useQueryClient();

  const logout = async () => {
    if (isLoggingOut) return; // Prevent multiple simultaneous logouts
    
    setIsLoggingOut(true);
    
    try {
      console.log('🔄 Starting centralized logout process...');
      
      // Get refresh token for API logout
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          // Call logout API
          await userAPI.logout({ refresh: refreshToken });
          console.log('✅ Logout API called successfully');
        } catch (apiError) {
          console.error('❌ Logout API failed, but continuing with local logout:', apiError);
        }
      }
      
      // Cancel active queries and clear cache
      await queryClient.cancelQueries();
      queryClient.clear();
      
      // Clear global stores
      useMechanicStore.getState().reset();
      useRegistrationStore.getState().clearStepByStepData();
      useUserStore.getState().logout();

      // Clear all stored auth data (both secure storage and AsyncStorage)
      try {
        await secureStorage.clearAllData();
      } catch (e) {
        console.warn('Error clearing secureStorage:', e);
      }

      await AsyncStorage.multiRemove([
        'auth_token',
        'refresh_token',
        'user_data',
        'is_logged_in',
        'current_active_role',
        'user_roles_data',
        'switched_account'
      ]);
      await AsyncStorage.setItem('just_logged_out', 'true');
      
      console.log('✅ All auth data cleared from storage');
      
      // Navigate to login page
      router.replace(routes?.signIn as any);
      
      console.log('✅ Centralized logout successful');
      
    } catch (error) {
      console.error('❌ Error during centralized logout:', error);
      
      // Fallback: clear storage and navigate even if everything fails
      await queryClient.cancelQueries().catch(() => {});
      queryClient.clear();
      useMechanicStore.getState().reset();
      useRegistrationStore.getState().clearStepByStepData();
      useUserStore.getState().logout();
      
      try {
        await secureStorage.clearAllData();
        await AsyncStorage.multiRemove([
          'auth_token',
          'refresh_token',
          'user_data',
          'is_logged_in',
          'current_active_role',
          'user_roles_data',
          'switched_account'
        ]);
        await AsyncStorage.setItem('just_logged_out', 'true');
        router.replace(routes?.signIn as any);
      } catch (fallbackError) {
        console.error('❌ Fallback logout failed:', fallbackError);
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  return {
    logout,
    isLoggingOut,
  };
};
