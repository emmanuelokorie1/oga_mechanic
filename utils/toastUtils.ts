import Toast from 'react-native-toast-message';

/**
 * Enhanced Toast utility with rich mobile styling and optional subtitle support.
 */
export const showToast = {
  success: (title: string, message?: string) => {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3500,
      autoHide: true,
      topOffset: 56,
    });
  },

  error: (title: string, message?: string) => {
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4500,
      autoHide: true,
      topOffset: 56,
    });
  },

  info: (title: string, message?: string) => {
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3500,
      autoHide: true,
      topOffset: 56,
    });
  },

  warn: (title: string, message?: string) => {
    Toast.show({
      type: 'warn',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 56,
    });
  },

  hide: () => {
    Toast.hide();
  },
};

export default showToast;
