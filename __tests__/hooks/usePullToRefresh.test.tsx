/**
 * usePullToRefresh Hook Tests
 * Tests sync triggering, guard logic, and state management
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Toast from 'react-native-toast-message';
import { AccessibilityInfo } from 'react-native';
import { usePullToRefresh } from '../../src/hooks/usePullToRefresh';
import { SyncManager } from '../../src/sync/SyncManager';
import networkSlice from '../../src/store/slices/networkSlice';
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

// Test store setup
const createTestStore = (initialState = {}) => {
  return configureStore({
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
        ...initialState,
      },
    },
  });
};

// Test wrapper component
const createWrapper =
  (store: any) =>
  ({ children }: { children: React.ReactNode }) =>
    <Provider store={store}>{children}</Provider>;

describe('usePullToRefresh', () => {
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
      const { result } = renderHook(() => usePullToRefresh(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.refreshing).toBe(false);
      expect(result.current.nextAllowedSyncAt).toBe(0);
      expect(typeof result.current.onRefresh).toBe('function');
    });

    it('should reflect sync in progress state', () => {
      const store = createTestStore({ syncInProgress: true });
      const { result } = renderHook(() => usePullToRefresh(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.refreshing).toBe(true);
    });
  });

  describe('Sync Guard Logic', () => {
    it('should allow sync when guard time has passed', async () => {
      const now = Date.now();
      const store = createTestStore({ nextAllowedSyncAt: now - 1000 });

      const { result } = renderHook(() => usePullToRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      expect(mockSyncManager.manualSync).toHaveBeenCalledWith('pullToRefresh');
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Refreshing data'
      );
    });

    it('should block sync when within guard interval', async () => {
      const now = Date.now();
      const futureTime = now + SYNC_GUARD_MS;
      const store = createTestStore({ nextAllowedSyncAt: futureTime });

      const { result } = renderHook(() => usePullToRefresh(), {
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

    it('should calculate correct wait time in guard message', async () => {
      const now = Date.now();
      const futureTime = now + 15000; // 15 seconds in future
      const store = createTestStore({ nextAllowedSyncAt: futureTime });

      // Mock Date.now to return consistent value
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const { result } = renderHook(() => usePullToRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      expect(Toast.show).toHaveBeenCalledWith({
        type: 'info',
        text1: 'Please wait',
        text2: 'Try again in 15 seconds',
        visibilityTime: 2000,
      });
    });
  });

  describe('Successful Sync', () => {
    it('should dispatch correct actions on successful sync', async () => {
      const store = createTestStore();
      const { result } = renderHook(() => usePullToRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      await waitFor(() => {
        expect(mockSyncManager.manualSync).toHaveBeenCalledWith(
          'pullToRefresh'
        );
      });

      // Check store state
      const state = store.getState();
      expect(state.network.syncInProgress).toBe(false);
      expect(state.network.lastError).toBe(null);
    });

    it('should show success toast on completion', async () => {
      const store = createTestStore();
      const { result } = renderHook(() => usePullToRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith({
          type: 'success',
          text1: 'Data refreshed',
          text2: 'Your data has been updated',
          visibilityTime: 2000,
        });
      });
    });

    it('should update next allowed sync time', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const store = createTestStore();
      const { result } = renderHook(() => usePullToRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      const state = store.getState();
      expect(state.network.nextAllowedSyncAt).toBe(now + SYNC_GUARD_MS);
    });
  });

  describe('Failed Sync', () => {
    it('should handle sync failure correctly', async () => {
      mockSyncManager.manualSync.mockResolvedValue({
        success: false,
        error: 'Network error',
        duration: 500,
        completedAt: Date.now(),
      });

      const store = createTestStore();
      const { result } = renderHook(() => usePullToRefresh(), {
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

    it('should handle offline error specifically', async () => {
      mockSyncManager.manualSync.mockResolvedValue({
        success: false,
        error: 'OFFLINE',
        duration: 100,
        completedAt: Date.now(),
      });

      const store = createTestStore();
      const { result } = renderHook(() => usePullToRefresh(), {
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

    it('should not show toast for auth failures', async () => {
      mockSyncManager.manualSync.mockResolvedValue({
        success: false,
        error: 'AUTH_EXPIRED',
        duration: 100,
        completedAt: Date.now(),
      });

      const store = createTestStore();
      const { result } = renderHook(() => usePullToRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      await waitFor(() => {
        expect(mockSyncManager.manualSync).toHaveBeenCalled();
      });

      // Should not show toast for auth failures (handled by error middleware)
      expect(Toast.show).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
        })
      );
    });

    it('should handle unexpected errors', async () => {
      mockSyncManager.manualSync.mockRejectedValue(
        new Error('Unexpected error')
      );

      const store = createTestStore();
      const { result } = renderHook(() => usePullToRefresh(), {
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

  describe('Accessibility', () => {
    it('should announce refresh start for screen readers', async () => {
      const store = createTestStore();
      const { result } = renderHook(() => usePullToRefresh(), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        result.current.onRefresh();
      });

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Refreshing data'
      );
    });
  });

  describe('Hook Stability', () => {
    it('should maintain stable onRefresh reference', () => {
      const store = createTestStore();
      const { result, rerender } = renderHook(() => usePullToRefresh(), {
        wrapper: createWrapper(store),
      });

      const firstOnRefresh = result.current.onRefresh;

      rerender();

      const secondOnRefresh = result.current.onRefresh;

      // onRefresh should be stable unless dependencies change
      expect(firstOnRefresh).toBe(secondOnRefresh);
    });
  });
});
