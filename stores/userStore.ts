import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userAPI, LoginCredentials, RegisterData, UserProfile } from '../lib/api/user';
import { showToast } from '../utils/toastUtils';
import { secureStorage } from '../utils/secureStorage';

interface UserState {
  // State
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  hasHydrated: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<void>;
  clearError: () => void;
  setUser: (user: UserProfile) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      hasHydrated: false,

      // Actions
      login: async (credentials: LoginCredentials) => {
        try {
          set({ loading: true, error: null });
          
          const response = await userAPI.login(credentials);
          
          if (response.status && response.data) {
            // Store tokens and user data
            await AsyncStorage.setItem('auth_token', response.data.access);
            await AsyncStorage.setItem('refresh_token', response.data.refresh);
            await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
            
            set({
              user: response.data.user,
              accessToken: response.data.access,
              refreshToken: response.data.refresh,
              isAuthenticated: true,
              loading: false,
            });
            
            return true;
          }
          return false;
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Login failed';
          showToast.error(errorMessage);
          set({ 
            error: errorMessage,
            loading: false 
          });
          return false;
        }
      },

      register: async (userData: RegisterData) => {
        try {
          set({ loading: true, error: null });
          
          // Transform the data to match API requirements
          const apiData = {
            email: userData.email,
            password: userData.password,
            password_confirm: userData.password_confirm,
            first_name: userData.first_name,
            last_name: userData.last_name,
            roles: [0] // User role is 0
          };
          
                const response = await userAPI.register(apiData);
      

      
      if (response.success) {
        set({
          user: response.data.user,
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
          isAuthenticated: true,
          loading: false,
          error: null
        });
        showToast.success("Registration successful! Welcome!");
        return true;
      } else {
        set({ 
          error: response.message || 'Registration failed',
          loading: false 
        });
        return false;
      }
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Registration failed';
          showToast.error(errorMessage);
          set({ 
            error: errorMessage,
            loading: false 
          });
          return false;
        }
      },

      logout: async () => {
        try {
          try {
            await secureStorage.clearAllData();
          } catch (_) {}
          
          // Clear all auth tokens from AsyncStorage
          await AsyncStorage.multiRemove([
            'auth_token',
            'refresh_token',
            'user_data',
            'is_logged_in',
            'current_active_role',
            'user_roles_data'
          ]);
        } catch (error) {
          console.error('Error during logout process:', error);
        }
        
        // Clear state
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      updateProfile: async (profileData: Partial<UserProfile>) => {
        try {
          set({ loading: true, error: null });
          
          const updatedProfile = await userAPI.updateProfile(profileData);
          
          set({
            user: updatedProfile,
            loading: false,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Profile update failed';
          showToast.error(errorMessage);
          set({ 
            error: errorMessage,
            loading: false 
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setUser: (user: UserProfile) => {
        set({ user });
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken, isAuthenticated: true });
      },
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          state?.clearError(); // Just an example of using the state
          // To update the state properly, we can just rely on the initial hasHydrated: false
          // and set it here if we have a way. 
          // Actually, in Zustand persist, if you want to set state after rehydration:
          useUserStore.setState({ hasHydrated: true });
        };
      },
    }
  )
);
