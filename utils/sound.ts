import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';

/**
 * Play a notification sound for mechanics
 * Optimized for loudness and vibrancy
 */
export const playMechanicNotificationSound = async () => {
  try {
    // Trigger heavy haptics for "vibrancy"
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Set audio mode to ensure it plays loudly even in silent mode
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    });

    const player = createAudioPlayer(
      require('@/assets/sounds/mechanic-new-notification.mp3')
    );
    player.volume = 1.0; // Max software volume
    player.play();

    // Auto release player when playback finishes
    const subscription = player.addListener('playbackStatusUpdate', status => {
      if (status.didJustFinish) {
        subscription.remove();
        player.release();
      }
    });
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
};

