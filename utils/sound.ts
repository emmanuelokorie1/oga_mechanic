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
 * Play a high-energy, attention-grabbing dispatch notification sound for new mechanic requests.
 * Uses the crisp ride-hailing style alert chime with energetic haptics.
 */
export const playMechanicNotificationSound = async () => {
  try {
    // 1. Trigger energetic haptics
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}

    // 2. Configure audio session
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
      console.log('🔔 [Dispatch Sound] Mechanic dispatch alert played successfully');
    }
  } catch (error) {
    console.warn('⚠️ Could not play mechanic notification sound:', error);
  }
};

/**
 * Play a subtle, sleek soft glass pop sound for general in-app notifications (messages, system alerts).
 * Modeled after modern iOS glass taps with light haptics.
 */
export const playGeneralNotificationSound = async () => {
  try {
    // 1. Trigger subtle light haptic pop
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    // 2. Configure audio session
    await setupAudioSession();

    // 3. Play audio asset
    const player = createAudioPlayer(
      require('@/assets/sounds/general-notification.mp3')
    );

    if (player) {
      player.volume = 0.9;
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
      console.log('🔔 [Notification Sound] General notification sound played successfully');
    }
  } catch (error) {
    console.warn('⚠️ Could not play general notification sound:', error);
  }
};

