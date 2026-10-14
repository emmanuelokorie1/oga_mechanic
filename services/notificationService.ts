import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from '@/utils/secureStorage';

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

    // Set up Android notification channels
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General Notifications',
        importance: Notifications.AndroidImportance?.MAX ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D30309',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('mechanic-orders', {
        name: 'New Repair Orders',
        importance: Notifications.AndroidImportance?.MAX ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D30309',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('chat-messages', {
        name: 'Chat Messages',
        importance: Notifications.AndroidImportance?.MAX ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('order-updates', {
        name: 'Order Updates',
        importance: Notifications.AndroidImportance?.MAX ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00984C',
        sound: 'default',
      });
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      '875b371f-c923-4d57-b61e-2471327a1be4';

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData.data;
  } catch (e) {
    console.warn('Could not get push token:', e);
    return null;
  }
}

/**
 * Requests push notification permissions, obtains the push token,
 * and registers it with the backend at /users/notifications/devices/.
 * Automatically works across all user roles (Clients, Mechanics, Sellers).
 *
 * @param force If true, bypasses the local token cache check and forces backend registration.
 */
export async function registerPushNotificationsAndSyncDevice(force: boolean = false): Promise<string | null> {
  try {
    const token = await registerForPushNotificationsAsync();
    if (!token) return null;

    // Check if user is currently authenticated
    const isLoggedIn = (await AsyncStorage.getItem('is_logged_in')) === 'true';
    let authToken =
      (await secureStorage.getSecureItem('auth_token')) ||
      (await AsyncStorage.getItem('auth_token'));

    if (!authToken) {
      try {
        const { useUserStore } = await import('@/stores/userStore');
        authToken = useUserStore.getState().accessToken;
      } catch (_) {}
    }

    if (!isLoggedIn && !authToken) {
      console.log('ℹ️ Push token acquired, awaiting login for backend registration.');
      return token;
    }

    // Determine current user ID to avoid duplicate registrations per account
    const storedUserData = await AsyncStorage.getItem('user_data');
    let userId = 'current';
    if (storedUserData) {
      try {
        const parsed = JSON.parse(storedUserData);
        userId = parsed.id || parsed.pk || parsed.user_id || parsed.email || 'current';
      } catch (_) {}
    }
    const cacheKey = `last_registered_push_token_${userId}`;
    const lastRegistered = await AsyncStorage.getItem(cacheKey);

    if (!force && lastRegistered === token) {
      return token;
    }

    const { userAPI } = await import('@/lib/api/user');
    await userAPI.registerPushDevice(token);
    await AsyncStorage.setItem(cacheKey, token);
    console.log(`✅ Push token successfully registered with backend for user: ${userId}`);
    return token;
  } catch (error: any) {
    console.warn('⚠️ Push device registration warning:', error?.response?.data || error?.message || error);
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

  const title = 'New Repair Request';
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
        subtitle: 'Oga Mechanic',
        body,
        sound: 'default',
        channelId: 'mechanic-orders',
        priority: Notifications.AndroidNotificationPriority?.MAX,
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
        title,
        subtitle: 'Oga Mechanic',
        body,
        sound: 'default',
        channelId: 'order-updates',
        data: { ...data, notification_type: 'success' },
        priority: Notifications.AndroidNotificationPriority?.MAX,
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('Failed to schedule success notification:', e);
  }
}

