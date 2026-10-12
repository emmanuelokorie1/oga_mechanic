import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';

let isAudioConfigured = false;

const setupAudioSession = async () => {
  if (isAudioConfigured) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      shouldPlayInBackground: false,
    });
    isAudioConfigured = true;
  } catch (err) {
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
      isAudioConfigured = true;
    } catch (_) {}
  }
};

/**
 * Play a notification sound for mechanics & users
 * Optimized for loudness, vibrancy, and resilient playback across iOS and Android
 */
export const playMechanicNotificationSound = async () => {
  try {
    // 1. Trigger haptics safely
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}

    // 2. Configure audio mode safely without throwing on iOS
    await setupAudioSession();

    // 3. Play audio asset
    const player = createAudioPlayer(
      require('@/assets/sounds/mechanic-new-notification.mp3')
    );

    if (player) {
      player.volume = 1.0;
      player.play();

      const playerAny = player as any;
      if (typeof playerAny.addListener === 'function') {
        const subscription = playerAny.addListener('playbackStatusUpdate', (status: any) => {
          if (status?.didJustFinish) {
            subscription?.remove?.();
            try {
              playerAny.release?.();
            } catch (_) {}
          }
        });
      }
      console.log('🔔 [Notification Sound] Notification audio played successfully');
    }
  } catch (error) {
    console.warn('⚠️ Could not play notification sound:', error);
  }
};

