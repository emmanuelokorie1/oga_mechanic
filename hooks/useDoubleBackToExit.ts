import React, { useRef } from 'react';
import { BackHandler, ToastAndroid, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';

/**
 * Hook to require double-tap on Android back button to exit the app.
 * Used on root dashboard / home screens to prevent accidental app closes.
 * 
 * @param exitMessage Custom message to display on first back press (default: "Press back again to exit")
 * @param delay Time window in ms for the second back press (default: 2000ms)
 */
export const useDoubleBackToExit = (
  exitMessage = 'Press back again to exit',
  delay = 2000
) => {
  const lastBackPressTime = useRef<number>(0);

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS !== 'android') return;

      const onBackPress = () => {
        const now = Date.now();
        if (now - lastBackPressTime.current < delay) {
          // Second press within window: allow app to close
          BackHandler.exitApp();
          return true;
        }

        // First press: warn the user and start the cooldown timer
        lastBackPressTime.current = now;
        ToastAndroid.show(exitMessage, ToastAndroid.SHORT);
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [exitMessage, delay])
  );
};

export default useDoubleBackToExit;
