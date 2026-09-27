import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { ENV_CONFIG } from '@/config/env';

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

export const useGoogleSignIn = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isCheckingSignIn, setIsCheckingSignIn] = useState(true);
  const [isNativeAvailable, setIsNativeAvailable] = useState(false);

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
        offlineAccess: true, // If you want to access Google API on behalf of the user FROM YOUR SERVER
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
            const userInfo = await GoogleSignin.getCurrentUser();
            setUserInfo(userInfo);
         }
      }
    } catch (error: any) {
      console.log('Google Sign-in check error', error);
    } finally {
      setIsInitialized(true);
      setIsCheckingSignIn(false);
    }
  };

  const signIn = async () => {
    if (!GoogleSignin || !isNativeAvailable) {
      throw new Error('Google Sign-In is not available on this device.');
    }

    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      
      if (isSuccessResponse(response)) {
        const tokens = await GoogleSignin.getTokens(); // Extract idToken and accessToken
        
        setUserInfo(response.data);
        
        // If serverAuthCode is null, we pass an empty string to satisfy the backend
        const serverAuthCode = response.data.serverAuthCode || '';
        
        // Send tokens to backend for verification and login/registration
        await handleBackendVerification(
          tokens.idToken, 
          tokens.accessToken, 
          serverAuthCode
        );
        
        return response;
      } else if (isCancelledResponse(response)) {
        console.log('User cancelled sign in');
        return response;
      } else {
        console.log('Other sign in response:', response);
        return response;
      }
    } catch (error: any) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          console.log('User cancelled sign in');
        } else if (error.code === statusCodes.IN_PROGRESS) {
          console.log('Sign in is in progress');
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          console.log('Play services not available or outdated');
        } else {
          console.log('Google sign in error', error);
        }
      } else {
        console.log('Google sign in error', error);
      }
      setError(error);
      throw error;
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
  
  // Backend verification using your /users/google/ endpoint
  const handleBackendVerification = async (idToken: string, accessToken: string, code: string) => {
    try {
      // Import BASE_URL dynamically like in useAuth.ts
      const { BASE_URL } = await import('@/lib/endpoints');
      
      console.log('Sending Google tokens to backend...', { idToken, accessToken, code });
      
      const response = await fetch(`${BASE_URL}/users/google/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id_token: idToken,
          access_token: accessToken,
          code: code
        })
      });
      
      const data = await response.json();
      console.log('Backend Google Auth Response:', data);
      
      if (response.ok && data) {
        // Import AsyncStorage dynamically
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        
        // TODO: Adapt these keys based on what your backend actually returns!
        // Usually it returns an access token and user data.
        if (data.access_token || data.access) {
          await AsyncStorage.setItem('auth_token', data.access_token || data.access);
          if (data.refresh_token || data.refresh) {
             await AsyncStorage.setItem('refresh_token', data.refresh_token || data.refresh);
          }
          await AsyncStorage.setItem('is_logged_in', 'true');
          await AsyncStorage.setItem('user_data', JSON.stringify(data.user || data));
        }
      } else {
        throw new Error(data.message || 'Failed to authenticate with backend');
      }
    } catch (err) {
      console.error("Backend verification failed:", err);
      // We should probably sign the user out of Google if the backend fails
      await signOut();
      throw err;
    }
  };

  return { signIn, signOut, userInfo, isInitialized, isCheckingSignIn, isNativeAvailable, error };
};
