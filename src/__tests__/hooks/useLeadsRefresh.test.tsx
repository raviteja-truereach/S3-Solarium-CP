/**
 * useLeadsRefresh Hook Tests - Fixed version
 */

import { renderHook, act, waitFor } from '@testing-library/react-native'; // Changed from react
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useLeadsRefresh } from '../../hooks/useLeadsRefresh';
import leadSliceReducer from '../../store/slices/leadSlice';

// Mock React Native dependencies
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  configure: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => jest.fn()),
  useNetInfo: jest.fn(() => ({ isConnected: true })),
}));

// Mock SyncManager
const mockManualSync = jest.fn();
jest.mock('../../services/SyncManager', () => ({
  SyncManager: {
    manualSync: mockManualSync,
  },
}));

// Mock ConnectivityContext
const mockUseConnectivity = jest.fn();
jest.mock('../../contexts/ConnectivityContext', () => ({
  useConnectivity: () => mockUseConnectivity(),
}));

// Mock leadApi
const mockLeadApiInitiate = jest.fn();
jest.mock('../../store/api/leadApi', () => ({
  leadApi: {
    endpoints: {
      getLeads: {
        initiate: mockLeadApiInitiate,
      },
    },
  },
}));

// Create test store
const createTestStore = () => {
  return configureStore({
    reducer: { lead: leadSliceReducer },
    preloadedState: {
      lead: {
        items: {},
        pagesLoaded: [],
        totalPages: 0,
        totalCount: 0,
        lastSync: null,
        isLoading: false,
        loadingNext: false,
        hasMore: true,
        error: null,
        filters: {},
      },
    },
  });
};

// Test wrapper
const renderHookWithProvider = (hook: any, store = createTestStore()) => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(hook, { wrapper });
};

describe('useLeadsRefresh Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mocks
    mockUseConnectivity.mockReturnValue({ isOnline: true });
    mockManualSync.mockResolvedValue(undefined);

    // Mock leadAPI initiate
    mockLeadApiInitiate.mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({
        items: [
          { id: 'LEAD-001', customerName: 'Test Customer 1' },
          { id: 'LEAD-002', customerName: 'Test Customer 2' },
        ],
        totalCount: 2,
      }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should return initial state correctly', () => {
      const { result } = renderHookWithProvider(() => useLeadsRefresh());

      expect(result.current.refreshing).toBe(false);
      expect(result.current.lastRefresh).toBe(null);
      expect(result.current.isThrottled).toBe(false);
      expect(result.current.throttleRemaining).toBe(0);
      expect(typeof result.current.onRefresh).toBe('function');
    });
  });

  describe('Successful Refresh', () => {
    it('should call SyncManager.manualSync and re-hydrate cache', async () => {
      const { result } = renderHookWithProvider(() => useLeadsRefresh());

      await act(async () => {
        await result.current.onRefresh();
      });

      expect(mockManualSync).toHaveBeenCalledWith('manual');
      expect(mockLeadApiInitiate).toHaveBeenCalledWith({
        offset: 0,
        limit: 100,
        forceRefresh: true,
      });

      expect(result.current.refreshing).toBe(false);
      expect(result.current.lastRefresh).toBeInstanceOf(Date);
    });

    it('should set refreshing state during sync', async () => {
      let resolveSync: () => void;
      const syncPromise = new Promise<void>((resolve) => {
        resolveSync = resolve;
      });
      mockManualSync.mockReturnValue(syncPromise);

      const { result } = renderHookWithProvider(() => useLeadsRefresh());

      // Start refresh (don't await)
      act(() => {
        result.current.onRefresh();
      });

      // Should be refreshing
      expect(result.current.refreshing).toBe(true);

      // Complete sync
      act(() => {
        resolveSync!();
      });

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle SyncManager errors gracefully', async () => {
      const syncError = new Error('Sync failed');
      mockManualSync.mockRejectedValue(syncError);

      const { result } = renderHookWithProvider(() => useLeadsRefresh());

      await act(async () => {
        await result.current.onRefresh();
      });

      expect(result.current.refreshing).toBe(false);
      expect(result.current.lastRefresh).toBe(null); // Should not update on error
    });
  });

  describe('Throttling', () => {
    it('should throttle subsequent refreshes within 30 seconds', async () => {
      const { result } = renderHookWithProvider(() => useLeadsRefresh());

      // First refresh
      await act(async () => {
        await result.current.onRefresh();
      });

      expect(mockManualSync).toHaveBeenCalledTimes(1);
      expect(result.current.isThrottled).toBe(true);
      expect(result.current.throttleRemaining).toBeGreaterThan(0);

      // Second refresh (should be throttled)
      await act(async () => {
        await result.current.onRefresh();
      });

      expect(mockManualSync).toHaveBeenCalledTimes(1); // Still 1
    });
  });

  describe('Offline Handling', () => {
    it('should not sync when offline', async () => {
      mockUseConnectivity.mockReturnValue({ isOnline: false });

      const { result } = renderHookWithProvider(() => useLeadsRefresh());

      await act(async () => {
        await result.current.onRefresh();
      });

      expect(mockManualSync).not.toHaveBeenCalled();
      expect(result.current.refreshing).toBe(false);
    });
  });
});
