import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { ENV_CONFIG } from '@/config/env';
import { userAPI, GoogleAuthPayload, GoogleAuthResponse } from '@/lib/api/user';
import { routes, mechanicRoutes, sellerRoutes } from '@/constants/routes';
import { getRoleHomeRoute, normalizeRoleName } from '@/utils/authUtils';
import { registerPushNotificationsAndSyncDevice } from '@/services/notificationService';

// Safely import the Google Sign-In module — it may not be available
// in Expo Go or when the native module isn't properly registered.
let GoogleSignin: any = null;
let statusCodes: any = {};
let isSuccessResponse: any = () => false;
let isCancelledResponse: any = () => false;
let isErrorWithCode: any = () => false;

try {
  const gsi = require('@react-native-google-signin/google-signin');
  GoogleSignin = gsi.GoogleSignin;
  statusCodes = gsi.statusCodes;
  isSuccessResponse = gsi.isSuccessResponse;
  isCancelledResponse = gsi.isCancelledResponse;
  isErrorWithCode = gsi.isErrorWithCode;
} catch (e) {
  console.warn('Google Sign-In native module not available:', e);
}

export interface GoogleSignInOptions {
  /** Target role for registration / sign-in (e.g., 'primary_user', 'mechanic', 'merchant') */
  role?: string;
  /** Optional phone number in international format (+234...) */
  phoneNumber?: string;
  /** Whether to automatically navigate based on role upon successful login (default: true) */
  shouldNavigate?: boolean;
}

export interface GoogleSignInResult {
  type: 'success' | 'cancelled' | 'error';
  success: boolean;
  isNewUser?: boolean;
  user?: any;
  role?: string;
  tokens?: {
    access: string;
    refresh: string;
  };
}