export function formatBrandedNotificationCopy(
  title: string, 
  body: string, 
  isMechanicRole?: boolean
): { title: string; body: string } {
  const t = (title || '').toLowerCase();
  const b = (body || '').toLowerCase();

  // 1. Job Verified (Customer confirmed repair completion - Highest priority)
  if (
    t.includes('verify_completed') ||
    t.includes('verify completed') ||
    b.includes('verify_completed') ||
    b.includes('verify completed') ||
    t.includes('job verified') ||
    b.includes('job verified') ||
    t.includes('completion verified') ||
    b.includes('completion verified')
  ) {
    if (isMechanicRole) {
      return {
        title: 'Job Verified by Customer! 🎉',
        body: 'The customer has confirmed and verified your repair. Your payment is being processed!',
      };
    }
    return {
      title: 'Job Verified ✅',
      body: 'You have confirmed the service completion. Tap to leave a review for your mechanic.',
    };
  }

  // 2. Repair Marked Completed (Mechanic finished, awaiting customer verification)
  if (t.includes('completed') || b.includes('completed')) {
    if (isMechanicRole) {
      return {
        title: 'Repair Marked Complete 🏁',
        body: 'You marked the repair as completed. Waiting for customer to verify.',
      };
    }
    return {
      title: 'Repair Completed 🎉',
      body: 'The mechanic has finished the repair! Please inspect your vehicle and verify completion.',
    };
  }

  if (t.includes('in_transit') || t.includes('transit') || b.includes('in_transit') || b.includes('transit')) {
    return {
      title: isMechanicRole ? 'On The Way 🚗' : 'Mechanic On The Way 🚗',
      body: isMechanicRole 
        ? 'You are on your way to the customer location.' 
        : 'Your specialist is heading to your location. E.T.A ~10-15 mins.',
    };
  }
  if (t.includes('arrived') || b.includes('arrived')) {
    return {
      title: isMechanicRole ? 'Arrived at Location 📍' : 'Mechanic Arrived 📍',
      body: isMechanicRole 
        ? 'Ask customer for their 6-digit arrival code to begin work.' 
        : 'The mechanic has arrived at your location! Check your arrival code.',
    };
  }
  if ((t.includes('accepted') && !t.includes('bid')) || (b.includes('accepted') && !b.includes('bid'))) {
    return {
      title: isMechanicRole ? 'Request Accepted ✅' : 'Mechanic Confirmed ✅',
      body: isMechanicRole 
        ? 'You accepted this repair request. Dispatch to customer when ready.' 
        : 'A mechanic has accepted your repair order and is preparing to dispatch!',
    };
  }
  if (t.includes('in_progress') || t.includes('progress') || b.includes('in_progress') || b.includes('progress')) {
    return {
      title: 'Repair In Progress 🔧',
      body: isMechanicRole 
        ? 'Repair is in progress. Complete work and mark finished when done.' 
        : 'The mechanic has started working on your vehicle.',
    };
  }
  if (t.includes('cancelled') || b.includes('cancelled')) {
    return {
      title: 'Order Cancelled',
      body: 'The repair request has been cancelled.',
    };
  }
  if (t.includes('declined') || b.includes('declined')) {
    return {
      title: 'Request Declined',
      body: 'The repair request was declined.',
    };
  }

  // Fallback cleanup
  const cleanTitle = (title || 'Oga Mechanic Update')
    .replace(/verify_completed/gi, 'Job Verified')
    .replace(/in_transit/gi, 'On The Way')
    .replace(/in_progress/gi, 'In Progress')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
  const cleanBody = (body || 'You have a new update.')
    .replace(/verify_completed/gi, 'verified by customer')
    .replace(/in_transit/gi, 'on the way')
    .replace(/in_progress/gi, 'in progress')
    .replace(/_/g, ' ');

  return { title: cleanTitle, body: cleanBody };
}

export function sanitizeNotificationText(text: string): string {
  if (!text) return '';
  return text
    .replace(/in_transit/gi, 'on the way')
    .replace(/in_progress/gi, 'in progress')
    .replace(/verify_completed/gi, 'completed')
    .replace(/repair_update/gi, 'repair update')
    .replace(/repair_status/gi, 'repair status')
    .replace(/new_order/gi, 'new order')
    .replace(/_/g, ' ')
    .trim();
}

/**
 * Schedule a generic local notification with server-provided title and body.
 */
export async function scheduleGenericNotification(title: string, body: string, data: any = {}) {
  const Notifications = getNotifications();
  if (!Notifications) return;

  const branded = formatBrandedNotificationCopy(title, body);

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: branded.title,
        subtitle: 'Oga Mechanic',
        body: branded.body,
        sound: 'default',
        channelId: data?.channelId || 'order-updates',
        priority: Notifications.AndroidNotificationPriority?.HIGH,
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

  const title = senderName ? `${senderName}` : 'Oga Mechanic Support';
  const rawBody = message || 'Tap to view message';
  const body = typeof rawBody === 'string' ? rawBody : (rawBody && typeof rawBody === 'object' ? String((rawBody as any).content || (rawBody as any).text || 'New message') : String(rawBody));

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        subtitle: 'Oga Mechanic',
        body,
        sound: 'default',
        channelId: 'chat-messages',
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
