/**
 * Authentication Test Utilities
 * Helper functions and mocks for auth-related tests
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { configureStore } from '@reduxjs/toolkit';
import authSlice from '../../src/store/slices/authSlice';
import { authApi } from '../../src/store/api/authApi';

/**
 * Create test store with auth state
 */
export const createTestStore = (initialAuthState?: Partial<any>) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      [authApi.reducerPath]: authApi.reducer,
    },
    preloadedState: {
      auth: {
        isLoggedIn: false,
        token: undefined,
        expiresAt: undefined,
        user: undefined,
        ...initialAuthState,
      },
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(authApi.middleware),
  });
};

/**
 * Render component with all required providers
 */
export const renderWithAuthProviders = (
  component: React.ReactElement,
  { store = createTestStore() } = {}
) => {
  return render(
    <Provider store={store}>
      <PaperProvider>
        <NavigationContainer>{component}</NavigationContainer>
      </PaperProvider>
    </Provider>
  );
};

/**
 * Mock authenticated user data
 */
export const mockAuthUser = {
  id: 'test-user-123',
  name: 'Test Channel Partner',
  phone: '1234567890',
};

/**
 * Mock JWT token
 */
export const mockJwtToken = 'mock-jwt-token-' + Date.now();

/**
 * Mock token data with expiry
 */
export const mockTokenData = {
  token: mockJwtToken,
  expiresAt: Date.now() + 86400000, // 24 hours
};

/**
 * Mock logged in state
 */
export const mockLoggedInState = {
  isLoggedIn: true,
  token: mockTokenData.token,
  expiresAt: mockTokenData.expiresAt,
  user: mockAuthUser,
};

/**
 * Mock logged out state
 */
export const mockLoggedOutState = {
  isLoggedIn: false,
  token: undefined,
  expiresAt: undefined,
  user: undefined,
};

/**
 * Common test assertions for auth state
 */
export const expectLoggedInState = (
  state: any,
  expectedUser = mockAuthUser
) => {
  expect(state.isLoggedIn).toBe(true);
  expect(state.token).toBeDefined();
  expect(state.expiresAt).toBeDefined();
  expect(state.user).toEqual(expectedUser);
};

export const expectLoggedOutState = (state: any) => {
  expect(state.isLoggedIn).toBe(false);
  expect(state.token).toBeUndefined();
  expect(state.expiresAt).toBeUndefined();
  expect(state.user).toBeUndefined();
};
