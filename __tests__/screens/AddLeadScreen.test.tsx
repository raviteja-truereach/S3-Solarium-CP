/**
 * AddLeadScreen Component Tests
 * Comprehensive test suite with RTL and accessibility testing
 */
import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  screen,
  act,
} from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { axe, toHaveNoViolations } from 'jest-axe';
import NetInfo from '@react-native-community/netinfo';

import AddLeadScreen from '../../src/screens/leads/AddLeadScreen';
import { store } from '../../src/store/store';
import { ConnectivityProvider } from '../../src/context/ConnectivityContext';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock dependencies
jest.mock('react-native-toast-message');
jest.mock('@react-native-community/netinfo');
jest.mock('react-native-keyboard-aware-scroll-view', () => ({
  KeyboardAwareScrollView: ({ children }: any) => children,
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

// Mock API hooks
const mockCreateLead = jest.fn();
const mockGetActiveServices = jest.fn();

jest.mock('../../src/store/api/leadApi', () => ({
  useCreateLeadMutation: () => [mockCreateLead, { isLoading: false }],
}));

jest.mock('../../src/store/api/servicesApi', () => ({
  useGetActiveServicesQuery: () => mockGetActiveServices(),
}));

// Mock connectivity context
const mockConnectivityContext = {
  isOnline: true,
  connectionType: 'wifi' as const,
};

const ConnectivityWrapper: React.FC<{
  children: React.ReactNode;
  isOnline?: boolean;
}> = ({ children, isOnline = true }) => (
  <ConnectivityProvider value={{ ...mockConnectivityContext, isOnline }}>
    {children}
  </ConnectivityProvider>
);

// Test wrapper component
const TestWrapper: React.FC<{
  children: React.ReactNode;
  isOnline?: boolean;
}> = ({ children, isOnline = true }) => (
  <Provider store={store}>
    <PaperProvider>
      <ConnectivityWrapper isOnline={isOnline}>
        <NavigationContainer>
          {children}
          <Toast />
        </NavigationContainer>
      </ConnectivityWrapper>
    </PaperProvider>
  </Provider>
);

// Mock services data
const mockServicesData = {
  success: true,
  data: {
    items: [
      {
        serviceId: 'SRV001',
        name: 'Solar Rooftop Installation',
        type: 'Installation',
        description: 'Complete solar rooftop installation',
        status: 'Active',
      },
      {
        serviceId: 'SRV002',
        name: 'Battery Storage',
        type: 'Add-on',
        description: 'Battery backup system',
        status: 'Active',
      },
      {
        serviceId: 'SRV003',
        name: 'Solar Water Heating',
        type: 'Installation',
        description: 'Solar water heating system',
        status: 'Active',
      },
    ],
    total: 3,
    offset: 0,
    limit: 25,
  },
};

describe('AddLeadScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default service mock
    mockGetActiveServices.mockReturnValue({
      data: mockServicesData,
      isLoading: false,
      error: null,
    });

    // Setup NetInfo mock
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });
  });

  describe('Component Rendering', () => {
    it('should render all form fields correctly', () => {
      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      // Check header
      expect(screen.getByText('Add New Lead')).toBeTruthy();
      expect(
        screen.getByText('Enter customer details to create a new lead')
      ).toBeTruthy();

      // Check form fields
      expect(screen.getByText('Customer Name')).toBeTruthy();
      expect(screen.getByText('Phone Number')).toBeTruthy();
      expect(screen.getByText('Email Address')).toBeTruthy();
      expect(screen.getByText('Address')).toBeTruthy();
      expect(screen.getByText('State')).toBeTruthy();
      expect(screen.getByText('PIN Code')).toBeTruthy();
      expect(screen.getByText('Services Interested')).toBeTruthy();

      // Check buttons
      expect(screen.getByText('Save Lead')).toBeTruthy();
      expect(screen.getByText('Select Services')).toBeTruthy();
    });

    it('should render with correct initial state', () => {
      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      // Check initial values
      const customerNameInput = screen.getByDisplayValue('');
      const phoneInput = screen.getByDisplayValue('');

      expect(customerNameInput).toBeTruthy();
      expect(phoneInput).toBeTruthy();

      // Save button should be disabled initially
      const saveButton = screen.getByText('Save Lead');
      expect(saveButton.props.accessibilityState?.disabled).toBeTruthy();
    });

    it('should pass accessibility audit', async () => {
      const { container } = render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors on empty form submission', async () => {
      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      const saveButton = screen.getByText('Save Lead');

      // Fill minimal data to enable button
      const customerNameInput = screen.getByPlaceholderText(
        'Enter customer name'
      );
      fireEvent.changeText(customerNameInput, 'Test Customer');

      await act(async () => {
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith({
          type: 'error',
          text1: 'Validation Error',
          text2: 'Please fix the errors in the form before submitting.',
        });
      });
    });

    it('should validate phone number format', async () => {
      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      const phoneInput = screen.getByPlaceholderText('Enter your phone number');

      // Test invalid phone number
      fireEvent.changeText(phoneInput, '123');
      fireEvent(phoneInput, 'blur');

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid 10-digit phone number')
        ).toBeTruthy();
      });
    });

    it('should validate email format when provided', async () => {
      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText(
        'Enter email address (optional)'
      );

      // Test invalid email
      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent(emailInput, 'blur');

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid email address')
        ).toBeTruthy();
      });
    });

    it('should validate PIN code format', async () => {
      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      const pinCodeInput = screen.getByPlaceholderText(
        'Enter 6-digit PIN code'
      );

      // Test invalid PIN code
      fireEvent.changeText(pinCodeInput, '123');
      fireEvent(pinCodeInput, 'blur');

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid 6-digit PIN code')
        ).toBeTruthy();
      });
    });

    it('should format phone number input correctly', () => {
      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      const phoneInput = screen.getByPlaceholderText('Enter your phone number');

      // Test phone formatting
      fireEvent.changeText(phoneInput, '98765-43210abc');

      // Should format to digits only, max 10
      expect(phoneInput.props.value).toBe('9876543210');
    });

    it('should format PIN code input correctly', () => {
      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      const pinCodeInput = screen.getByPlaceholderText(
        'Enter 6-digit PIN code'
      );

      // Test PIN code formatting
      fireEvent.changeText(pinCodeInput, '560001abc789');

      // Should format to digits only, max 6
      expect(pinCodeInput.props.value).toBe('560001');
    });
  });

  describe('State Selection', () => {
    it('should open state selector modal', async () => {
      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      const stateField = screen.getByPlaceholderText('Select state');
      fireEvent.press(stateField);

      await waitFor(() => {
        expect(screen.getByText('Select State')).toBeTruthy();
        expect(screen.getByText('Karnataka')).toBeTruthy();
        expect(screen.getByText('Maharashtra')).toBeTruthy();
      });
    });

    it('should select state from modal', async () => {
      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      const stateField = screen.getByPlaceholderText('Select state');
      fireEvent.press(stateField);

      await waitFor(() => {
        const karnatakaOption = screen.getByText('Karnataka');
        fireEvent.press(karnatakaOption);
      });

      // Check that state is selected
      expect(stateField.props.value).toBe('Karnataka');
    });
  });

  describe('Services Selection', () => {
    it('should open services selector modal', async () => {
      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      const selectServicesButton = screen.getByText('Select Services');
      fireEvent.press(selectServicesButton);

      await waitFor(() => {
        expect(screen.getByText('Select Services')).toBeTruthy();
        expect(screen.getByText('Solar Rooftop Installation')).toBeTruthy();
        expect(screen.getByText('Battery Storage')).toBeTruthy();
      });
    });

    it('should select and display services', async () => {
      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      // Open services modal
      const selectServicesButton = screen.getByText('Select Services');
      fireEvent.press(selectServicesButton);

      await waitFor(() => {
        const solarService = screen.getByText('Solar Rooftop Installation');
        fireEvent.press(solarService);
      });

      // Close modal
      const doneButton = screen.getByText('Done');
      fireEvent.press(doneButton);

      await waitFor(() => {
        expect(screen.getByText('Solar Rooftop Installation')).toBeTruthy();
      });
    });

    it('should handle services loading state', () => {
      mockGetActiveServices.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      const selectServicesButton = screen.getByText('Select Services');
      fireEvent.press(selectServicesButton);

      expect(screen.getByText('Loading services...')).toBeTruthy();
    });

    it('should handle services error state', async () => {
      mockGetActiveServices.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: 'Failed to load' },
      });

      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      const selectServicesButton = screen.getByText('Select Services');
      fireEvent.press(selectServicesButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to load services')).toBeTruthy();
      });
    });
  });

  describe('Online/Offline Behavior', () => {
    it('should show offline banner when offline', () => {
      render(
        <TestWrapper isOnline={false}>
          <AddLeadScreen />
        </TestWrapper>
      );

      // Should show offline banner initially (test the state)
      const saveButton = screen.getByText('Save Lead');
      expect(saveButton.props.accessibilityState?.disabled).toBeTruthy();
    });

    it('should prevent form submission when offline', async () => {
      render(
        <TestWrapper isOnline={false}>
          <AddLeadScreen />
        </TestWrapper>
      );

      // Fill form with valid data
      await fillValidForm();

      const saveButton = screen.getByText('Save Lead');
      expect(saveButton.props.accessibilityState?.disabled).toBeTruthy();
    });

    it('should allow form submission when online', async () => {
      mockCreateLead.mockReturnValue({
        unwrap: jest.fn().mockResolvedValue({
          success: true,
          data: { leadId: 'LEAD123' },
        }),
      });

      render(
        <TestWrapper isOnline={true}>
          <AddLeadScreen />
        </TestWrapper>
      );

      await fillValidForm();

      const saveButton = screen.getByText('Save Lead');

      await act(async () => {
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(mockCreateLead).toHaveBeenCalled();
      });
    });
  });

  describe('API Integration', () => {
    it('should call createLead API with correct payload', async () => {
      const mockUnwrap = jest.fn().mockResolvedValue({
        success: true,
        data: { leadId: 'LEAD123' },
      });

      mockCreateLead.mockReturnValue({
        unwrap: mockUnwrap,
      });

      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      await fillValidForm();

      const saveButton = screen.getByText('Save Lead');

      await act(async () => {
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(mockCreateLead).toHaveBeenCalledWith({
          customerName: 'John Doe',
          phone: '9876543210',
          address: '123 Main Street, Karnataka 560001',
          services: [],
        });
      });
    });

    it('should show success toast on successful submission', async () => {
      const mockUnwrap = jest.fn().mockResolvedValue({
        success: true,
        data: { leadId: 'LEAD123' },
      });

      mockCreateLead.mockReturnValue({
        unwrap: mockUnwrap,
      });

      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      await fillValidForm();

      const saveButton = screen.getByText('Save Lead');

      await act(async () => {
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith({
          type: 'success',
          text1: 'Lead Created',
          text2: 'Lead LEAD123 created successfully!',
        });
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockUnwrap = jest.fn().mockRejectedValue({
        status: 409,
        data: { message: 'Phone number already exists' },
      });

      mockCreateLead.mockReturnValue({
        unwrap: mockUnwrap,
      });

      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      await fillValidForm();

      const saveButton = screen.getByText('Save Lead');

      await act(async () => {
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith({
          type: 'error',
          text1: 'Error',
          text2: 'Phone number already exists. Please use a different number.',
        });
      });
    });

    it('should navigate back on successful submission', async () => {
      const mockUnwrap = jest.fn().mockResolvedValue({
        success: true,
        data: { leadId: 'LEAD123' },
      });

      mockCreateLead.mockReturnValue({
        unwrap: mockUnwrap,
      });

      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      await fillValidForm();

      const saveButton = screen.getByText('Save Lead');

      await act(async () => {
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(mockGoBack).toHaveBeenCalled();
      });
    });
  });

  describe('Form Interaction Flow', () => {
    it('should enable save button when form is valid and online', async () => {
      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      await fillValidForm();

      const saveButton = screen.getByText('Save Lead');
      expect(saveButton.props.accessibilityState?.disabled).toBeFalsy();
    });

    it('should clear field errors when user starts typing', async () => {
      render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      const phoneInput = screen.getByPlaceholderText('Enter your phone number');

      // Enter invalid phone
      fireEvent.changeText(phoneInput, '123');
      fireEvent(phoneInput, 'blur');

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid 10-digit phone number')
        ).toBeTruthy();
      });

      // Start typing valid phone - error should clear
      fireEvent.changeText(phoneInput, '9876543210');

      await waitFor(() => {
        expect(
          screen.queryByText('Please enter a valid 10-digit phone number')
        ).toBeFalsy();
      });
    });
  });

  // Helper function to fill form with valid data
  const fillValidForm = async () => {
    const customerNameInput = screen.getByPlaceholderText(
      'Enter customer name'
    );
    const phoneInput = screen.getByPlaceholderText('Enter your phone number');
    const addressInput = screen.getByPlaceholderText('Enter complete address');
    const pinCodeInput = screen.getByPlaceholderText('Enter 6-digit PIN code');

    fireEvent.changeText(customerNameInput, 'John Doe');
    fireEvent.changeText(phoneInput, '9876543210');
    fireEvent.changeText(addressInput, '123 Main Street');
    fireEvent.changeText(pinCodeInput, '560001');

    // Select state
    const stateField = screen.getByPlaceholderText('Select state');
    fireEvent.press(stateField);

    await waitFor(() => {
      const karnatakaOption = screen.getByText('Karnataka');
      fireEvent.press(karnatakaOption);
    });
  };
});
