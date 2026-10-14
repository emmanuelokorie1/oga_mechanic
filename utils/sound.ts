import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { Asset } from 'expo-asset';
import * as Haptics from 'expo-haptics';

let isAudioConfigured = false;
let mechanicAssetUri: string | null = null;
let generalAssetUri: string | null = null;
let mechanicPlayer: AudioPlayer | null = null;
let generalPlayer: AudioPlayer | null = null;

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
 * Resolves local file URI from bundled asset using expo-asset.
 * Crucial for release APKs where raw require() numeric asset IDs cannot be opened directly by ExoPlayer.
 */
const resolveAssetUri = async (moduleSource: any, cacheRef: 'mechanic' | 'general'): Promise<string | null> => {
  if (cacheRef === 'mechanic' && mechanicAssetUri) return mechanicAssetUri;
  if (cacheRef === 'general' && generalAssetUri) return generalAssetUri;

  try {
    const asset = Asset.fromModule(moduleSource);
    if (!asset.localUri) {
      await asset.downloadAsync();
    }
    const resolvedUri = asset.localUri || asset.uri || null;
    if (resolvedUri) {
      if (cacheRef === 'mechanic') mechanicAssetUri = resolvedUri;
      if (cacheRef === 'general') generalAssetUri = resolvedUri;
    }
    return resolvedUri;
  } catch (err) {
    console.warn(`⚠️ [Audio] Could not pre-download ${cacheRef} sound asset:`, err);
    return null;
  }
};

// Eagerly pre-download assets in background so they are ready on first incoming dispatch
(async () => {
  try {
    await Promise.allSettled([
      resolveAssetUri(require('@/assets/sounds/mechanic-new-notification.mp3'), 'mechanic'),
      resolveAssetUri(require('@/assets/sounds/general-notification.mp3'), 'general'),
    ]);
  } catch (_) {}
})();

/**
 * Play a high-energy, attention-grabbing dispatch notification sound for new mechanic requests.
 * Uses the crisp ride-hailing style alert chime with energetic haptics.
 */
export const playMechanicNotificationSound = async () => {
  try {
    // 1. Trigger energetic haptics immediately
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}

    // 2. Configure audio session
    await setupAudioSession();

    // 3. Resolve local asset URI (ensures asset is extracted from APK)
    const localUri = await resolveAssetUri(require('@/assets/sounds/mechanic-new-notification.mp3'), 'mechanic');
    const source = localUri ? { uri: localUri } : require('@/assets/sounds/mechanic-new-notification.mp3');

    // 4. Reuse existing player or create a new instance
    try {
      if (!mechanicPlayer) {
        mechanicPlayer = createAudioPlayer(source);
      } else {
        try {
          await mechanicPlayer.seekTo(0);
        } catch (_) {
          mechanicPlayer = createAudioPlayer(source);
        }
      }

      if (mechanicPlayer) {
        mechanicPlayer.volume = 1.0;
        mechanicPlayer.play();
        console.log('🔔 [Dispatch Sound] Mechanic dispatch alert played successfully');
      }
    } catch (playerErr) {
      // Fallback: create fresh single-shot player
      const fallbackPlayer = createAudioPlayer(source);
      fallbackPlayer.volume = 1.0;
      fallbackPlayer.play();
      console.log('🔔 [Dispatch Sound] Fallback mechanic dispatch alert played');
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

    // 3. Resolve local asset URI
    const localUri = await resolveAssetUri(require('@/assets/sounds/general-notification.mp3'), 'general');
    const source = localUri ? { uri: localUri } : require('@/assets/sounds/general-notification.mp3');

    // 4. Play audio asset
    try {
      if (!generalPlayer) {
        generalPlayer = createAudioPlayer(source);
      } else {
        try {
          await generalPlayer.seekTo(0);
        } catch (_) {
          generalPlayer = createAudioPlayer(source);
        }
      }

      if (generalPlayer) {
        generalPlayer.volume = 0.9;
        generalPlayer.play();
        console.log('🔔 [Notification Sound] General notification sound played successfully');
      }
    } catch (playerErr) {
      const fallbackPlayer = createAudioPlayer(source);
      fallbackPlayer.volume = 0.9;
      fallbackPlayer.play();
      console.log('🔔 [Notification Sound] Fallback general notification sound played');
    }
  } catch (error) {
    console.warn('⚠️ Could not play general notification sound:', error);
  }
};


