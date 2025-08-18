/**
 * Authentication Flow Integration Tests
 * Tests the complete login and logout workflow
 */
import { configureStore } from '@reduxjs/toolkit';
import authSlice, {
  loginSuccess,
  logout,
} from '../../src/store/slices/authSlice';
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

describe('Authentication Flow Integration', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authSlice,
      },
    });
    jest.clearAllMocks();
  });

  describe('Complete Login Flow', () => {
    it('should handle complete login workflow', async () => {
      const mockTokenData = {
        token: 'test-jwt-token',
        expiresAt: Date.now() + 3600000,
      };

      const mockUser = {
        id: 'user-123',
        name: 'Test Channel Partner',
        phone: '1234567890',
      };

      // Mock successful token save
      mockKeychainHelper.saveToken.mockResolvedValue();

      // Dispatch login success (simulating OTP verification)
      store.dispatch(
        loginSuccess({
          token: mockTokenData.token,
          expiresAt: mockTokenData.expiresAt,
          user: mockUser,
        })
      );

      const state = store.getState().auth;
      expect(state.isLoggedIn).toBe(true);
      expect(state.token).toBe(mockTokenData.token);
      expect(state.user).toEqual(mockUser);
    });
  });

  describe('Complete Logout Flow', () => {
    it('should handle complete logout workflow', async () => {
      // Set initial logged in state
      store.dispatch(
        loginSuccess({
          token: 'test-token',
          expiresAt: Date.now() + 3600000,
          user: { id: '1', name: 'Test', phone: '1234567890' },
        })
      );

      // Mock keychain deletion
      mockKeychainHelper.deleteToken.mockResolvedValue();

      // Perform logout
      await store.dispatch(performLogout());

      const state = store.getState().auth;
      expect(state.isLoggedIn).toBe(false);
      expect(state.token).toBeUndefined();
      expect(state.user).toBeUndefined();
      expect(mockKeychainHelper.deleteToken).toHaveBeenCalled();
    });
  });

  describe('Bootstrap Flow', () => {
    it('should bootstrap from valid keychain token', async () => {
      const mockTokenData = {
        token: 'valid-bootstrap-token',
        expiresAt: Date.now() + 3600000,
      };

      mockKeychainHelper.getToken.mockResolvedValue(mockTokenData);

      await store.dispatch(bootstrapFromKeychain());

      const state = store.getState().auth;
      expect(state.isLoggedIn).toBe(true);
      expect(state.token).toBe(mockTokenData.token);
    });

    it('should handle missing keychain token', async () => {
      mockKeychainHelper.getToken.mockResolvedValue(undefined);

      await store.dispatch(bootstrapFromKeychain());

      const state = store.getState().auth;
      expect(state.isLoggedIn).toBe(false);
      expect(state.token).toBeUndefined();
    });
  });
});
