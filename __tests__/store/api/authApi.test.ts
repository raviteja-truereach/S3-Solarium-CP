/**
 * Auth API Tests
 * Tests for OTP authentication endpoints
 */
import { configureStore } from '@reduxjs/toolkit';
import { authApi } from '../../../src/store/api/authApi';
import { baseApi } from '../../../src/store/api/baseApi';
import authSlice from '../../../src/store/slices/authSlice';
import * as KeychainHelper from '../../../src/utils/secureStorage/KeychainHelper';

// Mock keychain helper
jest.mock('../../../src/utils/secureStorage/KeychainHelper');
const mockKeychainHelper = KeychainHelper as jest.Mocked<typeof KeychainHelper>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('authApi', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authSlice,
        [baseApi.reducerPath]: baseApi.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(baseApi.middleware),
    });

    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('requestOtp', () => {
    it('should send OTP request successfully', async () => {
      const mockResponse = {
        success: true,
        data: { otpSent: true },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await store.dispatch(
        authApi.endpoints.requestOtp.initiate({ phone: '1234567890' })
      );

      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ phone: '1234567890' }),
        })
      );
    });

    it('should handle request OTP errors', async () => {
      const mockError = {
        success: false,
        error: { code: 400, message: 'Invalid phone number' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockError,
      } as Response);

      const result = await store.dispatch(
        authApi.endpoints.requestOtp.initiate({ phone: 'invalid' })
      );

      expect(result.error).toBeDefined();
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP and save token successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          token: 'jwt-token-123',
          role: 'CP',
          userId: 'user-123',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      mockKeychainHelper.saveToken.mockResolvedValue();

      const result = await store.dispatch(
        authApi.endpoints.verifyOtp.initiate({
          phone: '1234567890',
          otp: '123456',
        })
      );

      expect(result.data).toEqual(mockResponse);
      expect(mockKeychainHelper.saveToken).toHaveBeenCalledWith(
        'jwt-token-123',
        expect.any(Number)
      );
    });

    it('should handle invalid OTP errors', async () => {
      const mockError = {
        success: false,
        error: { code: 401, message: 'Invalid OTP' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => mockError,
      } as Response);

      const result = await store.dispatch(
        authApi.endpoints.verifyOtp.initiate({
          phone: '1234567890',
          otp: '000000',
        })
      );

      expect(result.error).toBeDefined();
    });
  });
});
