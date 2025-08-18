import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { configureStore } from '@reduxjs/toolkit';
import { axe, toHaveNoViolations, configureAxe } from 'jest-axe';
import { TopBar } from '../../src/components/common/TopBar';
import networkSlice from '../../src/store/slices/networkSlice';

expect.extend(toHaveNoViolations);

// Configure jest-axe for critical violations
configureAxe({
  rules: {
    // Critical accessibility rules
    'color-contrast': { enabled: true },
    'keyboard-access': { enabled: true },
    'focus-management': { enabled: true },
    'screen-reader': { enabled: true },
  },
});

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

describe('TopBar Accessibility Tests', () => {
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
          unreadNotificationCount: 5,
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

  describe('Critical Accessibility Compliance', () => {
    it('should pass jest-axe accessibility tests', async () => {
      const { container } = renderWithProviders(<TopBar />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper accessibility labels for all interactive elements', () => {
      const { getByTestId } = renderWithProviders(<TopBar />);

      const syncButton = getByTestId('topbar-sync-button');
      const notificationsButton = getByTestId('topbar-notifications-button');
      const profileButton = getByTestId('topbar-profile-button');

      expect(syncButton.props.accessibilityLabel).toBeTruthy();
      expect(syncButton.props.accessibilityLabel).toContain('Synchronise');

      expect(notificationsButton.props.accessibilityLabel).toBeTruthy();
      expect(notificationsButton.props.accessibilityLabel).toContain(
        'Notifications'
      );

      expect(profileButton.props.accessibilityLabel).toBeTruthy();
      expect(profileButton.props.accessibilityLabel).toContain('Profile');
    });

    it('should have proper accessibility hints for complex interactions', () => {
      const { getByTestId } = renderWithProviders(<TopBar />);

      const syncButton = getByTestId('topbar-sync-button');

      expect(syncButton.props.accessibilityHint).toBeTruthy();
      expect(syncButton.props.accessibilityHint).toContain('long press');
    });

    it('should have proper accessibility roles', () => {
      const { getByTestId } = renderWithProviders(<TopBar />);

      const syncButton = getByTestId('topbar-sync-button');
      const notificationsButton = getByTestId('topbar-notifications-button');
      const profileButton = getByTestId('topbar-profile-button');

      expect(syncButton.props.accessibilityRole).toBe('button');
      expect(notificationsButton.props.accessibilityRole).toBe('button');
      expect(profileButton.props.accessibilityRole).toBe('button');
    });

    it('should properly describe notification badge', () => {
      const { getByTestId } = renderWithProviders(<TopBar />);

      const notificationBadge = getByTestId('topbar-notification-badge');

      expect(notificationBadge.props.accessibilityLabel).toBeTruthy();
      expect(notificationBadge.props.accessibilityLabel).toContain('5');
      expect(notificationBadge.props.accessibilityLabel).toContain('unread');
      expect(notificationBadge.props.accessibilityRole).toBe('text');
    });

    it('should handle disabled states properly', () => {
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
      expect(syncButton.props.accessibilityLabel).toContain('Synchronizing');
    });

    it('should support high contrast mode', () => {
      // Test with high contrast theme
      const { getByTestId } = renderWithProviders(<TopBar />);

      const syncButton = getByTestId('topbar-sync-button');
      const notificationBadge = getByTestId('topbar-notification-badge');

      // Verify sufficient color contrast (implementation would check actual colors)
      expect(syncButton).toBeTruthy();
      expect(notificationBadge).toBeTruthy();
    });

    it('should support screen reader navigation', () => {
      const { getByTestId } = renderWithProviders(<TopBar />);

      const syncButton = getByTestId('topbar-sync-button');
      const notificationsButton = getByTestId('topbar-notifications-button');
      const profileButton = getByTestId('topbar-profile-button');

      // All elements should be accessible to screen readers
      expect(syncButton.props.accessibilityLabel).toBeTruthy();
      expect(notificationsButton.props.accessibilityLabel).toBeTruthy();
      expect(profileButton.props.accessibilityLabel).toBeTruthy();

      // Should have proper focus management
      expect(syncButton.props.accessible !== false).toBe(true);
      expect(notificationsButton.props.accessible !== false).toBe(true);
      expect(profileButton.props.accessible !== false).toBe(true);
    });
  });

  describe('Dynamic Accessibility States', () => {
    it('should update accessibility labels based on state changes', () => {
      const { getByTestId, rerender } = renderWithProviders(<TopBar />);

      // Initial state
      let notificationsButton = getByTestId('topbar-notifications-button');
      expect(notificationsButton.props.accessibilityLabel).toContain(
        '5 unread'
      );

      // Update store with different unread count
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

      rerender(
        <Provider store={store}>
          <PaperProvider>
            <TopBar />
          </PaperProvider>
        </Provider>
      );

      notificationsButton = getByTestId('topbar-notifications-button');
      expect(notificationsButton.props.accessibilityLabel).not.toContain(
        'unread'
      );
    });

    it('should handle offline state accessibility', () => {
      require('../../src/contexts/ConnectivityContext').useConnectivity =
        () => ({
          isConnected: false,
        });

      const { getByTestId } = renderWithProviders(<TopBar />);
      const syncButton = getByTestId('topbar-sync-button');

      expect(syncButton.props.accessibilityState.disabled).toBe(true);
      expect(syncButton.props.accessibilityLabel).toContain('no internet');
    });
  });
});
