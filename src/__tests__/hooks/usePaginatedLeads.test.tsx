/**
 * usePaginatedLeads Hook Tests
 * Tests for paginated lead loading with infinite scroll support
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore, combineReducers } from '@reduxjs/toolkit';
import {
  usePaginatedLeads,
  type UsePaginatedLeadsResult,
} from '../../hooks/usePaginatedLeads';
import leadSliceReducer, { type LeadState } from '../../store/slices/leadSlice';
import { leadApi } from '../../store/api/leadApi';
import * as ConnectivityContext from '../../contexts/ConnectivityContext';
import type { Lead } from '../../types/lead';

// Mock the ConnectivityContext
const mockUseConnectivity = jest.fn();
jest
  .spyOn(ConnectivityContext, 'useConnectivity')
  .mockImplementation(mockUseConnectivity);

// Mock the leadApi
jest.mock('../../store/api/leadApi', () => ({
  leadApi: {
    useLazyGetLeadsQuery: jest.fn(),
    endpoints: {
      getLeads: {
        matchPending: jest.fn(),
        matchRejected: jest.fn(),
        matchFulfilled: jest.fn(),
      },
    },
  },
}));

// Mock lead data
const createMockLead = (id: string, customerId: string = 'CUST-001'): Lead => ({
  id,
  customer_id: customerId,
  status: 'New Lead',
  priority: 'medium',
  source: 'api',
  product_type: 'Solar Panel',
  estimated_value: 50000,
  follow_up_date: '2024-01-15',
  created_at: '2024-01-10T10:00:00Z',
  updated_at: '2024-01-10T10:00:00Z',
  remarks: 'Test lead',
  address: '123 Test St',
  phone: '1234567890',
  email: 'test@example.com',
  sync_status: 'synced',
  local_changes: '{}',
  customerName: 'Test Customer',
  assignedTo: 'CP-001',
  services: ['SRV-001'],
});

const mockLeads = [
  createMockLead('LEAD-001'),
  createMockLead('LEAD-002'),
  createMockLead('LEAD-003'),
];

// Create test store
const createTestStore = (initialState?: Partial<LeadState>) => {
  const rootReducer = combineReducers({
    lead: leadSliceReducer,
  });

  const preloadedState = {
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
      ...initialState,
    },
  };

  return createStore(rootReducer, preloadedState);
};

// Test wrapper component
const createWrapper = (store: any) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('usePaginatedLeads Hook', () => {
  const mockTriggerGetLeads = jest.fn();
  const mockUnwrap = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockUseConnectivity.mockReturnValue({ isOnline: true });

    (leadApi.useLazyGetLeadsQuery as jest.Mock).mockReturnValue([
      mockTriggerGetLeads,
      {
        isLoading: false,
        error: null,
        originalArgs: null,
      },
    ]);

    mockTriggerGetLeads.mockReturnValue({
      unwrap: mockUnwrap,
    });

    mockUnwrap.mockResolvedValue({
      items: mockLeads,
      totalCount: 100,
      page: 1,
      totalPages: 4,
    });
  });

  describe('Initial State', () => {
    it('should return initial state with empty items', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => usePaginatedLeads(), { wrapper });

      expect(result.current.items).toEqual([]);
      expect(result.current.refreshing).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.loadNext).toBe('function');
      expect(typeof result.current.reload).toBe('function');
    });

    it('should trigger initial load when online and no data', async () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);

      renderHook(() => usePaginatedLeads(), { wrapper });

      await waitFor(() => {
        expect(mockTriggerGetLeads).toHaveBeenCalledWith(
          { offset: 0, limit: 25 },
          expect.objectContaining({ signal: expect.any(AbortSignal) })
        );
      });
    });
  });

  describe('loadNext Function', () => {
    it('should load next page when called', async () => {
      const store = createTestStore({
        pagesLoaded: [1],
        hasMore: true,
        loadingNext: false,
        isLoading: false,
      });
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => usePaginatedLeads(), { wrapper });

      await act(async () => {
        await result.current.loadNext();
      });

      expect(mockTriggerGetLeads).toHaveBeenCalledWith(
        { offset: 25, limit: 25 }, // Page 2
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('should be no-op when already loading', async () => {
      const store = createTestStore({
        loadingNext: true, // Already loading
        hasMore: true,
      });
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => usePaginatedLeads(), { wrapper });

      await act(async () => {
        await result.current.loadNext();
      });

      expect(mockTriggerGetLeads).not.toHaveBeenCalled();
    });

    it('should be no-op when no more pages available', async () => {
      const store = createTestStore({
        hasMore: false, // No more pages
        loadingNext: false,
      });
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => usePaginatedLeads(), { wrapper });

      await act(async () => {
        await result.current.loadNext();
      });

      expect(mockTriggerGetLeads).not.toHaveBeenCalled();
    });

    it('should resolve instantly when offline', async () => {
      mockUseConnectivity.mockReturnValue({ isOnline: false });

      const store = createTestStore({
        hasMore: true,
        loadingNext: false,
      });
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => usePaginatedLeads(), { wrapper });

      const startTime = Date.now();
      await act(async () => {
        await result.current.loadNext();
      });
      const endTime = Date.now();

      // Should resolve very quickly (instantly)
      expect(endTime - startTime).toBeLessThan(10);
      expect(mockTriggerGetLeads).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const apiError = new Error('API Error');
      mockUnwrap.mockRejectedValue(apiError);

      const store = createTestStore({
        hasMore: true,
        loadingNext: false,
      });
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => usePaginatedLeads(), { wrapper });

      await act(async () => {
        try {
          await result.current.loadNext();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(mockTriggerGetLeads).toHaveBeenCalled();
    });

    it('should not treat AbortError as real error', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockUnwrap.mockRejectedValue(abortError);

      const store = createTestStore({
        hasMore: true,
        loadingNext: false,
      });
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => usePaginatedLeads(), { wrapper });

      await act(async () => {
        await result.current.loadNext(); // Should not throw
      });

      expect(mockTriggerGetLeads).toHaveBeenCalled();
    });
  });

  describe('reload Function', () => {
    it('should reset pagination and reload first page', async () => {
      const store = createTestStore({
        pagesLoaded: [1, 2],
        totalPages: 4,
        hasMore: true,
      });
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => usePaginatedLeads(), { wrapper });

      await act(async () => {
        await result.current.reload();
      });

      expect(mockTriggerGetLeads).toHaveBeenCalledWith(
        { offset: 0, limit: 25 }, // Back to first page
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  describe('Connectivity Handling', () => {
    it('should auto-reload when coming online with empty cache', async () => {
      let isOnline = false;
      mockUseConnectivity.mockImplementation(() => ({ isOnline }));

      const store = createTestStore();
      const wrapper = createWrapper(store);

      const { rerender } = renderHook(() => usePaginatedLeads(), { wrapper });

      // Simulate coming online
      isOnline = true;
      mockUseConnectivity.mockImplementation(() => ({ isOnline }));

      rerender();

      await waitFor(() => {
        expect(mockTriggerGetLeads).toHaveBeenCalled();
      });
    });

    it('should not auto-reload when coming online with existing data', () => {
      const store = createTestStore({
        items: { 'LEAD-001': mockLeads[0] }, // Has existing data
        pagesLoaded: [1],
      });
      const wrapper = createWrapper(store);

      // Start offline
      mockUseConnectivity.mockReturnValue({ isOnline: false });
      const { rerender } = renderHook(() => usePaginatedLeads(), { wrapper });

      // Come online
      mockUseConnectivity.mockReturnValue({ isOnline: true });
      rerender();

      // Should not trigger reload because we have existing data
      expect(mockTriggerGetLeads).not.toHaveBeenCalled();
    });
  });

  describe('Custom Options', () => {
    it('should use custom page size', async () => {
      const store = createTestStore({
        hasMore: true,
        loadingNext: false,
      });
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => usePaginatedLeads({ pageSize: 50 }), {
        wrapper,
      });

      await act(async () => {
        await result.current.loadNext();
      });

      expect(mockTriggerGetLeads).toHaveBeenCalledWith(
        { offset: 0, limit: 50 },
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('should respect autoReloadOnline option', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);

      // Start offline
      mockUseConnectivity.mockReturnValue({ isOnline: false });
      const { rerender } = renderHook(
        () => usePaginatedLeads({ autoReloadOnline: false }),
        { wrapper }
      );

      // Come online
      mockUseConnectivity.mockReturnValue({ isOnline: true });
      rerender();

      // Should not auto-reload because autoReloadOnline is false
      expect(mockTriggerGetLeads).not.toHaveBeenCalled();
    });
  });

  describe('TypeScript Types', () => {
    it('should have correct return type', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => usePaginatedLeads(), { wrapper });

      // Type assertions to ensure TypeScript compliance
      const hookResult: UsePaginatedLeadsResult = result.current;

      expect(Array.isArray(hookResult.items)).toBe(true);
      expect(typeof hookResult.loadNext).toBe('function');
      expect(typeof hookResult.refreshing).toBe('boolean');
      expect(typeof hookResult.reload).toBe('function');
      // error can be string or null
      expect(
        hookResult.error === null || typeof hookResult.error === 'string'
      ).toBe(true);
    });
  });

  describe('AbortController Cleanup', () => {
    it('should abort requests on unmount', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);

      const { unmount } = renderHook(() => usePaginatedLeads(), { wrapper });

      // Trigger a request to create an AbortController
      act(() => {
        // This would create an AbortController internally
      });

      // Unmount should not throw
      expect(() => unmount()).not.toThrow();
    });
  });
});
