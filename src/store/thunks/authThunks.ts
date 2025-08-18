/**
 * Authentication Thunks
 * Async actions for authentication flow
 */
import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  getToken,
  deleteToken,
} from '../../utils/secureStorage/KeychainHelper';
import { resetDbKey } from '../../utils/secureStorage/SQLiteKeyHelper';
import { bootstrapSuccess, tokenExpired, logout } from '../slices/authSlice';
import { navigationRef } from '@navigation/navigationRef';
import type { RootState } from '../index';
import { syncService } from '../../services/SyncService';

/**
 * Bootstrap authentication from keychain on app startup
 * Checks for valid stored token and authenticates user automatically
 */
export const bootstrapFromKeychain = createAsyncThunk<
  void,
  void,
  { state: RootState }
>('auth/bootstrapFromKeychain', async (_, { dispatch }) => {
  try {
    const tokenData = await getToken();

    if (tokenData) {
      // Token exists and is valid (not expired)
      // Create user object from stored data or use placeholder
      const user = {
        id: 'bootstrapped-user', // Will be updated when we have real user data
        name: 'Channel Partner',
        phone: 'Unknown', // Will be updated from backend
      };

      dispatch(
        bootstrapSuccess({
          token: tokenData.token,
          expiresAt: tokenData.expiresAt,
          user,
        })
      );
    } else {
      // No valid token found
      dispatch(tokenExpired());
    }
  } catch (error) {
    console.warn('Bootstrap from keychain failed:', error);
    dispatch(tokenExpired());
  }
});

export const initializeSyncAfterLogin = createAsyncThunk(
  'auth/initializeSyncAfterLogin',
  async (_, { getState }) => {
    try {
      console.log('🔄 Initializing sync after successful login...');
      await syncService.initializeSync();
      console.log('✅ Sync initialized after login');
    } catch (error) {
      console.error('❌ Failed to initialize sync after login:', error);
      // Don't throw - sync failure shouldn't prevent login
    }
  }
);

/**
 * Perform complete logout
 * Clears keychain and redux state
 */
/**
 * Perform complete logout
 * Clears keychain, redux state, and navigates to login
 */
export const performLogout = createAsyncThunk<void, void>(
  'auth/performLogout',
  async (_, { dispatch }) => {
    try {
      console.log('Performing logout...');

      // Clear token from keychain
      await deleteToken();
      console.log('Token cleared from keychain');

      // Clear SQLite database encryption key
      await resetDbKey();
      console.log('Database encryption key cleared');
    } catch (error) {
      console.warn('Failed to clear credentials during logout:', error);
    } finally {
      // Always clear redux state
      dispatch(logout());
      console.log('Redux state cleared');

      // Reset navigation to Auth stack
      if (navigationRef.current) {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
        console.log('Navigation reset to Auth stack');
      }
    }
  }
);


export const cleanupSyncOnLogout = createAsyncThunk(
  'auth/cleanupSyncOnLogout',
  async () => {
    try {
      console.log('🧹 Cleaning up sync on logout...');
      syncService.cleanup();
      console.log('✅ Sync cleanup completed');
    } catch (error) {
      console.error('❌ Failed to cleanup sync on logout:', error);
    }
  }
);
