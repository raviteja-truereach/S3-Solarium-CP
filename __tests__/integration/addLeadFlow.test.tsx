/**
 * Add Lead Flow Integration Tests
 * End-to-end integration tests for the complete add lead flow
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import Toast from 'react-native-toast-message';

import AddLeadScreen from '../../src/screens/leads/AddLeadScreen';
import { store } from '../../src/store/store';
import { ConnectivityProvider } from '../../src/context/ConnectivityContext';
import { mockOnlineState, mockOfflineState } from '../helpers/mockConnectivity';

// Setup mocks
jest.mock('react-native-toast-message');
jest.mock('@react-native-community/netinfo');

const mockCreateLead = jest.fn();
const mockGetActiveServices = jest.fn();

jest.mock('../../src/store/api/leadApi', () => ({
  useCreateLeadMutation: () => [mockCreateLead, { isLoading: false }],
}));

jest.mock('../../src/store/api/servicesApi', () => ({
  useGetActiveServicesQuery: () => mockGetActiveServices(),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const TestWrapper: React.FC<{
  children: React.ReactNode;
  isOnline?: boolean;
}> = ({ children, isOnline = true }) => (
  <Provider store={store}>
    <PaperProvider>
      <ConnectivityProvider
        value={{
          isOnline,
          connectionType: isOnline ? 'wifi' : 'none',
        }}
      >
        <NavigationContainer>
          {children}
          <Toast />
        </NavigationContainer>
      </ConnectivityProvider>
    </PaperProvider>
  </Provider>
);

describe('Add Lead Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetActiveServices.mockReturnValue({
      data: {
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
          ],
          total: 2,
          offset: 0,
          limit: 25,
        },
      },
      isLoading: false,
      error: null,
    });
  });

  describe('Complete Success Flow', () => {
    it('should complete entire add lead flow successfully', async () => {
      mockOnlineState();

      const mockUnwrap = jest.fn().mockResolvedValue({
        success: true,
        data: { leadId: 'LEAD123' },
      });

      mockCreateLead.mockReturnValue({ unwrap: mockUnwrap });

      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      // Step 1: Fill customer information
      const customerNameInput = getByPlaceholderText('Enter customer name');
      const phoneInput = getByPlaceholderText('Enter your phone number');
      const emailInput = getByPlaceholderText('Enter email address (optional)');
      const addressInput = getByPlaceholderText('Enter complete address');
      const pinCodeInput = getByPlaceholderText('Enter 6-digit PIN code');

      fireEvent.changeText(customerNameInput, 'John Doe');
      fireEvent.changeText(phoneInput, '9876543210');
      fireEvent.changeText(emailInput, 'john@example.com');
      fireEvent.changeText(addressInput, '123 Main Street, Tech Park');
      fireEvent.changeText(pinCodeInput, '560001');

      // Step 2: Select state
      const stateField = getByPlaceholderText('Select state');
      fireEvent.press(stateField);

      await waitFor(() => {
        const karnatakaOption = getByText('Karnataka');
        fireEvent.press(karnatakaOption);
      });

      // Step 3: Select services
      const selectServicesButton = getByText('Select Services');
      fireEvent.press(selectServicesButton);

      await waitFor(() => {
        const solarService = getByText('Solar Rooftop Installation');
        fireEvent.press(solarService);
      });

      const doneButton = getByText('Done');
      fireEvent.press(doneButton);

      // Step 4: Submit form
      await waitFor(() => {
        const saveButton = getByText('Save Lead');
        expect(saveButton.props.accessibilityState?.disabled).toBeFalsy();
      });

      const saveButton = getByText('Save Lead');

      await act(async () => {
        fireEvent.press(saveButton);
      });

      // Verify API call
      await waitFor(() => {
        expect(mockCreateLead).toHaveBeenCalledWith({
          customerName: 'John Doe',
          phone: '9876543210',
          address: '123 Main Street, Tech Park, Karnataka 560001',
          services: ['SRV001'],
        });
      });

      // Verify success toast
      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith({
          type: 'success',
          text1: 'Lead Created',
          text2: 'Lead LEAD123 created successfully!',
        });
      });

      // Verify navigation
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle network error during submission', async () => {
      mockOnlineState();

      const mockUnwrap = jest.fn().mockRejectedValue({
        status: 500,
        message: 'Internal server error',
      });

      mockCreateLead.mockReturnValue({ unwrap: mockUnwrap });

      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <AddLeadScreen />
        </TestWrapper>
      );

      // Fill valid form
      await fillCompleteForm(getByPlaceholderText, getByText);

      const saveButton = getByText('Save Lead');

      await act(async () => {
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith({
          type: 'error',
          text1: 'Error',
          text2: 'Server error. Please try again later.',
        });
      });

      // Should not navigate on error
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('should prevent submission when offline', async () => {
      mockOfflineState();

      const { getByText, getByPlaceholderText } = render(
        <TestWrapper isOnline={false}>
          <AddLeadScreen />
        </TestWrapper>
      );

      // Fill valid form
      await fillCompleteForm(getByPlaceholderText, getByText);

      const saveButton = getByText('Save Lead');

      // Button should be disabled when offline
      expect(saveButton.props.accessibilityState?.disabled).toBeTruthy();
    });
  });

  // Helper function
  const fillCompleteForm = async (
    getByPlaceholderText: any,
    getByText: any
  ) => {
    fireEvent.changeText(
      getByPlaceholderText('Enter customer name'),
      'John Doe'
    );
    fireEvent.changeText(
      getByPlaceholderText('Enter your phone number'),
      '9876543210'
    );
    fireEvent.changeText(
      getByPlaceholderText('Enter complete address'),
      '123 Main Street'
    );
    fireEvent.changeText(
      getByPlaceholderText('Enter 6-digit PIN code'),
      '560001'
    );

    const stateField = getByPlaceholderText('Select state');
    fireEvent.press(stateField);

    await waitFor(() => {
      const karnatakaOption = getByText('Karnataka');
      fireEvent.press(karnatakaOption);
    });
  };
});
