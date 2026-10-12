import * as ImagePicker from 'expo-image-picker';
import * as Device from 'expo-device';
import { Alert, Platform } from 'react-native';

export interface FormFileData {
  uri: string;
  type: string;
  name: string;
}

/**
 * Robustly converts an image URI into a file object suitable for React Native multipart FormData.
 * Safely handles content://, file://, data:, and remote URIs across Android and iOS without crashing native OkHttp.
 */
export function createFormDataFile(uri: string, customNamePrefix: string = 'image'): FormFileData {
  const cleanUri = uri.split('?')[0].split('#')[0];
  const lastSegment = cleanUri.split('/').pop() || '';

  let extension = 'jpg';
  if (lastSegment.includes('.')) {
    const candidate = lastSegment.split('.').pop()?.toLowerCase();
    if (candidate && candidate.length <= 5 && /^[a-z0-9]+$/.test(candidate)) {
      if (candidate === 'heic' || candidate === 'heif') {
        extension = 'jpg';
      } else {
        extension = candidate;
      }
    }
  }

  const normalizedExt = extension === 'jpeg' || extension === 'jpg' ? 'jpg' : extension;
  const mimeType = normalizedExt === 'png'
    ? 'image/png'
    : normalizedExt === 'webp'
    ? 'image/webp'
    : 'image/jpeg';
  const fileName = `${customNamePrefix}_${Date.now()}.${normalizedExt}`;

  return {
    uri,
    type: mimeType,
    name: fileName,
  };
}

export interface PickImageOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  base64?: boolean;
}

/**
 * Launches either Camera or Media Library with proper permission checks and error handling.
 */
export async function pickImageWithPermission(
  source: 'camera' | 'gallery',
  options: PickImageOptions = {}
): Promise<ImagePicker.ImagePickerResult | null> {
  const {
    allowsEditing = true,
    aspect = [4, 3],
    quality = 0.8,
    base64 = false,
  } = options;

  try {
    if (source === 'camera') {
      // iOS Simulator does not have camera hardware and crashes natively if launchCameraAsync is called
      if (Platform.OS === 'ios' && !Device.isDevice) {
        Alert.alert(
          'Simulator Notice',
          'Camera hardware is not available on the iOS Simulator. Opening photo gallery instead.'
        );
        return await pickImageWithPermission('gallery', options);
      }

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access in your device settings to take a photo.'
        );
        return null;
      }

      return await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing,
        aspect,
        quality,
        base64,
      });
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photo Library Permission Required',
          'Please allow photo library access in your device settings to select an image.'
        );
        return null;
      }

      return await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing,
        aspect,
        quality,
        base64,
        allowsMultipleSelection: false,
      });
    }
  } catch (error) {
    console.error('Error during image picker:', error);
    Alert.alert('Error', 'Failed to capture or select image. Please try again.');
    return null;
  }
}
