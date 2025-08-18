/**
 * Auth Thunks Tests
 * Tests for authentication async actions
 */
import { configureStore } from '@reduxjs/toolkit';
import authSlice from '../../../src/store/slices/authSlice';
import {
  bootstrapFromKeychain,
  performLogout,
} from '../../../src/store/thunks/authThunks';
import * as KeychainHelper from '../../../src/utils/secureStorage/KeychainHelper';

// Mock keychain helper
jest.mock('../../../src/utils/secureStorage/KeychainHelper');
const mockKeychainHelper = KeychainHelper as jest.Mocked<typeof KeychainHelper>;

describe('authThunks', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authSlice,
      },
    });
    jest.clearAllMocks();
  });

  describe('bootstrapFromKeychain', () => {
    it('should dispatch bootstrapSuccess when valid token exists', async () => {
      const mockToken = {
        token: 'valid-jwt-token',
        expiresAt: Date.now() + 3600000,
      };

      mockKeychainHelper.getToken.mockResolvedValue(mockToken);

      await store.dispatch(bootstrapFromKeychain());

      const state = store.getState().auth;
      expect(state.isLoggedIn).toBe(true);
      expect(state.token).toBe(mockToken.token);
      expect(state.expiresAt).toBe(mockToken.expiresAt);
    });

    it('should dispatch tokenExpired when no valid token exists', async () => {
      mockKeychainHelper.getToken.mockResolvedValue(undefined);

      await store.dispatch(bootstrapFromKeychain());

      const state = store.getState().auth;
      expect(state.isLoggedIn).toBe(false);
      expect(state.token).toBeUndefined();
    });

    it('should handle keychain errors gracefully', async () => {
      mockKeychainHelper.getToken.mockRejectedValue(
        new Error('Keychain error')
      );

      await store.dispatch(bootstrapFromKeychain());

      const state = store.getState().auth;
      expect(state.isLoggedIn).toBe(false);
    });
  });

  describe('performLogout', () => {
    it('should clear keychain and redux state', async () => {
      // Set initial logged in state
      store.dispatch({
        type: 'auth/loginSuccess',
        payload: {
          token: 'test-token',
          expiresAt: Date.now() + 3600000,
          user: { id: '1', name: 'Test', phone: '1234567890' },
        },
      });

      mockKeychainHelper.deleteToken.mockResolvedValue();

      await store.dispatch(performLogout());

      const state = store.getState().auth;
      expect(state.isLoggedIn).toBe(false);
      expect(state.token).toBeUndefined();
      expect(mockKeychainHelper.deleteToken).toHaveBeenCalled();
    });

    it('should clear redux state even if keychain deletion fails', async () => {
      mockKeychainHelper.deleteToken.mockRejectedValue(
        new Error('Keychain error')
      );

      await store.dispatch(performLogout());

      const state = store.getState().auth;
      expect(state.isLoggedIn).toBe(false);
    });
  });
});
