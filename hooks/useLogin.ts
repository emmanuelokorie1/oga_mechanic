import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI, LoginCredentials } from '@/lib/api/user';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { routes } from '@/constants/routes';
import { getErrorMessage } from '@/utils/errorMessages';
import { secureStorage } from '@/utils/secureStorage';
import { getRoleHomeRoute, normalizeRoleName } from '@/utils/authUtils';
import { registerPushNotificationsAndSyncDevice } from '@/services/notificationService';

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userAPI.login,
      onSuccess: async (response) => {
        // Clear any leftover cache from previous sessions
        queryClient.clear();
        
        try {
          // Handle login response structure - data is nested under 'data' property
          const responseData = response.data || response;
          
          if (responseData.access && responseData.refresh) {
            const { access, refresh, user } = responseData;
            const rawActiveRole =
              user?.active_role ||
              (user as any)?.current_role ||
              (responseData as any).active_role ||
              (responseData as any).current_role ||
              (user as any)?.role;
            const initialRole = normalizeRoleName(rawActiveRole);
            
            // Use actual user data from response
            const userData = user || {
              id: responseData.id || 'unknown',
              email: responseData.email || 'unknown@example.com',
              first_name: responseData.first_name || 'User',
              last_name: responseData.last_name || 'Name',
              role: initialRole
            };
            
            await AsyncStorage.multiSet([
              ['auth_token', access],
              ['refresh_token', refresh],
              ['user_data', JSON.stringify(userData)],
              ['is_logged_in', 'true'],
              ['current_active_role', initialRole],
            ]);

            try {
              await secureStorage.setAuthTokens(access, refresh);
              await secureStorage.setUserData(userData);
            } catch (secErr) {
              console.warn('Could not save to secureStorage:', secErr);
            }

            // Synchronize with the Zustand store to notify all hooks (including WebSockets)
            try {
              const { useUserStore } = require('../stores/userStore');
              useUserStore.getState().setTokens(access, refresh);
              useUserStore.getState().setUser(userData);
            } catch (e) {
              console.error('⚠️ Failed to sync login data to Zustand store:', e);
            }

            // Register device for push notifications globally across all roles
            registerPushNotificationsAndSyncDevice(true).catch((pushErr) => {
              console.warn('Push device registration on login warning:', pushErr);
            });
            
            // Call /users/roles/ endpoint after successful login to get server active role
            let activeRoleName = initialRole;
            try {
              const rolesResponse = await userAPI.getUserRoles();
              await AsyncStorage.setItem('user_roles_data', JSON.stringify(rolesResponse));
              
              const serverActiveRole = rolesResponse?.data?.active_role;
              if (serverActiveRole) {
                activeRoleName = normalizeRoleName(serverActiveRole);
              }
              await AsyncStorage.setItem('current_active_role', activeRoleName);
            } catch (rolesError) {
              console.error('Failed to fetch roles after login:', rolesError);
            }
            
            // Navigate based on user role (use normalized active role)
            const targetRoute = getRoleHomeRoute(activeRoleName);
            router.replace(targetRoute as any);
          } else {
            // Fallback: try direct response structure
            if (response.access && response.refresh) {
              const { access, refresh, user } = response;
              const rawActiveRole =
                user?.active_role ||
                (user as any)?.current_role ||
                (response as any).active_role ||
                (response as any).current_role ||
                (user as any)?.role;
              const initialRole = normalizeRoleName(rawActiveRole);
              
              const userData = user || {
                id: response.id || 'unknown',
                email: response.email || 'unknown@example.com',
                first_name: response.first_name || 'User',
                last_name: response.last_name || 'Name',
                role: initialRole
              };
              
              await AsyncStorage.multiSet([
                ['auth_token', access],
                ['refresh_token', refresh],
                ['user_data', JSON.stringify(userData)],
                ['is_logged_in', 'true'],
                ['current_active_role', initialRole],
              ]);

              try {
                await secureStorage.setAuthTokens(access, refresh);
                await secureStorage.setUserData(userData);
              } catch (secErr) {
                console.warn('Could not save to secureStorage:', secErr);
              }

              // Synchronize with the Zustand store (fallback path)
              try {
                const { useUserStore } = require('../stores/userStore');
                useUserStore.getState().setTokens(access, refresh);
                useUserStore.getState().setUser(userData);
              } catch (e) {
                console.error('⚠️ Failed to sync login data to Zustand store (fallback):', e);
              }

              // Register device for push notifications globally across all roles
              registerPushNotificationsAndSyncDevice(true).catch((pushErr) => {
                console.warn('Push device registration on login warning:', pushErr);
              });
              
              let activeRoleName = initialRole;
              try {
                const rolesResponse = await userAPI.getUserRoles();
                await AsyncStorage.setItem('user_roles_data', JSON.stringify(rolesResponse));
                const serverActiveRole = rolesResponse?.data?.active_role;
                if (serverActiveRole) {
                  activeRoleName = normalizeRoleName(serverActiveRole);
                }
                await AsyncStorage.setItem('current_active_role', activeRoleName);
              } catch (rolesError) {
                console.error('Failed to fetch roles after fallback login:', rolesError);
              }
              
              const targetRoute = getRoleHomeRoute(activeRoleName);
              router.replace(targetRoute as any);
            } else {
              // No valid tokens found
              console.error('No valid tokens found in login response');
              router.replace(routes?.userHome as any);
            }
          }
        } catch (storageError) {
          console.error('Error during login process:', storageError);
          router.replace(routes?.userHome as any);
        }
      },
    onError: (error: any) => {
      const errorMessage = getErrorMessage(error, 'login');
    },
  });
};
