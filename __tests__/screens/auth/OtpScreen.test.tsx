/**
 * OTP Screen Tests
 * Tests for OTP verification functionality
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { configureStore } from '@reduxjs/toolkit';
import { OtpScreen } from '../../../src/screens/auth/OtpScreen';
import authSlice from '../../../src/store/slices/authSlice';
import { baseApi } from '../../../src/store/api/baseApi';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: { phone: '1234567890' },
  }),
  useFocusEffect: jest.fn(),
}));

// Mock connectivity
jest.mock('../../../src/contexts/ConnectivityContext', () => ({
  useConnectivity: () => ({ isOnline: true }),
}));

describe('OtpScreen', () => {
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
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <Provider store={store}>
        <PaperProvider>
          <NavigationContainer>{component}</NavigationContainer>
        </PaperProvider>
      </Provider>
    );
  };

  it('renders OTP screen correctly', () => {
    const { getByText } = renderWithProviders(<OtpScreen />);

    expect(getByText('Verify OTP')).toBeTruthy();
    expect(getByText('Enter the 6-digit code sent to')).toBeTruthy();
    expect(getByText('+91 1234567890')).toBeTruthy();
  });

  it('shows timer countdown', async () => {
    const { getByText } = renderWithProviders(<OtpScreen />);

    expect(getByText(/OTP expires in/)).toBeTruthy();
  });

  it('handles back navigation', () => {
    const { getByText } = renderWithProviders(<OtpScreen />);

    const backButton = getByText('← Back to Phone');
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalled();
  });
});
