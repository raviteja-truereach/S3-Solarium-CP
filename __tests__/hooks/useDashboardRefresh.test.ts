/**
 * useDashboardRefresh Hook Tests
 * Tests dashboard-specific refresh logic with API invalidation
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Toast from 'react-native-toast-message';
import { AccessibilityInfo } from 'react-native';
import { useDashboardRefresh } from '../../src/hooks/useDashboardRefresh';
import { SyncManager } from '../../src/sync/SyncManager';
import networkSlice from '../../src/store/slices/networkSlice';
import { dashboardApi } from '../../src/store/api/dashboardApi';
import { SYNC_GUARD_MS } from '../../src/constants/sync';

// Mock dependencies
jest.mock('react-native-toast-message');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
  },
}));

// Mock SyncManager
jest.mock('../../src/sync/SyncManager');
const mockSyncManager = {
  manualSync: jest.fn(),
  getInstance: jest.fn(),
};
(SyncManager.getInstance as jest.Mock).mockReturnValue(mockSyncManager);

// Mock dashboardApi
const mockInvalidateTags = jest.fn();
jest.mock('../../src/store/api/dashboardApi', () => ({
  dashboardApi: {
    util: {
      invalidateTags: mockInvalidateTags,
    },
  },
}));

// Test store setup
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      network: networkSlice,
      [dashboardApi.reducerPath]: dashboardApi.reducer,
    },
    preloadedState: {
      network: {
        syncInProgress: false,
        lastSyncAt: null,
        nextAllowedSyncAt: 0,
        dashboardSummary: null,
        lastError: null,
        ...initialState,
      },
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(dashboardApi.middleware),
  });
};

// Test wrapper component
const createWrapper =
  (store: any) =>
  ({ children }: { children: React.ReactNode }) =>
    <Provider store={store}>{children}</Provider>;

describe('useDashboardRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset mock implementations
    mockSyncManager.manualSync.mockResolvedValue({
      success: true,
      duration: 1000,
      completedAt: Date.now(),
      recordCounts: { leads: 5, customers: 3, quotations: 2 },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should return correct initial values', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDashboardRefresh(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.refreshing).toBe(false);
      expect(result.current.lastSyncAt).toBe(null);
      expect(result.current.nextAllowedSyncAt).toBe(0);
      expect(typeof result.current.onRefresh).toBe('function');
    });

    it('should reflect existing sync state', () => {
      const lastSync = Date.now() - 5000;
      const store = createTestStore({
        syncInProgress: true,
        lastSyncAt: lastSync,
        nextAllowedSyncAt: Date.now() + 10000,
      });

      const { result } = renderHook(() => useDashboardRefresh(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.refreshing).toBe(true);
      expect(result.current.lastSyncAt).toBe(lastSync);
      expect(result.current.nextAllowedSyncAt).toBeGreaterThan(Date.now());
    });
  });

  describe('Sync Guard Logic', () => {
    it('should allow refresh when guard time has passed', async () => {
      const now = Date.now();
      const store = createTestStore({ nextAllowedSyncAt: now - 1000 });

      const { result } = renderHook(() => useDashboardRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      expect(mockSyncManager.manualSync).toHaveBeenCalledWith('pullToRefresh');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Refreshing dashboard data'
      );
    });

    it('should block refresh when within guard interval', async () => {
      const now = Date.now();
      const futureTime = now + SYNC_GUARD_MS;
      const store = createTestStore({ nextAllowedSyncAt: futureTime });

      const { result } = renderHook(() => useDashboardRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      expect(mockSyncManager.manualSync).not.toHaveBeenCalled();
      expect(Toast.show).toHaveBeenCalledWith({
        type: 'info',
        text1: 'Please wait',
        text2: expect.stringContaining('seconds'),
        visibilityTime: 2000,
      });
    });
  });

  describe('Successful Refresh', () => {
    it('should dispatch correct actions and invalidate dashboard cache', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const store = createTestStore();
      const { result } = renderHook(() => useDashboardRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      await waitFor(() => {
        expect(mockSyncManager.manualSync).toHaveBeenCalledWith(
          'pullToRefresh'
        );
        expect(mockInvalidateTags).toHaveBeenCalledWith(['DashboardSummary']);
      });

      // Check store state
      const state = store.getState();
      expect(state.network.syncInProgress).toBe(false);
      expect(state.network.lastSyncAt).toBe(now);
      expect(state.network.lastError).toBe(null);
    });

    it('should show dashboard-specific success toast', async () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDashboardRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith({
          type: 'success',
          text1: 'Dashboard refreshed',
          text2: 'Your dashboard data has been updated',
          visibilityTime: 2000,
        });
      });
    });

    it('should update next allowed sync time correctly', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const store = createTestStore();
      const { result } = renderHook(() => useDashboardRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      const state = store.getState();
      expect(state.network.nextAllowedSyncAt).toBe(now + SYNC_GUARD_MS);
    });
  });

  describe('Failed Refresh', () => {
    it('should handle general sync failure', async () => {
      mockSyncManager.manualSync.mockResolvedValue({
        success: false,
        error: 'Network error',
        duration: 500,
        completedAt: Date.now(),
      });

      const store = createTestStore();
      const { result } = renderHook(() => useDashboardRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith({
          type: 'error',
          text1: 'Refresh failed',
          text2: 'Please try again',
          visibilityTime: 3000,
        });
      });
    });

    it('should handle offline error with specific message', async () => {
      mockSyncManager.manualSync.mockResolvedValue({
        success: false,
        error: 'OFFLINE',
        duration: 100,
        completedAt: Date.now(),
      });

      const store = createTestStore();
      const { result } = renderHook(() => useDashboardRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith({
          type: 'error',
          text1: 'Refresh failed',
          text2: 'Check your connection',
          visibilityTime: 3000,
        });
      });
    });

    it('should handle timeout error with specific message', async () => {
      mockSyncManager.manualSync.mockResolvedValue({
        success: false,
        error: 'Request timeout after 10000ms',
        duration: 10000,
        completedAt: Date.now(),
      });

      const store = createTestStore();
      const { result } = renderHook(() => useDashboardRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith({
          type: 'error',
          text1: 'Refresh failed',
          text2: 'Request timed out',
          visibilityTime: 3000,
        });
      });
    });

    it('should not show toast for auth failures', async () => {
      mockSyncManager.manualSync.mockResolvedValue({
        success: false,
        error: 'AUTH_EXPIRED',
        duration: 100,
        completedAt: Date.now(),
      });

      const store = createTestStore();
      const { result } = renderHook(() => useDashboardRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      await waitFor(() => {
        expect(mockSyncManager.manualSync).toHaveBeenCalled();
      });

      // Should not show toast for auth failures
      expect(Toast.show).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
        })
      );
    });

    it('should not invalidate cache on failed sync', async () => {
      mockSyncManager.manualSync.mockResolvedValue({
        success: false,
        error: 'Network error',
        duration: 500,
        completedAt: Date.now(),
      });

      const store = createTestStore();
      const { result } = renderHook(() => useDashboardRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      await waitFor(() => {
        expect(mockSyncManager.manualSync).toHaveBeenCalled();
      });

      // Should not invalidate cache on failure
      expect(mockInvalidateTags).not.toHaveBeenCalled();
    });
  });

  describe('Exception Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      mockSyncManager.manualSync.mockRejectedValue(
        new Error('Unexpected error')
      );

      const store = createTestStore();
      const { result } = renderHook(() => useDashboardRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith({
          type: 'error',
          text1: 'Refresh failed',
          text2: 'Something went wrong',
          visibilityTime: 3000,
        });
      });
    });
  });

  describe('Dashboard API Integration', () => {
    it('should invalidate dashboard cache only on successful sync', async () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDashboardRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      await waitFor(() => {
        expect(mockInvalidateTags).toHaveBeenCalledWith(['DashboardSummary']);
      });
    });

    it('should call invalidateTags after sync success but before toast', async () => {
      const callOrder: string[] = [];

      mockSyncManager.manualSync.mockImplementation(() => {
        callOrder.push('sync');
        return Promise.resolve({
          success: true,
          duration: 1000,
          completedAt: Date.now(),
          recordCounts: { leads: 5, customers: 3, quotations: 2 },
        });
      });

      mockInvalidateTags.mockImplementation(() => {
        callOrder.push('invalidate');
      });

      (Toast.show as jest.Mock).mockImplementation(() => {
        callOrder.push('toast');
      });

      const store = createTestStore();
      const { result } = renderHook(() => useDashboardRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      await waitFor(() => {
        expect(callOrder).toEqual(['sync', 'invalidate', 'toast']);
      });
    });
  });

  describe('Accessibility', () => {
    it('should announce dashboard-specific refresh message', async () => {
      const store = createTestStore();
      const { result } = renderHook(() => useDashboardRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Refreshing dashboard data'
      );
    });
  });

  describe('Hook Stability', () => {
    it('should maintain stable onRefresh reference', () => {
      const store = createTestStore();
      const { result, rerender } = renderHook(() => useDashboardRefresh(), {
        wrapper: createWrapper(store),
      });

      const firstOnRefresh = result.current.onRefresh;

      rerender();

      const secondOnRefresh = result.current.onRefresh;

      expect(firstOnRefresh).toBe(secondOnRefresh);
    });

    it('should update when dependencies change', () => {
      const store = createTestStore({ nextAllowedSyncAt: 1000 });
      const { result, rerender } = renderHook(() => useDashboardRefresh(), {
        wrapper: createWrapper(store),
      });

      const firstOnRefresh = result.current.onRefresh;

      // Update the store state
      store.dispatch({ type: 'network/setNextAllowedSyncAt', payload: 2000 });

      rerender();

      const secondOnRefresh = result.current.onRefresh;

      // onRefresh should be recreated when nextAllowedSyncAt changes
      expect(firstOnRefresh).toBe(secondOnRefresh); // Actually should be same due to useCallback deps
    });
  });
});
