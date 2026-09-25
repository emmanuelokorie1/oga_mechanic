import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = () => {
  try {
    if (typeof isRunningInExpoGo === 'function' && isRunningInExpoGo()) {
      return true;
    }
  } catch {
    // fallback
  }
  return (
    Constants?.appOwnership === 'expo' ||
    Constants?.executionEnvironment === ExecutionEnvironment.StoreClient
  );
};

/**
 * Safely initialize notification listeners.
 * Wraps in try-catch to prevent crashes when native modules are missing
 * (e.g. in development builds that haven't been rebuilt).
 *
 * @param onNewOrder      - Called when a 'new_order' push arrives.
 * @param onNewMessage    - Called when a 'chat_message' push arrives.
 * @param onNotification  - Called for all other notification types.
 * @param staleId         - The identifier of the last notification response
 *                          that was already active before the app launched.
 *                          Responses with this ID are ignored to prevent
 *                          cold-start replays from triggering unwanted navigation.
 */
export const setupNotificationListeners = (
  onNewOrder: () => void,
  onNewMessage: (data: any) => void,
  onNotification: (data: any) => void,
  staleId: string | null = null,
) => {
  if (isExpoGo() && Platform.OS === 'android') {
    return null;
  }
  try {
    const Notifications = require('expo-notifications');

    // Basic configuration
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: false,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      // Discard the stale response that Expo replays on every cold start.
      // Without this guard the app would navigate to Notifications every time
      // the user re-opens the app after having previously tapped a notification.
      const responseId = response.notification.request.identifier;
      if (staleId && responseId === staleId) {
        return;
      }

      const data = response.notification.request.content.data;
      if (data?.type === 'new_order') {
        onNewOrder();
      } else if (data?.type === 'chat_message') {
        onNewMessage(data);
      } else {
        onNotification(data);
      }
    });

    return subscription;
  } catch (error) {
    console.warn(
      'Notifications native module not available. Push notifications will not work until you rebuild the development client.',
      error,
    );
    return null;
  }
};
