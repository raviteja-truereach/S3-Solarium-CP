/**
 * Login Screen Component Tests
 * Tests UI behavior and user interactions
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { configureStore } from '@reduxjs/toolkit';
import { LoginScreen } from '../../../src/screens/auth/LoginScreen';
import authSlice from '../../../src/store/slices/authSlice';
import { authApi } from '../../../src/store/api/authApi';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock connectivity
jest.mock('../../../src/contexts/ConnectivityContext', () => ({
  useConnectivity: () => ({ isOnline: true }),
}));

describe('LoginScreen', () => {
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

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <Provider store={store}>
        <PaperProvider>
          <NavigationContainer>{component}</NavigationContainer>
        </PaperProvider>
      </Provider>
    );
  };

  describe('UI Rendering', () => {
    it('renders login screen correctly', () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <LoginScreen />
      );

      expect(getByText('Welcome to Solarium')).toBeTruthy();
      expect(getByText('Enter your phone number to get started')).toBeTruthy();
      expect(
        getByPlaceholderText('Enter your 10-digit phone number')
      ).toBeTruthy();
      expect(getByText('Get OTP')).toBeTruthy();
    });

    it('shows country code +91', () => {
      const { getByText } = renderWithProviders(<LoginScreen />);

      expect(getByText('+91')).toBeTruthy();
    });

    it('shows terms and privacy policy text', () => {
      const { getByText } = renderWithProviders(<LoginScreen />);

      expect(getByText(/Terms of Service and Privacy Policy/)).toBeTruthy();
    });
  });

  describe('Phone Number Input', () => {
    it('accepts valid 10-digit phone number', () => {
      const { getByPlaceholderText } = renderWithProviders(<LoginScreen />);

      const phoneInput = getByPlaceholderText(
        'Enter your 10-digit phone number'
      );
      fireEvent.changeText(phoneInput, '1234567890');

      expect(phoneInput.props.value).toBe('1234567890');
    });

    it('removes non-digit characters', () => {
      const { getByPlaceholderText } = renderWithProviders(<LoginScreen />);

      const phoneInput = getByPlaceholderText(
        'Enter your 10-digit phone number'
      );
      fireEvent.changeText(phoneInput, '12a3-45b67890');

      expect(phoneInput.props.value).toBe('1234567890');
    });

    it('limits input to 10 digits', () => {
      const { getByPlaceholderText } = renderWithProviders(<LoginScreen />);

      const phoneInput = getByPlaceholderText(
        'Enter your 10-digit phone number'
      );
      fireEvent.changeText(phoneInput, '12345678901234');

      expect(phoneInput.props.value).toBe('1234567890');
    });

    it('shows error for invalid phone numbers', () => {
      const { getByPlaceholderText } = renderWithProviders(<LoginScreen />);

      const phoneInput = getByPlaceholderText(
        'Enter your 10-digit phone number'
      );
      fireEvent.changeText(phoneInput, '123');

      // Error should be shown for invalid length
      expect(phoneInput.props.error).toBeTruthy();
    });
  });

  describe('Get OTP Button', () => {
    it('is disabled for invalid phone numbers', () => {
      const { getByPlaceholderText, getByText } = renderWithProviders(
        <LoginScreen />
      );

      const phoneInput = getByPlaceholderText(
        'Enter your 10-digit phone number'
      );
      const otpButton = getByText('Get OTP');

      fireEvent.changeText(phoneInput, '123');

      expect(otpButton.props.accessibilityState.disabled).toBe(true);
    });

    it('is enabled for valid phone numbers', () => {
      const { getByPlaceholderText, getByText } = renderWithProviders(
        <LoginScreen />
      );

      const phoneInput = getByPlaceholderText(
        'Enter your 10-digit phone number'
      );
      const otpButton = getByText('Get OTP');

      fireEvent.changeText(phoneInput, '1234567890');

      expect(otpButton.props.accessibilityState.disabled).toBe(false);
    });

    it('navigates to OTP screen on valid phone submission', async () => {
      const { getByPlaceholderText, getByText } = renderWithProviders(
        <LoginScreen />
      );

      const phoneInput = getByPlaceholderText(
        'Enter your 10-digit phone number'
      );
      const otpButton = getByText('Get OTP');

      fireEvent.changeText(phoneInput, '1234567890');
      fireEvent.press(otpButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Otp', {
          phone: '1234567890',
        });
      });
    });
  });

  describe('Offline Handling', () => {
    it('shows offline notice when offline', () => {
      // Mock offline state
      jest.doMock('../../../src/contexts/ConnectivityContext', () => ({
        useConnectivity: () => ({ isOnline: false }),
      }));

      const { getByText } = renderWithProviders(<LoginScreen />);

      expect(getByText(/You're offline/)).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('shows alert for invalid phone number', async () => {
      const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');

      const { getByPlaceholderText, getByText } = renderWithProviders(
        <LoginScreen />
      );

      const phoneInput = getByPlaceholderText(
        'Enter your 10-digit phone number'
      );
      const otpButton = getByText('Get OTP');

      fireEvent.changeText(phoneInput, '123');
      fireEvent.press(otpButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Invalid Phone',
          'Please enter a valid 10-digit phone number.'
        );
      });

      alertSpy.mockRestore();
    });
  });
});
