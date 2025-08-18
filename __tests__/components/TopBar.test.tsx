import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { configureStore } from '@reduxjs/toolkit';
import { axe, toHaveNoViolations } from 'jest-axe';
import { TopBar } from '../../src/components/common/TopBar';
import networkSlice from '../../src/store/slices/networkSlice';

expect.extend(toHaveNoViolations);

// Mock dependencies
jest.mock('../../src/contexts/ConnectivityContext', () => ({
  useConnectivity: () => ({ isConnected: true }),
}));

jest.mock('../../src/services/SyncManager', () => ({
  getSyncManager: () => ({
    manualSync: jest.fn().mockResolvedValue(undefined),
    fullSync: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../src/navigation/navigationRef', () => ({
  navigateToNotifications: jest.fn(),
}));

describe('TopBar Component', () => {
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
          unreadNotificationCount: 3,
          lastSyncTs: undefined,
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

  it('renders correctly with default props', () => {
    const { getByTestId } = renderWithProviders(<TopBar />);

    expect(getByTestId('topbar-sync-button')).toBeTruthy();
    expect(getByTestId('topbar-notifications-button')).toBeTruthy();
    expect(getByTestId('topbar-profile-button')).toBeTruthy();
  });

  it('displays notification badge when unread count > 0', () => {
    const { getByTestId, getByText } = renderWithProviders(<TopBar />);

    expect(getByTestId('topbar-notification-badge')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });

  it('hides notification badge when unread count is 0', () => {
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

    const { queryByTestId } = renderWithProviders(<TopBar />);

    expect(queryByTestId('topbar-notification-badge')).toBeNull();
  });

  it('disables sync button during sync', () => {
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

    const { getByTestId } = renderWithProviders(<TopBar />);
    const syncButton = getByTestId('topbar-sync-button');

    expect(syncButton.props.accessibilityState.disabled).toBe(true);
  });

  it('handles sync button press', async () => {
    const { getSyncManager } = require('../../src/services/SyncManager');
    const mockManualSync = getSyncManager().manualSync;

    const { getByTestId } = renderWithProviders(<TopBar />);
    const syncButton = getByTestId('topbar-sync-button');

    fireEvent.press(syncButton);

    await waitFor(() => {
      expect(mockManualSync).toHaveBeenCalledWith('manual');
    });
  });

  it('handles sync button long press', async () => {
    const { getSyncManager } = require('../../src/services/SyncManager');
    const mockFullSync = getSyncManager().fullSync;

    const { getByTestId } = renderWithProviders(<TopBar />);
    const syncButton = getByTestId('topbar-sync-button');

    fireEvent(syncButton, 'longPress');

    await waitFor(() => {
      expect(mockFullSync).toHaveBeenCalledWith('longPress');
    });
  });

  it('handles notifications button press', () => {
    const {
      navigateToNotifications,
    } = require('../../src/navigation/navigationRef');

    const { getByTestId } = renderWithProviders(<TopBar />);
    const notificationsButton = getByTestId('topbar-notifications-button');

    fireEvent.press(notificationsButton);

    expect(navigateToNotifications).toHaveBeenCalled();
  });

  it('has proper accessibility labels', () => {
    const { getByTestId } = renderWithProviders(<TopBar />);

    const syncButton = getByTestId('topbar-sync-button');
    const notificationsButton = getByTestId('topbar-notifications-button');
    const profileButton = getByTestId('topbar-profile-button');

    expect(syncButton.props.accessibilityLabel).toBe('Synchronise data');
    expect(notificationsButton.props.accessibilityLabel).toBe(
      'Notifications, 3 unread'
    );
    expect(profileButton.props.accessibilityLabel).toBe('Profile');
  });

  it('shows large numbers in badge correctly', () => {
    store = configureStore({
      reducer: { network: networkSlice },
      preloadedState: {
        network: {
          syncInProgress: false,
          lastSyncAt: null,
          nextAllowedSyncAt: 0,
          dashboardSummary: null,
          lastError: null,
          unreadNotificationCount: 150,
          lastSyncTs: undefined,
        },
      },
    });

    const { getByText } = renderWithProviders(<TopBar />);
    expect(getByText('99+')).toBeTruthy();
  });

  it('passes accessibility tests', async () => {
    const { container } = renderWithProviders(<TopBar />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('respects showSync prop', () => {
    const { queryByTestId } = renderWithProviders(<TopBar showSync={false} />);
    expect(queryByTestId('topbar-sync-button')).toBeNull();
  });

  it('respects showNotifications prop', () => {
    const { queryByTestId } = renderWithProviders(
      <TopBar showNotifications={false} />
    );
    expect(queryByTestId('topbar-notifications-button')).toBeNull();
  });

  it('respects showProfile prop', () => {
    const { queryByTestId } = renderWithProviders(
      <TopBar showProfile={false} />
    );
    expect(queryByTestId('topbar-profile-button')).toBeNull();
  });
});
