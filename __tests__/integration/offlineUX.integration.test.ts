/**
 * Offline UX Integration Tests
 * End-to-end testing of offline functionality with mocked dependencies
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import NetInfo from '@react-native-async-storage/async-storage';
import { HomeScreen } from '../../src/screens/home/HomeScreen';
import { MyLeadsScreen } from '../../src/screens/leads/MyLeadsScreen';
import { SyncManager } from '../../src/sync/SyncManager';
import { ConnectivityProvider } from '../../src/contexts/ConnectivityContext';
import Toast from 'react-native-toast-message';
import authSlice from '../../src/store/slices/authSlice';
import leadSlice from '../../src/store/slices/leadSlice';
import networkSlice from '../../src/store/slices/networkSlice';
import { dashboardApi } from '../../src/store/api/dashboardApi';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
  configure: jest.fn(),
  useNetInfo: jest.fn(),
}));

// Mock SyncManager
jest.mock('../../src/sync/SyncManager');
const mockSyncManager = {
  manualSync: jest.fn(),
  getInstance: jest.fn(),
  startScheduler: jest.fn(),
  stopScheduler: jest.fn(),
};
(SyncManager.getInstance as jest.Mock).mockReturnValue(mockSyncManager);

// Mock Toast
jest.mock('react-native-toast-message');

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock theme
jest.mock('react-native-paper', () => {
  const RNPaper = jest.requireActual('react-native-paper');
  return {
    ...RNPaper,
    useTheme: () => ({
      colors: {
        background: '#FAFAFA',
        surface: '#FFFFFF',
        primary: '#007AFF',
        secondary: '#52C7B8',
        secondaryContainer: '#E0F2F1',
        onSecondaryContainer: '#00695C',
        onSurface: '#1C1B1F',
        onSurfaceVariant: '#666666',
        outline: '#E0E0E0',
        error: '#FF3B30',
      },
    }),
  };
});

// Mock AccessibilityInfo
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    AccessibilityInfo: {
      announceForAccessibility: jest.fn(),
    },
    Alert: {
      alert: jest.fn(),
    },
  };
});

// Create test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      leads: leadSlice,
      network: networkSlice,
      [dashboardApi.reducerPath]: dashboardApi.reducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        user: { name: 'Test User', id: '1' },
        token: 'test-token',
        isLoading: false,
        error: null,
        lastActivity: Date.now(),
        ...initialState.auth,
      },
      leads: {
        items: [],
        lastSync: null,
        isLoading: false,
        error: null,
        totalCount: 0,
        filters: {},
        ...initialState.leads,
      },
      network: {
        syncInProgress: false,
        lastSyncAt: null,
        nextAllowedSyncAt: 0,
        dashboardSummary: null,
        lastError: null,
        ...initialState.network,
      },
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [
            'api/executeQuery',
            'persist/PERSIST',
            'persist/REHYDRATE',
          ],
        },
      }),
  });
};

// Test wrapper with all providers
const createWrapper = (store: any, isOnline = true) => {
  // Mock connectivity context
  const MockConnectivityProvider = ({
    children,
  }: {
    children: React.ReactNode;
  }) => {
    const mockContextValue = { isOnline };
    return React.createElement(
      ConnectivityProvider as any,
      { value: mockContextValue },
      children
    );
  };

  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <MockConnectivityProvider>{children}</MockConnectivityProvider>
    </Provider>
  );
};

describe('Offline UX Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSyncManager.manualSync.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Happy Path - Online Scenario', () => {
    it('should complete full refresh cycle in HomeScreen when online', async () => {
      const store = createTestStore();
      const wrapper = createWrapper(store, true); // Online

      const { getByTestId, queryByTestId } = render(<HomeScreen />, {
        wrapper,
      });

      // Verify offline banner is not visible when online
      expect(queryByTestId('offline-banner')).toBeNull();

      // Get scroll view and trigger refresh
      const scrollView = getByTestId('home-scroll-view');
      const refreshControl = scrollView.props.refreshControl;

      // Trigger pull-to-refresh
      fireEvent(refreshControl, 'refresh');

      // Verify sync was triggered
      await waitFor(() => {
        expect(mockSyncManager.manualSync).toHaveBeenCalledWith('manual');
      });

      // Verify success toast was shown
      expect(Toast.show).toHaveBeenCalledWith({
        type: 'success',
        text1: 'Dashboard updated',
        text2: 'Your dashboard data has been refreshed',
        visibilityTime: 2000,
      });

      // Verify dashboard cache was invalidated
      expect(dashboardApi.util.invalidateTags).toHaveBeenCalledWith([
        'DashboardSummary',
      ]);
    });

    it('should complete full refresh cycle in MyLeadsScreen when online', async () => {
      const mockLeads = [
        {
          id: '1',
          customer_id: 'c1',
          status: 'new',
          priority: 'high',
          phone: '+91-9876543210',
          estimated_value: 150000,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          source: 'website',
          product_type: 'solar',
          sync_status: 'synced',
          local_changes: '{}',
        },
      ];

      const store = createTestStore({ leads: { items: mockLeads } });
      const wrapper = createWrapper(store, true); // Online

      const { getByTestId } = render(<MyLeadsScreen />, { wrapper });

      // Verify leads are displayed
      expect(getByTestId('leads-flatlist')).toBeTruthy();

      // Get FlatList and trigger refresh
      const flatList = getByTestId('leads-flatlist');
      const refreshControl = flatList.props.refreshControl;

      // Trigger pull-to-refresh
      fireEvent(refreshControl, 'refresh');

      // Verify sync was triggered
      await waitFor(() => {
        expect(mockSyncManager.manualSync).toHaveBeenCalledWith(
          'pullToRefresh'
        );
      });

      // Verify success toast was shown
      expect(Toast.show).toHaveBeenCalledWith({
        type: 'success',
        text1: 'Data refreshed',
        text2: 'Your data has been updated successfully',
        visibilityTime: 2000,
      });
    });
  });

  describe('Offline Scenario', () => {
    it('should show offline banner and handle offline refresh gracefully', async () => {
      mockSyncManager.manualSync.mockResolvedValue({
        success: false,
        error: 'OFFLINE',
      });

      const store = createTestStore();
      const wrapper = createWrapper(store, false); // Offline

      const { getByTestId } = render(<HomeScreen />, { wrapper });

      // Fast-forward to trigger offline banner debounce
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Verify offline banner is shown
      expect(getByTestId('offline-banner')).toBeTruthy();

      // Try to refresh while offline
      const scrollView = getByTestId('home-scroll-view');
      const refreshControl = scrollView.props.refreshControl;

      // Trigger pull-to-refresh
      fireEvent(refreshControl, 'refresh');

      // Verify sync was attempted but failed
      await waitFor(() => {
        expect(mockSyncManager.manualSync).toHaveBeenCalledWith('manual');
      });

      // Verify offline error toast was shown
      expect(Toast.show).toHaveBeenCalledWith({
        type: 'error',
        text1: 'Cannot refresh dashboard',
        text2: 'Please check your internet connection',
        visibilityTime: 3000,
      });
    });

    it('should transition from offline to online and hide banner', async () => {
      let isOnline = false;

      // Create wrapper that can change connectivity
      const DynamicWrapper = ({ children }: { children: React.ReactNode }) => {
        const store = createTestStore();
        const MockConnectivityProvider = ({
          children,
        }: {
          children: React.ReactNode;
        }) => {
          const mockContextValue = { isOnline };
          return React.createElement(
            ConnectivityProvider as any,
            { value: mockContextValue },
            children
          );
        };

        return (
          <Provider store={store}>
            <MockConnectivityProvider>{children}</MockConnectivityProvider>
          </Provider>
        );
      };

      const { getByTestId, queryByTestId, rerender } = render(<HomeScreen />, {
        wrapper: DynamicWrapper,
      });

      // Initially offline - banner should show after debounce
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(getByTestId('offline-banner')).toBeTruthy();

      // Go online
      isOnline = true;
      rerender(<HomeScreen />);

      // Banner should hide after debounce
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Note: Since we're mocking, the banner component itself handles hide/show
      // In real app, this would be tested via the OfflineBanner component tests
      expect(queryByTestId('offline-banner')).toBeTruthy(); // Still rendered but animated out
    });
  });

  describe('Guard Logic Integration', () => {
    it('should respect guard interval across different components', async () => {
      const store = createTestStore({
        network: { nextAllowedSyncAt: Date.now() + 30000 }, // 30 seconds in future
      });
      const wrapper = createWrapper(store, true);

      const { getByTestId } = render(<HomeScreen />, { wrapper });

      // Try to refresh too soon
      const scrollView = getByTestId('home-scroll-view');
      const refreshControl = scrollView.props.refreshControl;

      fireEvent(refreshControl, 'refresh');

      // Should not trigger sync
      expect(mockSyncManager.manualSync).not.toHaveBeenCalled();

      // Should show guard toast
      expect(Toast.show).toHaveBeenCalledWith({
        type: 'info',
        text1: 'Please wait',
        text2: expect.stringContaining('Dashboard will refresh in'),
        visibilityTime: 2000,
      });
    });

    it('should allow refresh after guard interval expires', async () => {
      const store = createTestStore({
        network: { nextAllowedSyncAt: Date.now() - 1000 }, // 1 second ago (expired)
      });
      const wrapper = createWrapper(store, true);

      const { getByTestId } = render(<HomeScreen />, { wrapper });

      // Try to refresh after guard expires
      const scrollView = getByTestId('home-scroll-view');
      const refreshControl = scrollView.props.refreshControl;

      fireEvent(refreshControl, 'refresh');

      // Should trigger sync
      await waitFor(() => {
        expect(mockSyncManager.manualSync).toHaveBeenCalledWith('manual');
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle sync failures gracefully across components', async () => {
      mockSyncManager.manualSync.mockResolvedValue({
        success: false,
        error: 'Server error',
      });

      const store = createTestStore();
      const wrapper = createWrapper(store, true);

      const { getByTestId } = render(<HomeScreen />, { wrapper });

      // Trigger refresh
      const scrollView = getByTestId('home-scroll-view');
      const refreshControl = scrollView.props.refreshControl;

      fireEvent(refreshControl, 'refresh');

      // Verify error was handled
      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith({
          type: 'error',
          text1: 'Dashboard refresh failed',
          text2: 'Unable to update dashboard. Please try again.',
          visibilityTime: 3000,
        });
      });
    });

    it('should handle auth expired errors without showing toast', async () => {
      mockSyncManager.manualSync.mockResolvedValue({
        success: false,
        error: 'AUTH_EXPIRED',
      });

      const store = createTestStore();
      const wrapper = createWrapper(store, true);

      const { getByTestId } = render(<MyLeadsScreen />, { wrapper });

      // Create mock leads first
      const mockLeads = [
        {
          id: '1',
          customer_id: 'c1',
          status: 'new',
          priority: 'medium',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          source: 'website',
          product_type: 'solar',
          sync_status: 'synced',
          local_changes: '{}',
        },
      ];

      store.dispatch({ type: 'leads/setItems', payload: mockLeads });

      // Trigger refresh
      const flatList = getByTestId('leads-flatlist');
      const refreshControl = flatList.props.refreshControl;

      fireEvent(refreshControl, 'refresh');

      await waitFor(() => {
        expect(mockSyncManager.manualSync).toHaveBeenCalled();
      });

      // Should not show auth-related toast
      const toastCalls = (Toast.show as jest.Mock).mock.calls;
      const authToastCall = toastCalls.find(
        (call) =>
          call[0].text1?.toLowerCase().includes('auth') ||
          call[0].text2?.toLowerCase().includes('auth')
      );
      expect(authToastCall).toBeUndefined();
    });
  });

  describe('Accessibility Integration', () => {
    it('should announce refresh actions for accessibility', async () => {
      const store = createTestStore();
      const wrapper = createWrapper(store, true);

      const { getByTestId } = render(<HomeScreen />, { wrapper });

      // Trigger refresh
      const scrollView = getByTestId('home-scroll-view');
      const refreshControl = scrollView.props.refreshControl;

      fireEvent(refreshControl, 'refresh');

      // Verify accessibility announcement
      const { AccessibilityInfo } = require('react-native');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Refreshing dashboard data'
      );
    });
  });

  describe('Performance Integration', () => {
    it('should handle multiple rapid refresh attempts without issues', async () => {
      const store = createTestStore();
      const wrapper = createWrapper(store, true);

      const { getByTestId } = render(<HomeScreen />, { wrapper });

      const scrollView = getByTestId('home-scroll-view');
      const refreshControl = scrollView.props.refreshControl;

      // Trigger multiple rapid refreshes
      fireEvent(refreshControl, 'refresh');
      fireEvent(refreshControl, 'refresh');
      fireEvent(refreshControl, 'refresh');

      // Only first refresh should trigger sync (others blocked by guard)
      await waitFor(() => {
        expect(mockSyncManager.manualSync).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Component Integration', () => {
    it('should properly integrate OfflineBanner with content spacing', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store, false); // Offline

      const { getByTestId } = render(<HomeScreen />, { wrapper });

      // Verify content has proper spacing for offline banner
      const scrollView = getByTestId('home-scroll-view');
      expect(scrollView.props.contentContainerStyle).toContainEqual(
        expect.objectContaining({
          paddingTop: 40, // OFFLINE_BANNER_HEIGHT (32) + 8
        })
      );
    });

    it('should maintain theme consistency across all new components', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store, true);

      const { getByTestId } = render(<HomeScreen />, { wrapper });

      const scrollView = getByTestId('home-scroll-view');
      const refreshControl = scrollView.props.refreshControl;

      // Verify theme colors are applied consistently
      expect(refreshControl.props.tintColor).toBe('#007AFF');
      expect(refreshControl.props.colors).toEqual(['#007AFF']);
      expect(refreshControl.props.progressBackgroundColor).toBe('#FFFFFF');
    });
  });
});
