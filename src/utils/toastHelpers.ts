/**
 * Toast Helper Utilities
 * Centralized toast message functions using ToastConfig
 */
import Toast from 'react-native-toast-message';

export interface ToastOptions {
  title: string;
  message?: string;
  duration?: number;
  position?: 'top' | 'bottom';
}

/**
 * Show success toast with consistent styling
 */
export function showSuccessToast({
  title,
  message,
  duration = 3000,
  position = 'bottom',
}: ToastOptions) {
  Toast.show({
    type: 'success',
    text1: title,
    text2: message,
    position,
    visibilityTime: duration,
  });
}

/**
 * Show error toast with consistent styling
 */
export function showErrorToast({
  title,
  message,
  duration = 5000,
  position = 'bottom',
}: ToastOptions) {
  Toast.show({
    type: 'error',
    text1: title,
    text2: message,
    position,
    visibilityTime: duration,
  });
}

/**
 * Show info toast with consistent styling
 */
export function showInfoToast({
  title,
  message,
  duration = 3000,
  position = 'bottom',
}: ToastOptions) {
  Toast.show({
    type: 'info',
    text1: title,
    text2: message,
    position,
    visibilityTime: duration,
  });
}

/**
 * Show offline error toast
 */
export function showOfflineToast() {
  showErrorToast({
    title: 'No Internet Connection',
    message: 'Please go online to proceed.',
    duration: 4000,
  });
}

/**
 * Show status update success toast
 */
export function showStatusUpdateSuccessToast(newStatus: string) {
  showSuccessToast({
    title: 'Status Updated',
    message: `Status changed to "${newStatus}"`,
  });
}

/**
 * Show status update error toast
 */
export function showStatusUpdateErrorToast(errorMessage: string) {
  showErrorToast({
    title: 'Update Failed',
    message: errorMessage,
  });
}
