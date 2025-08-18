import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import HomeScreen from '../../src/screens/home/HomeScreen';
import networkSlice from '../../src/store/slices/networkSlice';

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

describe('HomeScreen', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        network: networkSlice,
      },
      preloadedState: {
        network: {
          syncInProgress: false,
          lastSyncAt: Date.now() - 300000, // 5 minutes ago
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

  it('renders dashboard with KPI cards', async () => {
    const { getByText } = renderWithProviders(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Dashboard')).toBeTruthy();
      expect(getByText('Total Tasks')).toBeTruthy();
      expect(getByText('Today Pending')).toBeTruthy();
      expect(getByText('Overdue')).toBeTruthy();
      expect(getByText('10')).toBeTruthy(); // Total value
    });
  });

  it('shows last sync indicator', async () => {
    const { getByText } = renderWithProviders(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Last sync: 5 min ago')).toBeTruthy();
    });
  });

  it('shows cached label when offline', async () => {
    // Mock offline state
    require('../../src/contexts/ConnectivityContext').useConnectivity = () => ({
      isConnected: false,
    });

    const { getAllByText } = renderWithProviders(<HomeScreen />);

    await waitFor(() => {
      const cachedLabels = getAllByText('cached');
      expect(cachedLabels.length).toBeGreaterThan(0);
    });
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithProviders(<HomeScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
