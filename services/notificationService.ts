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

// Helpers to safely get native modules
const getNotifications = () => {
  // Remote notifications were removed from Expo Go on Android in SDK 53+.
  // Requiring expo-notifications in Expo Go on Android throws a fatal error immediately.
  if (isExpoGo() && Platform.OS === 'android') {
    return null;
  }
  try {
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
};

const getDevice = () => {
  try {
    return require('expo-device');
  } catch (e) {
    return null;
  }
};

/**
 * Requests notification permissions and returns the Expo push token.
 * Must be called on a real device (not simulator) for push tokens.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const Notifications = getNotifications();
  const Device = getDevice();
  
  if (!Notifications || !Device) {
    console.warn('Notifications or Device module not available.');
    return null;
  }

  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices.');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Permission not granted for push notifications.');
      return null;
    }

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('mechanic-orders', {
        name: 'New Repair Orders',
        importance: Notifications.AndroidImportance?.MAX ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('chat-messages', {
        name: 'Chat Messages',
        importance: Notifications.AndroidImportance?.MAX ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
        sound: 'default',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (e) {
    console.warn('Could not get push token:', e);
    return null;
  }
}

/**
 * Schedule a local notification immediately (used for new order alerts).
 */
export async function scheduleNewOrderNotification(params: {
  customerName?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  serviceType?: string;
}) {
  const Notifications = getNotifications();
  if (!Notifications) return;

  const { customerName, vehicleMake, vehicleModel, serviceType } = params;

  const title = '🔧 New Repair Order!';
  const bodyParts = [];

  if (customerName) bodyParts.push(`From: ${customerName}`);
  if (vehicleMake || vehicleModel) bodyParts.push(`Vehicle: ${[vehicleMake, vehicleModel].filter(Boolean).join(' ')}`);
  if (serviceType) bodyParts.push(`Service: ${serviceType}`);

  const body = bodyParts.length > 0
    ? bodyParts.join(' • ')
    : 'A customer has sent a new repair request. Tap to review.';

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: { type: 'new_order' },
      },
      trigger: null, // Fire immediately
    });
  } catch (e) {
    console.warn('Failed to schedule notification:', e);
  }
}

/**
 * Schedule a success/celebration local notification.
 */
export async function scheduleSuccessNotification(title: string, body: string, data: any = {}) {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🎉 ${title}`,
        body,
        sound: 'default',
        data: { ...data, notification_type: 'success' },
        priority: Notifications.AndroidNotificationPriority?.MAX,
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('Failed to schedule success notification:', e);
  }
}

/**
 * Schedule a generic local notification with server-provided title and body.
 */
export async function scheduleGenericNotification(title: string, body: string, data: any = {}) {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data,
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('Failed to schedule generic notification:', e);
  }
}

/**
 * Schedule a local notification for a new chat message.
 */
export async function scheduleChatMessageNotification(params: {
  senderName?: string;
  message?: string;
  roomId?: string;
  type?: 'p2p' | 'support';
}) {
  const Notifications = getNotifications();
  if (!Notifications) return;

  const { senderName, message, roomId, type = 'p2p' } = params;

  const title = `💬 New message from ${senderName || 'Support'}`;
  const body = message || 'Tap to view message';

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: { 
          type: 'chat_message', 
          roomId, 
          chatType: type 
        },
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('Failed to schedule chat notification:', e);
  }
}

/**
 * Cancels all scheduled notifications.
 */
export async function cancelAllNotifications() {
  const Notifications = getNotifications();
  if (!Notifications) return;
  
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('Failed to cancel notifications:', e);
  }
}
