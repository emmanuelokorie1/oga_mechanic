import React, { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
// You can use the official button or a custom one
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';
import CustomButton from './CustomButton'; // Optional: Use existing CustomButton

export const SignInWithGoogleButton = () => {
  const { signIn, isCheckingSignIn } = useGoogleSignIn();
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    try {
      setIsLoading(true);
      await signIn();
      // On success, the hook/backend handler will update the app's auth state
    } catch (error) {
      // Error handling is already done in the hook, but you can add UI alerts here
    } finally {
      setIsLoading(false);
    }
  };

  // Prevent sign in while checking silent sign in on app launch
  const disabled = isLoading || isCheckingSignIn;

  // Option 1: Official Google Sign-in Button (Recommended for branding compliance)
  return (
    <View className="w-full items-center my-2">
      <GoogleSigninButton
        size={GoogleSigninButton.Size.Wide}
        color={GoogleSigninButton.Color.Dark}
        onPress={handlePress}
        disabled={disabled}
        style={{ width: '100%', height: 60 }} // Adjust size as needed
      />
    </View>
  );

  /* Option 2: Custom styling with Tailwind/Nativewind 
  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      className={`w-full rounded-full py-4 px-2 flex flex-row justify-center items-center bg-white border border-gray-300 ${disabled ? 'opacity-70' : ''}`}
    >
      <View className="flex-row items-center justify-center gap-3">
        <Text className="text-lg font-semibold text-gray-800">
          Continue with Google
        </Text>
        {isLoading && <ActivityIndicator color="#000" size="small" />}
      </View>
    </TouchableOpacity>
  );
  */
};
