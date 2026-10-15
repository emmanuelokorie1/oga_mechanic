import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI, LogoutCredentials } from '@/lib/api/user';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { routes } from '@/constants/routes';
import { useMechanicStore } from '@/stores/mechanicStore';
import { useRegistrationStore } from '@/stores/registrationStore';
import { useUserStore } from '@/stores/userStore';
import { secureStorage } from '@/utils/secureStorage';

export const useLogout = () => {
  const queryClient = useQueryClient();

  const handleLocalCleanup = async () => {
    // 1. Cancel running queries first to prevent 401 refetch storms
    await queryClient.cancelQueries();
    queryClient.clear();

    // 2. Clear global stores
    useMechanicStore.getState().reset();
    useRegistrationStore.getState().clearStepByStepData();
    useUserStore.getState().logout();

    // 3. Clear storage (secure + non-sensitive)
    try {
      await secureStorage.clearAllData();
    } catch (_) {}

    await AsyncStorage.multiRemove([
      'auth_token',
      'refresh_token',
      'user_data',
      'is_logged_in',
      'user_roles_data',
      'current_active_role',
      'switched_account'
    ]).catch(() => {});

    await AsyncStorage.setItem('just_logged_out', 'true');

    // 4. Navigate to sign-in page
    router.replace(routes?.signIn);
  };

  return useMutation({
    mutationFn: userAPI.logout,
    onSuccess: async () => {
      await handleLocalCleanup();
    },
    onError: async () => {
      await handleLocalCleanup();
    },
  });
};
