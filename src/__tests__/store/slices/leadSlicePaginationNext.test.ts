/**
 * Lead Slice Pagination Enhancement Tests
 * Tests for new pagination features: loadingNext, hasMore, and related actions
 */
import leadSliceReducer, {
  startNextPageLoad,
  finishNextPageLoad,
  resetPagination,
  upsertLeads,
  type LeadState,
} from '../../../store/slices/leadSlice';
import {
  selectPaginationMeta,
  selectPaginationLoading,
  selectCanLoadMore,
} from '../../../store/selectors/leadSelectors';
import type { RootState } from '../../../store';

// Mock lead data
const mockLead = {
  id: 'LEAD-001',
  customer_id: 'CUST-001',
  status: 'New Lead',
  priority: 'medium' as const,
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
  sync_status: 'synced' as const,
  local_changes: '{}',
  customerName: 'Test Customer',
  assignedTo: 'CP-001',
  services: ['SRV-001'],
};

describe('Lead Slice Pagination Enhancements', () => {
  const initialState: LeadState = {
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
  };

  describe('startNextPageLoad', () => {
    it('should set loadingNext to true and clear error', () => {
      const stateWithError = {
        ...initialState,
        error: 'Previous error',
      };

      const result = leadSliceReducer(stateWithError, startNextPageLoad());

      expect(result.loadingNext).toBe(true);
      expect(result.error).toBe(null);
    });
  });

  describe('finishNextPageLoad', () => {
    it('should handle successful next page load', () => {
      const stateWithLoading = {
        ...initialState,
        loadingNext: true,
        totalPages: 5,
      };

      const result = leadSliceReducer(
        stateWithLoading,
        finishNextPageLoad({
          page: 2,
          totalPages: 5,
          success: true,
        })
      );

      expect(result.loadingNext).toBe(false);
      expect(result.hasMore).toBe(true); // page 2 < totalPages 5
      expect(result.error).toBe(null);
    });

    it('should set hasMore to false when last page is loaded', () => {
      const stateWithLoading = {
        ...initialState,
        loadingNext: true,
        totalPages: 3,
      };

      const result = leadSliceReducer(
        stateWithLoading,
        finishNextPageLoad({
          page: 3,
          totalPages: 3,
          success: true,
        })
      );

      expect(result.loadingNext).toBe(false);
      expect(result.hasMore).toBe(false); // page 3 === totalPages 3
    });

    it('should handle failed next page load', () => {
      const stateWithLoading = {
        ...initialState,
        loadingNext: true,
      };

      const result = leadSliceReducer(
        stateWithLoading,
        finishNextPageLoad({
          page: 2,
          totalPages: 5,
          success: false,
          error: 'Network error',
        })
      );

      expect(result.loadingNext).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.hasMore).toBe(true); // Should remain unchanged on failure
    });
  });

  describe('resetPagination', () => {
    it('should reset all pagination state', () => {
      const stateWithData = {
        ...initialState,
        pagesLoaded: [1, 2],
        totalPages: 5,
        loadingNext: true,
        hasMore: false,
        error: 'Some error',
      };

      const result = leadSliceReducer(stateWithData, resetPagination());

      expect(result.pagesLoaded).toEqual([]);
      expect(result.totalPages).toBe(0);
      expect(result.loadingNext).toBe(false);
      expect(result.hasMore).toBe(true);
      expect(result.error).toBe(null);
    });
  });

  describe('Integration with upsertLeads', () => {
    it('should maintain pagination state when upserting leads', () => {
      const stateWithPagination = {
        ...initialState,
        pagesLoaded: [1],
        totalPages: 3,
        hasMore: true,
        loadingNext: false,
      };

      const result = leadSliceReducer(
        stateWithPagination,
        upsertLeads({
          items: [mockLead],
          page: 2,
          totalPages: 3,
          totalCount: 50,
        })
      );

      expect(result.pagesLoaded).toContain(1);
      expect(result.pagesLoaded).toContain(2);
      expect(result.totalPages).toBe(3);
      expect(result.hasMore).toBe(true); // Should be preserved
    });
  });
});

describe('Enhanced Pagination Selectors', () => {
  const createMockState = (
    leadState: Partial<LeadState>
  ): { lead: LeadState } => ({
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
      ...leadState,
    },
  });

  describe('selectPaginationMeta', () => {
    it('should return enhanced pagination metadata', () => {
      const state = createMockState({
        pagesLoaded: [1, 2],
        totalPages: 5,
        totalCount: 100,
        loadingNext: true,
        hasMore: true,
      });

      const result = selectPaginationMeta(state as RootState);

      expect(result).toEqual({
        pagesLoaded: [1, 2],
        totalPages: 5,
        totalCount: 100,
        loadingNext: true,
        hasMore: true,
        isPageLoaded: expect.any(Function),
      });

      expect(result.isPageLoaded(1)).toBe(true);
      expect(result.isPageLoaded(3)).toBe(false);
    });
  });

  describe('selectPaginationLoading', () => {
    it('should return loading states', () => {
      const state = createMockState({
        isLoading: false,
        loadingNext: true,
      });

      const result = selectPaginationLoading(state as RootState);

      expect(result).toEqual({
        isLoading: false,
        loadingNext: true,
        isAnyLoading: true,
      });
    });

    it('should handle first page loading', () => {
      const state = createMockState({
        isLoading: true,
        loadingNext: false,
      });

      const result = selectPaginationLoading(state as RootState);

      expect(result).toEqual({
        isLoading: true,
        loadingNext: false,
        isAnyLoading: true,
      });
    });
  });

  describe('selectCanLoadMore', () => {
    it('should return true when can load more', () => {
      const state = createMockState({
        hasMore: true,
        loadingNext: false,
        isLoading: false,
      });

      const result = selectCanLoadMore(state as RootState);
      expect(result).toBe(true);
    });

    it('should return false when no more pages', () => {
      const state = createMockState({
        hasMore: false,
        loadingNext: false,
        isLoading: false,
      });

      const result = selectCanLoadMore(state as RootState);
      expect(result).toBe(false);
    });

    it('should return false when loading next page', () => {
      const state = createMockState({
        hasMore: true,
        loadingNext: true,
        isLoading: false,
      });

      const result = selectCanLoadMore(state as RootState);
      expect(result).toBe(false);
    });

    it('should return false when loading first page', () => {
      const state = createMockState({
        hasMore: true,
        loadingNext: false,
        isLoading: true,
      });

      const result = selectCanLoadMore(state as RootState);
      expect(result).toBe(false);
    });
  });
});
