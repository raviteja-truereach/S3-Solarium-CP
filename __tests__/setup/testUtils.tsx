/**
 * Test Utilities
 * Reusable testing helpers and providers
 */
import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import authSlice from '@store/slices/authSlice';
import preferencesSlice from '@store/slices/preferencesSlice';
import { baseApi } from '@store/api/baseApi';
import { lightTheme } from '@theme/index';

/**
 * Create test store with initial state
 */
export const createTestStore = (initialState?: any) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      preferences: preferencesSlice,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    preloadedState: initialState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(baseApi.middleware),
  });
};

/**
 * Test wrapper with all providers
 */
interface TestWrapperProps {
  children: React.ReactNode;
  initialState?: any;
  theme?: any;
}

const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  initialState,
  theme = lightTheme,
}) => {
  const store = createTestStore(initialState);

  return (
    <Provider store={store}>
      <PaperProvider theme={theme}>
        <NavigationContainer>{children}</NavigationContainer>
      </PaperProvider>
    </Provider>
  );
};

/**
 * Custom render function with providers
 */
const customRender = (
  ui: React.ReactElement,
  options?: RenderOptions & {
    initialState?: any;
    theme?: any;
  }
) => {
  const { initialState, theme, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <TestWrapper initialState={initialState} theme={theme}>
        {children}
      </TestWrapper>
    ),
    ...renderOptions,
  });
};

// Re-export everything
export * from '@testing-library/react-native';
export { customRender as render };

/**
 * Common test data
 */
export const mockUser = {
  id: '1',
  name: 'Test User',
  phone: '1234567890',
};

export const mockAuthState = {
  isLoggedIn: true,
  token: 'test-token',
  user: mockUser,
};

export const mockPreferencesState = {
  colorScheme: 'light' as const,
};
