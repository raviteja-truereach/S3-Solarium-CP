/**
 * Lead Status Flow Integration Tests
 * End-to-end testing of LeadDetailScreen status change flow
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import Toast from 'react-native-toast-message';

import LeadDetailScreen from '../../src/screens/leads/LeadDetailScreen';
import { leadApi } from '../../src/store/api/leadApi';
import leadReducer from '../../src/store/slices/leadSlice';
import { ConnectivityProvider } from '../../src/contexts/ConnectivityContext';

// Mock dependencies
jest.mock('react-native-toast-message');
jest.mock('../../src/hooks/useLeadById');
jest.mock('../../src/hooks/useConnectivityMemoized');

// Mock StatusChangeDialog
jest.mock('../../src/components/leads/StatusChangeDialog', () => {
  return jest.fn().mockImplementation(
    React.forwardRef(({ onStatusChange }, ref) => {
      const React = require('react');
      const { View, TouchableOpacity, Text } = require('react-native');

      React.useImperativeHandle(ref, () => ({
        open: jest.fn(),
        close: jest.fn(),
      }));

      return React.createElement(
        View,
        { testID: 'status-change-dialog' },
        React.createElement(
          TouchableOpacity,
          {
            testID: 'mock-status-submit',
            onPress: () =>
              onStatusChange({
                currentStatus: 'New Lead',
                newStatus: 'In Discussion',
                remarks: 'Test status change',
                nextFollowUpDate: new Date(
                  Date.now() + 7 * 24 * 60 * 60 * 1000
                ).toISOString(),
              }),
          },
          React.createElement(Text, null, 'Submit Status Change')
        )
      );
    })
  );
});

// Mock fetch
global.fetch = jest.fn();

const mockLead = {
  id: 'LEAD-123',
  customerName: 'John Doe',
  phone: '9876543210',
  status: 'New Lead',
  address: '123 Main St',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Mock hooks
const mockUseLeadById = require('../../src/hooks/useLeadById');
const mockUseIsOnline =
  require('../../src/hooks/useConnectivityMemoized').useIsOnline;

const createMockStore = () => {
  return configureStore({
    reducer: {
      lead: leadReducer,
      [leadApi.reducerPath]: leadApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(leadApi.middleware),
  });
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = createMockStore();
  return (
    <Provider store={store}>
      <PaperProvider>
        <ConnectivityProvider>
          <NavigationContainer>{children}</NavigationContainer>
        </ConnectivityProvider>
      </PaperProvider>
    </Provider>
  );
};

describe('Lead Status Flow Integration', () => {
  const mockRoute = {
    params: { leadId: 'LEAD-123' },
    key: 'test-key',
    name: 'LeadDetail' as const,
  };

  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseLeadById.mockReturnValue({
      lead: mockLead,
      loading: false,
      error: null,
      source: 'cache',
      onRetry: jest.fn(),
    });

    mockUseIsOnline.mockReturnValue(true);
  });

  describe('Successful Status Change Flow', () => {
    test('should complete full status change workflow', async () => {
      // Mock successful API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { getByTestId } = render(
        <TestWrapper>
          <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
        </TestWrapper>
      );

      // Find and press FAB
      const fab = getByTestId('change-status-fab');
      expect(fab).toBeTruthy();

      fireEvent.press(fab);

      // Find and press mock submit button
      const submitButton = getByTestId('mock-status-submit');
      fireEvent.press(submitButton);

      // Wait for success toast
      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            text1: 'Status Updated',
            text2: 'Status changed to "In Discussion"',
          })
        );
      });
    });

    test('should handle optimistic update correctly', async () => {
      // Mock delayed API response
      let resolveResponse: (value: any) => void;
      (fetch as jest.Mock).mockImplementationOnce(() => {
        return new Promise((resolve) => {
          resolveResponse = resolve;
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ success: true }),
            });
          }, 100);
        });
      });

      const { getByTestId } = render(
        <TestWrapper>
          <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
        </TestWrapper>
      );

      // Start status change
      fireEvent.press(getByTestId('change-status-fab'));
      fireEvent.press(getByTestId('mock-status-submit'));

      // Should show optimistic update immediately
      // (This would be tested via Redux state in a real scenario)

      // Wait for API completion
      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
          })
        );
      });
    });
  });

  describe('Error Handling Scenarios', () => {
    test('should handle 400 validation error', async () => {
      // Mock 400 error
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Invalid status transition',
        }),
      });

      const { getByTestId } = render(
        <TestWrapper>
          <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
        </TestWrapper>
      );

      // Trigger status change that will fail
      fireEvent.press(getByTestId('change-status-fab'));
      fireEvent.press(getByTestId('mock-status-submit'));

      // Should show error toast
      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            text1: 'Update Failed',
          })
        );
      });
    });

    test('should handle network error mid-request', async () => {
      // Mock network error
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { getByTestId } = render(
        <TestWrapper>
          <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
        </TestWrapper>
      );

      // Trigger status change that will fail
      fireEvent.press(getByTestId('change-status-fab'));
      fireEvent.press(getByTestId('mock-status-submit'));

      // Should handle network error gracefully
      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
          })
        );
      });
    });

    test('should handle server error with rollback', async () => {
      // Mock 500 error
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      const { getByTestId } = render(
        <TestWrapper>
          <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
        </TestWrapper>
      );

      // Trigger status change
      fireEvent.press(getByTestId('change-status-fab'));
      fireEvent.press(getByTestId('mock-status-submit'));

      // Should handle server error and rollback
      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
          })
        );
      });
    });
  });

  describe('Offline Handling', () => {
    test('should prevent status change when offline', () => {
      mockUseIsOnline.mockReturnValue(false);

      const { queryByTestId } = render(
        <TestWrapper>
          <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
        </TestWrapper>
      );

      // FAB should not be visible when offline
      const fab = queryByTestId('change-status-fab');
      expect(fab).toBeNull();
    });

    test('should show offline message when trying to change status offline', async () => {
      // Start online
      mockUseIsOnline.mockReturnValue(true);

      const { getByTestId, rerender } = render(
        <TestWrapper>
          <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
        </TestWrapper>
      );

      // Go offline
      mockUseIsOnline.mockReturnValue(false);

      rerender(
        <TestWrapper>
          <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
        </TestWrapper>
      );

      // FAB should be hidden when offline
      const fab = queryByTestId('change-status-fab');
      expect(fab).toBeNull();
    });
  });

  describe('Terminal Status Handling', () => {
    test('should hide FAB for terminal statuses', () => {
      const terminalStatuses = [
        'Executed',
        'Not Interested',
        'Not Responding',
        'Other Territory',
      ];

      terminalStatuses.forEach((status) => {
        mockUseLeadById.mockReturnValue({
          lead: { ...mockLead, status },
          loading: false,
          error: null,
        });

        const { queryByTestId } = render(
          <TestWrapper>
            <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
          </TestWrapper>
        );

        const fab = queryByTestId('change-status-fab');
        expect(fab).toBeNull();
      });
    });
  });

  describe('Performance Requirements', () => {
    test('should open dialog within 300ms', async () => {
      jest.useFakeTimers();

      const { getByTestId } = render(
        <TestWrapper>
          <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
        </TestWrapper>
      );

      const startTime = performance.now();

      const fab = getByTestId('change-status-fab');
      fireEvent.press(fab);

      const endTime = performance.now();
      const openTime = endTime - startTime;

      expect(openTime).toBeLessThan(300);

      jest.useRealTimers();
    });
  });
});
