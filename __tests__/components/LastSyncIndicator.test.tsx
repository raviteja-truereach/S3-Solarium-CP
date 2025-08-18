import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { configureStore } from '@reduxjs/toolkit';
import { axe, toHaveNoViolations } from 'jest-axe';
import { LastSyncIndicator } from '../../src/components/common/LastSyncIndicator';
import networkSlice from '../../src/store/slices/networkSlice';

expect.extend(toHaveNoViolations);

// Mock connectivity context
jest.mock('../../src/contexts/ConnectivityContext', () => ({
  useConnectivity: () => ({ isConnected: true }),
}));

describe('LastSyncIndicator Component', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        network: networkSlice,
      },
      preloadedState: {
        network: {
          syncInProgress: false,
          lastSyncAt: null,
          nextAllowedSyncAt: 0,
          dashboardSummary: null,
          lastError: null,
          unreadNotificationCount: 0,
          lastSyncTs: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
        },
      },
    });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <Provider store={store}>
        <PaperProvider>{component}</PaperProvider>
      </Provider>
    );
  };

  it('renders correctly with last sync time', () => {
    const { getByText, getByTestId } = renderWithProviders(
      <LastSyncIndicator />
    );

    expect(getByTestId('last-sync-indicator')).toBeTruthy();
    expect(getByText('Last sync: 2 min ago')).toBeTruthy();
  });

  it('shows "–" when never synced', () => {
    store = configureStore({
      reducer: { network: networkSlice },
      preloadedState: {
        network: {
          syncInProgress: false,
          lastSyncAt: null,
          nextAllowedSyncAt: 0,
          dashboardSummary: null,
          lastError: null,
          unreadNotificationCount: 0,
          lastSyncTs: undefined,
        },
      },
    });

    const { getByText } = renderWithProviders(<LastSyncIndicator />);
    expect(getByText('Last sync: –')).toBeTruthy();
  });

  it('shows syncing state', () => {
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

    const { getByText } = renderWithProviders(<LastSyncIndicator />);
    expect(getByText('Syncing...')).toBeTruthy();
  });

  it('passes accessibility tests', async () => {
    const { container } = renderWithProviders(<LastSyncIndicator />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper accessibility label', () => {
    const { getByTestId } = renderWithProviders(<LastSyncIndicator />);
    const indicator = getByTestId('last-sync-indicator');

    expect(indicator.props.accessibilityLabel).toMatch(/Sync status:/);
  });
});
