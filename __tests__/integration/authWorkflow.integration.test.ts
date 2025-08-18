/**
 * Authentication Workflow Integration Tests
 * Tests complete authentication flows end-to-end
 */
import { configureStore } from '@reduxjs/toolkit';
import authSlice from '../../src/store/slices/authSlice';
import { authApi } from '../../src/store/api/authApi';
import {
  bootstrapFromKeychain,
  performLogout,
} from '../../src/store/thunks/authThunks';
import * as KeychainHelper from '../../src/utils/secureStorage/KeychainHelper';

// Mock keychain helper
jest.mock('../../src/utils/secureStorage/KeychainHelper');
const mockKeychainHelper = KeychainHelper as jest.Mocked<typeof KeychainHelper>;

// Mock navigation
jest.mock('../../src/navigation/navigationRef', () => ({
  navigationRef: {
    current: {
      reset: jest.fn(),
    },
  },
}));

describe('Authentication Workflow Integration', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authSlice,
        [authApi.reducerPath]: authApi.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(authApi.middleware),
    });

    jest.clearAllMocks();
  });

  describe('Fresh App Start Workflow', () => {
    it('should handle first-time user with no stored token', async () => {
      mockKeychainHelper.getToken.mockResolvedValue(undefined);

      await store.dispatch(bootstrapFromKeychain());

      const state = store.getState().auth;
      expect(state.isLoggedIn).toBe(false);
      expect(state.token).toBeUndefined();
    });

    it('should handle returning user with valid token', async () => {
      const validToken = {
        token: 'valid-stored-token',
        expiresAt: Date.now() + 3600000,
      };

      mockKeychainHelper.getToken.mockResolvedValue(validToken);

      await store.dispatch(bootstrapFromKeychain());

      const state = store.getState().auth;
      expect(state.isLoggedIn).toBe(true);
      expect(state.token).toBe(validToken.token);
    });

    it('should handle expired stored token', async () => {
      const expiredToken = {
        token: 'expired-token',
        expiresAt: Date.now() - 3600000,
      };

      mockKeychainHelper.getToken.mockResolvedValue(undefined); // Keychain helper auto-deletes expired

      await store.dispatch(bootstrapFromKeychain());

      const state = store.getState().auth;
      expect(state.isLoggedIn).toBe(false);
    });
  });

  describe('Login to Logout Workflow', () => {
    it('should handle complete login-logout cycle', async () => {
      const mockTokenData = {
        token: 'test-login-token',
        expiresAt: Date.now() + 86400000, // 24 hours
      };

      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        phone: '1234567890',
      };

      // Mock successful token save
      mockKeychainHelper.saveToken.mockResolvedValue();
      mockKeychainHelper.deleteToken.mockResolvedValue();

      // Simulate login
      store.dispatch({
        type: 'auth/loginSuccess',
        payload: {
          token: mockTokenData.token,
          expiresAt: mockTokenData.expiresAt,
          user: mockUser,
        },
      });

      // Verify login state
      let state = store.getState().auth;
      expect(state.isLoggedIn).toBe(true);
      expect(state.user).toEqual(mockUser);

      // Simulate logout
      await store.dispatch(performLogout());

      // Verify logout state
      state = store.getState().auth;
      expect(state.isLoggedIn).toBe(false);
      expect(state.token).toBeUndefined();
      expect(state.user).toBeUndefined();
      expect(mockKeychainHelper.deleteToken).toHaveBeenCalled();
    });
  });

  describe('Error Handling Workflows', () => {
    it('should handle keychain errors during bootstrap', async () => {
      mockKeychainHelper.getToken.mockRejectedValue(
        new Error('Keychain unavailable')
      );

      await store.dispatch(bootstrapFromKeychain());

      const state = store.getState().auth;
      expect(state.isLoggedIn).toBe(false);
    });

    it('should handle keychain errors during logout', async () => {
      // Set logged in state
      store.dispatch({
        type: 'auth/loginSuccess',
        payload: {
          token: 'test-token',
          expiresAt: Date.now() + 3600000,
          user: { id: '1', name: 'Test', phone: '1234567890' },
        },
      });

      // Mock keychain failure
      mockKeychainHelper.deleteToken.mockRejectedValue(
        new Error('Keychain error')
      );

      // Should still clear Redux state even if keychain fails
      await store.dispatch(performLogout());

      const state = store.getState().auth;
      expect(state.isLoggedIn).toBe(false);
    });
  });

  describe('Token Expiry Workflows', () => {
    it('should handle token expiry during app usage', () => {
      // Set logged in state with expired token
      store.dispatch({
        type: 'auth/loginSuccess',
        payload: {
          token: 'soon-to-expire-token',
          expiresAt: Date.now() + 1000, // 1 second from now
          user: { id: '1', name: 'Test', phone: '1234567890' },
        },
      });

      // Simulate token expiry
      store.dispatch({ type: 'auth/tokenExpired' });

      const state = store.getState().auth;
      expect(state.isLoggedIn).toBe(false);
      expect(state.token).toBeUndefined();
    });
  });

  describe('State Persistence Workflow', () => {
    it('should maintain consistent state across actions', async () => {
      const mockUser = {
        id: 'consistent-user',
        name: 'Consistent User',
        phone: '9876543210',
      };

      // Login
      store.dispatch({
        type: 'auth/loginSuccess',
        payload: {
          token: 'consistent-token',
          expiresAt: Date.now() + 3600000,
          user: mockUser,
        },
      });

      let state = store.getState().auth;
      expect(state.user).toEqual(mockUser);

      // Multiple state reads should be consistent
      for (let i = 0; i < 5; i++) {
        state = store.getState().auth;
        expect(state.isLoggedIn).toBe(true);
        expect(state.user).toEqual(mockUser);
      }
    });
  });
});
