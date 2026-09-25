import { useState, useEffect } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

export const useGoogleSignIn = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isCheckingSignIn, setIsCheckingSignIn] = useState(true);

  useEffect(() => {
    // Initialize Google Sign-in
    GoogleSignin.configure({
      // TODO: Paste your Web Client ID here
      webClientId: 'TODO_WEB_CLIENT_ID.apps.googleusercontent.com',
      // TODO: Paste your iOS Client ID here
      iosClientId: 'TODO_IOS_CLIENT_ID.apps.googleusercontent.com',
      offlineAccess: true, // If you want to access Google API on behalf of the user FROM YOUR SERVER
      hostedDomain: '',
      forceCodeForRefreshToken: true,
    });
    
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
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens(); // Extract idToken
      
      setUserInfo(response);
      
      // Send token to backend for verification and login/registration
      await handleBackendVerification(tokens.idToken);
      
      return response;
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled sign in');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Sign in is in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.log('Play services not available or outdated');
      } else {
        console.log('Google sign in error', error);
      }
      setError(error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
      setUserInfo(null);
    } catch (error) {
      console.error('Google sign out error', error);
    }
  };
  
  // Placeholder for backend verification
  const handleBackendVerification = async (idToken: string) => {
    console.log('TODO: Send this idToken to your backend:', idToken);
    
    /* Example implementation:
    const response = await fetch('YOUR_BACKEND_URL/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    const data = await response.json();
    
    if (data.access_token) {
      // Use your existing useAuth functions or AsyncStorage directly
      // await AsyncStorage.setItem('auth_token', data.access_token);
      // await AsyncStorage.setItem('is_logged_in', 'true');
    }
    */
  };

  return { signIn, signOut, userInfo, isInitialized, isCheckingSignIn, error };
};
