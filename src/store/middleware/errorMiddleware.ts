/**
 * Error Handling Middleware
 * Global error handling for RTK Query API calls
 */
import { isRejectedWithValue, type Middleware } from '@reduxjs/toolkit';
import Toast from 'react-native-toast-message';
import { logout } from '../slices/authSlice';
import { resetToRoute } from '../../navigation/navigationRef';
import {
  getFriendlyMessage,
  shouldAutoLogout,
  shouldShowToast,
} from '../../utils/errorMessage';
import type { RootState } from '../index';

/**
 * Error middleware to handle RTK Query errors globally
 * Provides auto-logout and user-friendly error messages
 */
export const errorMiddleware: Middleware =
  (storeAPI: any) => (next: any) => (action: any) => {
    // Continue with the action
    const result = next(action);

    // Check if this is a rejected RTK Query action with a value
    if (isRejectedWithValue(action)) {
      const { error } = action.payload;
      const status = error?.status;

      console.warn('RTK Query Error:', {
        endpoint: action.meta?.arg?.endpointName || 'unknown',
        status,
        error: error?.data || error?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      // Handle authentication errors (401/403) - Auto logout
      if (shouldAutoLogout(status)) {
        console.log('Auto-logout triggered due to auth error:', status);

        // Dispatch logout action
        storeAPI.dispatch(logout());

        // Reset navigation to auth stack
        setTimeout(() => {
          resetToRoute('Auth');
        }, 100); // Small delay to ensure state update completes

        // Show logout toast
        Toast.show({
          type: 'error',
          text1: 'Session Expired',
          text2: 'You have been logged out. Please sign in again.',
          visibilityTime: 4000,
          autoHide: true,
          position: 'top',
        });
      }
      // Handle other errors with toast notifications
      else if (shouldShowToast(status)) {
        const friendlyMessage = getFriendlyMessage(status);

        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: friendlyMessage,
          visibilityTime: 3000,
          autoHide: true,
          position: 'top',
        });
      }
    }

    return result;
  };

export default errorMiddleware;