export const useGoogleSignIn = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isCheckingSignIn, setIsCheckingSignIn] = useState(true);
  const [isNativeAvailable, setIsNativeAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!GoogleSignin) {
      console.warn('Google Sign-In: Native module not available. Skipping configuration.');
      setIsInitialized(true);
      setIsCheckingSignIn(false);
      return;
    }

    try {
      // Initialize Google Sign-in
      GoogleSignin.configure({
        // Web Client ID / Google Sign-Up API Key
        webClientId: ENV_CONFIG.GOOGLE_SIGN_UP_API_KEY || ENV_CONFIG.GOOGLE_WEB_CLIENT_ID,
        // iOS Client ID
        iosClientId: ENV_CONFIG.GOOGLE_IOS_CLIENT_ID,
        offlineAccess: true, // Enables serverAuthCode for server-side token exchange
        hostedDomain: '',
        forceCodeForRefreshToken: true,
      });
      setIsNativeAvailable(true);
    } catch (e) {
      console.warn('Google Sign-In: Failed to configure:', e);
      setIsInitialized(true);
      setIsCheckingSignIn(false);
      return;
    }
    
    // Check if user is already signed in (silent sign-in)
    checkIfUserIsSignedIn();
  }, []);

  const checkIfUserIsSignedIn = async () => {
    try {
      setIsCheckingSignIn(true);
      const isSignIn = await GoogleSignin.hasPlayServices();
      if (isSignIn) {
         const hasPreviousSignIn = await GoogleSignin.hasPreviousSignIn();
         if (hasPreviousSignIn) {
            const currentUser = await GoogleSignin.getCurrentUser();
            setUserInfo(currentUser);
         }
      }
    } catch (error: any) {
      console.log('Google Sign-in check error', error);
    } finally {
      setIsInitialized(true);
      setIsCheckingSignIn(false);
    }
  };

  /**
   * Triggers the Google Sign-In native flow and exchanges the Google tokens
   * with your backend at POST /users/google/.
   */
  const signIn = async (options?: GoogleSignInOptions): Promise<GoogleSignInResult> => {
    if (!GoogleSignin || !isNativeAvailable) {
      throw new Error('Google Sign-In is not available on this device. Please use a development build.');
    }

    try {
      setIsLoading(true);
      setError(null);

      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      
      if (isSuccessResponse(response)) {
        const tokens = await GoogleSignin.getTokens(); // Extract idToken and accessToken
        setUserInfo(response.data);
        
        const serverAuthCode = response.data?.serverAuthCode || '';
        const idToken = tokens.idToken;
        const accessToken = tokens.accessToken;

        // 1. Send Google tokens to backend POST /users/google/
        const payload: GoogleAuthPayload = {
          id_token: idToken,
          access_token: accessToken,
          code: serverAuthCode,
          role: options?.role || 'primary_user',
          ...(options?.phoneNumber ? { phone_number: options.phoneNumber } : {}),
        };

        const authResponse = await userAPI.googleAuth(payload);
        const responseData = authResponse.data || (authResponse as any);
        const { access, refresh, is_new_user, user } = responseData;

        if (!access) {
          throw new Error(authResponse.message || 'Failed to authenticate with backend');
        }

        const rawRole = user?.active_role || (user as any)?.current_role || (responseData as any)?.current_role || options?.role || 'primary_user';
        let activeRoleName = normalizeRoleName(rawRole);
        const userData = user || {
          id: 'unknown',
          email: 'unknown@example.com',
          first_name: 'User',
          last_name: 'Name',
          role: activeRoleName,
        };

        // 2. Persist session data to AsyncStorage
        await AsyncStorage.multiSet([
          ['auth_token', access],
          ['refresh_token', refresh],
          ['user_data', JSON.stringify(userData)],
          ['is_logged_in', 'true'],
          ['current_active_role', activeRoleName],
        ]);

        // 3. Synchronize with Zustand user store
        try {
          const { useUserStore } = require('../stores/userStore');
          useUserStore.getState().setTokens(access, refresh);
          useUserStore.getState().setUser(userData);
        } catch (storeError) {
          console.error('⚠️ Failed to sync login data to Zustand store:', storeError);
        }

        // Register device for push notifications globally across all roles
        registerPushNotificationsAndSyncDevice(true).catch((pushErr) => {
          console.warn('Push device registration on Google Sign-In warning:', pushErr);
        });

        // 4. Load user roles
        try {
          const rolesResponse = await userAPI.getUserRoles();
          await AsyncStorage.setItem('user_roles_data', JSON.stringify(rolesResponse));
          const serverActiveRole = rolesResponse?.data?.active_role;
          if (serverActiveRole) {
            activeRoleName = normalizeRoleName(serverActiveRole);
            await AsyncStorage.setItem('current_active_role', activeRoleName);
          }
        } catch (rolesError) {
          console.log('Roles fetch notice:', rolesError);
        }

        // 5. Navigate based on role if shouldNavigate is not false
        if (options?.shouldNavigate !== false) {
          const targetRoute = getRoleHomeRoute(activeRoleName);
          router.replace(targetRoute as any);
        }

        return {
          type: 'success',
          success: true,
          isNewUser: is_new_user,
          user: userData,
          role: activeRoleName,
          tokens: { access, refresh },
        };
      } else if (isCancelledResponse(response)) {
        console.log('User cancelled Google sign in');
        return { type: 'cancelled', success: false };
      } else {
        console.log('Other Google sign in response:', response);
        return { type: 'cancelled', success: false };
      }
    } catch (error: any) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          console.log('User cancelled Google sign in');
          return { type: 'cancelled', success: false };
        } else if (error.code === statusCodes.IN_PROGRESS) {
          console.log('Google sign in is already in progress');
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          console.log('Google Play services not available or outdated');
        }
      }
      
      console.error('Google Sign-In Error:', error);
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    if (!GoogleSignin) return;
    try {
      await GoogleSignin.signOut();
      setUserInfo(null);
    } catch (error) {
      console.error('Google sign out error', error);
    }
  };

  return {
    signIn,
    signOut,
    userInfo,
    isInitialized,
    isCheckingSignIn,
    isNativeAvailable,
    isLoading,
    error,
  };
};
