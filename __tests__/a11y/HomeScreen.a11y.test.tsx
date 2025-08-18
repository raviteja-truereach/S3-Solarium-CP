import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import { axe, toHaveNoViolations } from 'jest-axe';
import HomeScreen from '../../src/screens/home/HomeScreen';
import networkSlice from '../../src/store/slices/networkSlice';

expect.extend(toHaveNoViolations);

// Mock dependencies
jest.mock('../../src/contexts/ConnectivityContext', () => ({
  useConnectivity: () => ({ isConnected: true }),
}));

jest.mock('../../src/store/api/dashboardApi', () => ({
  useGetDashboardSummaryQuery: () => ({
    data: {
      total: 10,
      todayPending: 5,
      overdue: 2,
      inProgress: 3,
    },
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: jest.fn(),
  }),
}));

describe('HomeScreen Accessibility Tests', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        network: networkSlice,
      },
      preloadedState: {
        network: {
          syncInProgress: false,
          lastSyncAt: Date.now() - 300000,
          nextAllowedSyncAt: 0,
          dashboardSummary: {
            total: 10,
            todayPending: 5,
            overdue: 2,
          },
          lastError: null,
          unreadNotificationCount: 3,
          lastSyncTs: new Date(Date.now() - 300000).toISOString(),
        },
      },
    });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <NavigationContainer>
        <Provider store={store}>
          <PaperProvider>{component}</PaperProvider>
        </Provider>
      </NavigationContainer>
    );
  };

  describe('Critical Accessibility Compliance', () => {
    it('should pass jest-axe accessibility tests', async () => {
      const { container } = renderWithProviders(<HomeScreen />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible headings structure', async () => {
      const { getByText } = renderWithProviders(<HomeScreen />);

      // Main heading should be accessible
      const dashboardTitle = getByText('Dashboard');
      expect(dashboardTitle).toBeTruthy();
    });

    it('should have accessible KPI cards with proper labels', async () => {
      const { getByText } = renderWithProviders(<HomeScreen />);

      // KPI cards should have descriptive text
      expect(getByText('Total Tasks')).toBeTruthy();
      expect(getByText('Today Pending')).toBeTruthy();
      expect(getByText('Overdue')).toBeTruthy();

      // Values should be accessible
      expect(getByText('10')).toBeTruthy(); // Total value
      expect(getByText('5')).toBeTruthy(); // Pending value
      expect(getByText('2')).toBeTruthy(); // Overdue value
    });

    it('should have accessible last sync indicator', async () => {
      const { getByText } = renderWithProviders(<HomeScreen />);

      const lastSyncText = getByText(/Last sync:/);
      expect(lastSyncText).toBeTruthy();

      // Should be readable by screen readers
      expect(lastSyncText.props.accessible !== false).toBe(true);
    });

    it('should handle loading states accessibly', async () => {
      // Mock loading state
      require('../../src/store/api/dashboardApi').useGetDashboardSummaryQuery =
        () => ({
          data: null,
          error: null,
          isLoading: true,
          isFetching: true,
          refetch: jest.fn(),
        });

      const { getByText } = renderWithProviders(<HomeScreen />);

      const loadingText = getByText(/Loading/);
      expect(loadingText).toBeTruthy();

      // Loading state should be announced to screen readers
      expect(loadingText.props.accessibilityLiveRegion).toBe('polite');
    });

    it('should handle error states accessibly', async () => {
      // Mock error state
      require('../../src/store/api/dashboardApi').useGetDashboardSummaryQuery =
        () => ({
          data: null,
          error: { message: 'Network error' },
          isLoading: false,
          isFetching: false,
          refetch: jest.fn(),
        });

      const { getByText } = renderWithProviders(<HomeScreen />);

      const errorText = getByText(/Unable to load/);
      expect(errorText).toBeTruthy();

      // Error should be announced to screen readers
      expect(errorText.props.accessibilityRole).toBe('alert');
    });

    it('should have accessible offline indicators', async () => {
      // Mock offline state
      require('../../src/contexts/ConnectivityContext').useConnectivity =
        () => ({
          isConnected: false,
        });

      const { getAllByText } = renderWithProviders(<HomeScreen />);

      // Should show cached labels
      const cachedLabels = getAllByText('cached');
      expect(cachedLabels.length).toBeGreaterThan(0);

      cachedLabels.forEach((label) => {
        expect(label.props.accessibilityLabel).toContain('cached');
      });
    });

    it('should support keyboard navigation', async () => {
      const { getByTestId } = renderWithProviders(<HomeScreen />);

      // All interactive elements should be focusable
      const testButton = getByTestId('notification-test-button');
      expect(testButton.props.accessible !== false).toBe(true);
      expect(testButton.props.accessibilityRole).toBe('button');
    });

    it('should have proper color contrast', async () => {
      const { container } = renderWithProviders(<HomeScreen />);

      // This would be implemented with actual color contrast checking
      // For now, we verify the component renders without issues
      expect(container).toBeTruthy();
    });
  });

  describe('Responsive Accessibility', () => {
    it('should maintain accessibility across different states', async () => {
      const { rerender } = renderWithProviders(<HomeScreen />);

      // Test with sync in progress
      store = configureStore({
        reducer: { network: networkSlice },
        preloadedState: {
          network: {
            syncInProgress: true,
            lastSyncAt: null,
            nextAllowedSyncAt: 0,
            dashboardSummary: null,
            lastError: null,
            unreadNotificationCount: 0,
            lastSyncTs: undefined,
          },
        },
      });

      rerender(
        <NavigationContainer>
          <Provider store={store}>
            <PaperProvider>
              <HomeScreen />
            </PaperProvider>
          </Provider>
        </NavigationContainer>
      );

      const { container } = renderWithProviders(<HomeScreen />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
