/**
 * Disabled Tab Toast Utility
 * Single-responsibility component for showing toast when disabled tabs are pressed
 */
import { ToastAndroid, Platform, Alert } from 'react-native';

interface DisabledTabToastConfig {
  message?: string;
  duration?: number;
}

/**
 * Shows an unobtrusive toast message for disabled tab interactions
 */
export const showDisabledTabToast = ({
  message = 'Coming soon',
  duration = 2000,
}: DisabledTabToastConfig = {}) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // For iOS, use a brief alert as toast alternative
    Alert.alert('', message, [{ text: 'OK' }], {
      cancelable: true,
    });
  }

  console.log('🚫 Disabled tab interaction:', message);
};

/**
 * Hook for disabled tab toast functionality
 */
export const useDisabledTabToast = () => {
  return {
    showToast: showDisabledTabToast,
  };
};

export default showDisabledTabToast;
