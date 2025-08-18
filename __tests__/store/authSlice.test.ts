/**
 * Comprehensive Auth Slice Tests
 * Tests all authentication state management
 */
import authSlice, {
  loginSuccess,
  logout,
  clearAuth,
  bootstrapSuccess,
  tokenExpired,
} from '../../src/store/slices/authSlice';

describe('authSlice', () => {
  const initialState = {
    isLoggedIn: false,
    token: undefined,
    expiresAt: undefined,
    user: undefined,
  };

  const mockUser = {
    id: 'user-123',
    name: 'Test Channel Partner',
    phone: '1234567890',
  };

  const mockTokenData = {
    token: 'test-jwt-token',
    expiresAt: 1640995200000,
    user: mockUser,
  };

  describe('initial state', () => {
    it('should return the initial state', () => {
      expect(authSlice(undefined, { type: 'unknown' })).toEqual(initialState);
    });
  });

  describe('loginSuccess', () => {
    it('should handle successful login', () => {
      const action = loginSuccess(mockTokenData);
      const result = authSlice(initialState, action);

      expect(result).toEqual({
        isLoggedIn: true,
        token: mockTokenData.token,
        expiresAt: mockTokenData.expiresAt,
        user: mockTokenData.user,
      });
    });

    it('should update already logged in state', () => {
      const currentState = {
        isLoggedIn: true,
        token: 'old-token',
        expiresAt: 1640000000000,
        user: { id: 'old-id', name: 'Old User', phone: '0000000000' },
      };

      const action = loginSuccess(mockTokenData);
      const result = authSlice(currentState, action);

      expect(result).toEqual({
        isLoggedIn: true,
        token: mockTokenData.token,
        expiresAt: mockTokenData.expiresAt,
        user: mockTokenData.user,
      });
    });
  });

  describe('bootstrapSuccess', () => {
    it('should set authentication state from keychain data', () => {
      const action = bootstrapSuccess(mockTokenData);
      const result = authSlice(initialState, action);

      expect(result).toEqual({
        isLoggedIn: true,
        token: mockTokenData.token,
        expiresAt: mockTokenData.expiresAt,
        user: mockTokenData.user,
      });
    });
  });

  describe('logout', () => {
    it('should clear authentication state', () => {
      const loggedInState = {
        isLoggedIn: true,
        token: 'test-token',
        expiresAt: 1640995200000,
        user: mockUser,
      };

      const action = logout();
      const result = authSlice(loggedInState, action);

      expect(result).toEqual(initialState);
    });

    it('should handle logout when already logged out', () => {
      const action = logout();
      const result = authSlice(initialState, action);

      expect(result).toEqual(initialState);
    });
  });

  describe('tokenExpired', () => {
    it('should clear authentication state when token expires', () => {
      const loggedInState = {
        isLoggedIn: true,
        token: 'expired-token',
        expiresAt: 1640995200000,
        user: mockUser,
      };

      const action = tokenExpired();
      const result = authSlice(loggedInState, action);

      expect(result).toEqual(initialState);
    });
  });

  describe('clearAuth', () => {
    it('should reset to initial state', () => {
      const loggedInState = {
        isLoggedIn: true,
        token: 'test-token',
        expiresAt: 1640995200000,
        user: mockUser,
      };

      const action = clearAuth();
      const result = authSlice(loggedInState, action);

      expect(result).toEqual(initialState);
    });
  });

  describe('edge cases', () => {
    it('should handle partial user data', () => {
      const partialTokenData = {
        token: 'test-token',
        expiresAt: 1640995200000,
        user: {
          id: 'user-123',
          name: '',
          phone: '',
        },
      };

      const action = loginSuccess(partialTokenData);
      const result = authSlice(initialState, action);

      expect(result.user).toEqual(partialTokenData.user);
      expect(result.isLoggedIn).toBe(true);
    });

    it('should handle undefined user in login success', () => {
      const tokenDataWithoutUser = {
        token: 'test-token',
        expiresAt: 1640995200000,
        user: undefined as any,
      };

      const action = loginSuccess(tokenDataWithoutUser);
      const result = authSlice(initialState, action);

      expect(result.user).toBeUndefined();
      expect(result.isLoggedIn).toBe(true);
    });
  });
});
