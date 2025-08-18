/**
 * Authentication API
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from './baseQuery';
import { saveToken } from '../../utils/secureStorage/KeychainHelper';
import { loginSuccess } from '../slices/authSlice';

// ... interface definitions remain the same ...

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: customBaseQuery,
  tagTypes: ['Auth'],
  endpoints: (builder) => ({
    /**
     * Request OTP (keeping existing endpoint - might not work with real API)
     */
    requestOtp: builder.mutation<RequestOtpResponse, RequestOtpRequest>({
      query: (credentials) => ({
        url: '/auth/login', // Remove /api/v1 since it's in baseUrl
        method: 'POST',
        body: { phone: credentials.phone },
      }),
    }),

    /**
     * Login with phone and OTP (real API endpoint)
     */
    verifyOtp: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/api/v1/auth/login', // Full path for real API
        method: 'POST',
        body: {
          phone: credentials.phone,
          otp: credentials.otp,
        },
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

          await saveToken(data.accessToken, expiresAt);

          dispatch(
            loginSuccess({
              token: data.accessToken,
              expiresAt,
              user: {
                id: data.user.id,
                name: data.user.name,
                phone: data.user.phone,
                email: data.user.email,
                role: data.user.role,
              },
            })
          );

          console.log('✅ Login successful for user:', data.user.name);
        } catch (error) {
          console.error('❌ OTP verification failed:', error);
        }
      },
    }),
  }),
});

export const { useRequestOtpMutation, useVerifyOtpMutation } = authApi;
