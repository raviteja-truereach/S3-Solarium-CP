/**
 * Commission Slice - Enhanced with Pagination Pattern
 * Manages commission state following the exact same pattern as customerSlice
 * Only manages search/filters - pagination handled by RTK Query
 */
import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type {
  Commission,
  CommissionKPIStats,
} from '../../database/models/Commission';
import { commissionApi } from '../api/commissionApi';
import { getCurrentYearRange } from '../../utils/dateHelpers';

/**
 * Commission filter interface
 */
export interface CommissionFilters {
  dateRange?: { startDate: string; endDate: string };
  statuses?: string[];
  leadId?: string;
}

/**
 * Enhanced Commission state interface (following customer pattern)
 */
export interface CommissionState {
  /** Normalized commission items by ID */
  items: Record<string, Commission>;

  /** Array of page numbers that have been loaded */
  pagesLoaded: number[];

  /** Total number of pages available */
  totalPages: number;

  /** Total count of commissions across all pages */
  totalCount: number;

  /** Whether currently loading next page */
  loadingNext: boolean;

  /** Whether more pages are available for loading */
  hasMore: boolean;

  /** Last synchronization timestamp */
  lastSync: number | null;

  /** Loading state indicator */
  isLoading: boolean;

  /** Error message if any */
  error: string | null;

  /** Current search term */
  searchTerm: string;

  /** Current filter criteria */
  filters: CommissionFilters;

  /** Cached KPI totals */
  kpiTotals: CommissionKPIStats | null;
}

/**
 * Initial state with current-year filter applied by default
 */
const initialState: CommissionState = {
  items: {},
  pagesLoaded: [],
  totalPages: 0,
  totalCount: 0,
  loadingNext: false,
  hasMore: true,
  lastSync: null,
  isLoading: false,
  error: null,
  searchTerm: '',
  filters: {
    dateRange: getCurrentYearRange(), // Default to current year
  },
  kpiTotals: null,
};

/**
 * Commission slice with pagination support (following customer pattern)
 */
const commissionSlice = createSlice({
  name: 'commissions',
  initialState,
  reducers: {
    /**
     * Upsert commissions from API response
     */
    upsertCommissions: (state, action: PayloadAction<Commission[]>) => {
      console.log(
        '🔄 upsertCommissions reducer called with:',
        action.payload?.length || 'undefined',
        'commissions'
      );

      if (!action.payload || !Array.isArray(action.payload)) {
        console.error('❌ upsertCommissions: Invalid payload', action.payload);
        return;
      }

      action.payload.forEach((commission, index) => {
        if (commission && commission.id) {
          state.items[commission.id] = commission;
          console.log(`✅ Added commission ${index + 1}:`, commission.id);
        } else {
          console.error('❌ Invalid commission object:', commission);
        }
      });

      state.totalCount = Object.keys(state.items).length;
      console.log('✅ Total commissions in state:', state.totalCount);
    },

    /**
     * Set commissions from cache/API (legacy compatibility)
     */
    setItems: (state, action: PayloadAction<Commission[]>) => {
      console.log(
        '🔄 setItems reducer called with:',
        action.payload?.length || 'undefined',
        'commissions'
      );

      if (!action.payload || !Array.isArray(action.payload)) {
        console.error('❌ setItems: Invalid payload', action.payload);
        return;
      }

      // Clear existing commissions and set new ones
      state.items = {};
      action.payload.forEach((commission) => {
        if (commission && commission.id) {
          state.items[commission.id] = commission;
        }
      });
      state.totalCount = Object.keys(state.items).length;
      state.error = null;
      console.log('✅ setItems: Total commissions now:', state.totalCount);
    },

    /**
     * Set date filter
     */
    setDateFilter: (
      state,
      action: PayloadAction<{ startDate: string; endDate: string }>
    ) => {
      state.filters.dateRange = action.payload;
      console.log('📅 Date filter updated:', action.payload);
    },

    /**
     * Set status filter
     */
    setStatusFilter: (state, action: PayloadAction<string[]>) => {
      state.filters.statuses = action.payload;
      console.log('🔧 Status filter updated:', action.payload);
    },

    /**
     * Update filters (partial update)
     */
    updateFilters: (
      state,
      action: PayloadAction<Partial<CommissionFilters>>
    ) => {
      state.filters = { ...state.filters, ...action.payload };
      console.log('🔧 Filters updated:', state.filters);
    },

    /**
     * Reset filters to current year default
     */
    resetFilters: (state) => {
      state.filters = {
        dateRange: getCurrentYearRange(),
      };
      state.searchTerm = '';
      console.log('🧹 Filters reset to current year default');
    },

    /**
     * Clear all filters (no date filter)
     */
    clearFilters: (state) => {
      state.filters = {};
      state.searchTerm = '';
      console.log('🧹 All filters cleared');
    },

    /**
     * Update KPI totals cache
     */
    updateKPITotals: (state, action: PayloadAction<CommissionKPIStats>) => {
      state.kpiTotals = action.payload;
      console.log('📊 KPI totals updated:', action.payload);
    },

    /**
     * Update search term
     */
    updateSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
      console.log('🔍 Search term updated:', action.payload);
    },

    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },

    /**
     * Set error state
     */
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
      state.loadingNext = false;
    },

    /**
     * Update last sync timestamp
     */
    setLastSync: (state, action: PayloadAction<number>) => {
      state.lastSync = action.payload;
    },

    /**
     * Start loading next page (pagination support)
     */
    startNextPageLoad: (state) => {
      state.loadingNext = true;
      state.error = null;
      console.log('🔄 Started loading next page');
    },

    /**
     * Finish loading next page (pagination support)
     */
    finishNextPageLoad: (
      state,
      action: PayloadAction<{
        page: number;
        totalPages: number;
        success: boolean;
        error?: string;
      }>
    ) => {
      const { page, totalPages, success, error } = action.payload;

      state.loadingNext = false;
      state.totalPages = totalPages;

      if (success) {
        // Add page to loaded pages if not already present
        if (!state.pagesLoaded.includes(page)) {
          state.pagesLoaded.push(page);
        }
        // Update hasMore based on whether we've loaded all pages
        state.hasMore = page < totalPages;
        console.log(
          `✅ Page ${page} loaded. HasMore: ${state.hasMore} (${page}/${totalPages})`
        );
      } else {
        state.error = error || 'Failed to load next page';
        console.log(`❌ Page ${page} failed: ${error}`);
      }
    },

    /**
     * Reset pagination state (useful for refresh)
     */
    resetPagination: (state) => {
      state.pagesLoaded = [];
      state.totalPages = 0;
      state.loadingNext = false;
      state.hasMore = true;
      state.error = null;
      console.log('🔄 Commission pagination state reset');
    },

    /**
     * Clear all pages and reset state
     */
    clearPages: (state) => {
      state.items = {};
      state.pagesLoaded = [];
      state.totalPages = 0;
      state.totalCount = 0;
      state.lastSync = null;
      state.error = null;
      state.loadingNext = false;
      state.hasMore = true;
      state.kpiTotals = null;
      console.log('✅ Cleared all commission pages');
    },

    /**
     * Clear all commission data
     */
    clear: (state) => {
      return { ...initialState };
    },

    /**
     * Set rehydration data (used by SQLite transform)
     */
    rehydrate: (
      state,
      action: PayloadAction<{ items: Commission[]; lastSync: number | null }>
    ) => {
      const { items, lastSync } = action.payload;

      // Convert array to normalized structure
      state.items = {};
      if (Array.isArray(items)) {
        items.forEach((commission) => {
          if (commission && commission.id) {
            state.items[commission.id] = commission;
          }
        });
      }

      state.lastSync = lastSync;
      state.totalCount = Object.keys(state.items).length;
      state.isLoading = false;
      state.error = null;
      console.log(
        '✅ Commission state rehydrated with',
        state.totalCount,
        'commissions'
      );
    },
  },

  /**
   * Extra reducers to handle API responses
   */
  extraReducers: (builder) => {
    builder
      // Handle getCommissions fulfilled
      .addMatcher(
        commissionApi.endpoints?.getCommissions?.matchFulfilled,
        (state, action) => {
          console.log('🔄 getCommissions fulfilled, syncing to Redux state');

          if (action.payload?.data?.items) {
            const commissions = action.payload.data.items;

            // Transform API commissions to our Commission model
            commissions.forEach((apiCommission: any) => {
              const transformedCommission: Commission = {
                id: apiCommission.commissionId,
                cp_id: apiCommission.cpId,
                lead_id: apiCommission.leadId || undefined,
                customer_id: undefined, // Not provided by API
                amount: apiCommission.amount,
                status: apiCommission.status,
                created_at: apiCommission.createdAt || new Date().toISOString(),
                updated_at: new Date().toISOString(),
                payment_date: undefined, // API doesn't provide this in list
                description: undefined, // API doesn't provide this in list
                sync_status: 'synced',
                local_changes: '{}',
              };

              state.items[transformedCommission.id] = transformedCommission;
            });

            state.totalCount = Object.keys(state.items).length;
            state.lastSync = Date.now();
            console.log(
              '✅ Redux state synced with API data, total commissions:',
              state.totalCount
            );
          }
        }
      )

      // Handle getCommissionById fulfilled
      .addMatcher(
        commissionApi.endpoints?.getCommissionById?.matchFulfilled,
        (state, action) => {
          console.log('💰 getCommissionById fulfilled:', action.payload);

          if (action.payload?.data) {
            const apiCommission = action.payload.data;

            const transformedCommission: Commission = {
              id: apiCommission.commissionId,
              cp_id: apiCommission.cpId,
              lead_id: apiCommission.leadId || undefined,
              customer_id: undefined, // Not provided by API
              amount: apiCommission.amount,
              status: apiCommission.status,
              created_at: apiCommission.createdAt || new Date().toISOString(),
              updated_at: apiCommission.updatedAt || new Date().toISOString(),
              payment_date: apiCommission.paidAt || undefined,
              description: undefined,
              sync_status: 'synced',
              local_changes: '{}',
            };

            state.items[transformedCommission.id] = transformedCommission;
            console.log(
              '✅ Commission detail added to Redux state:',
              transformedCommission.id
            );
          }
        }
      );
  },
});

// Export actions
export const {
  upsertCommissions,
  setItems,
  setDateFilter,
  setStatusFilter,
  updateFilters,
  resetFilters,
  clearFilters,
  updateKPITotals,
  updateSearchTerm,
  setLoading,
  setError,
  setLastSync,
  startNextPageLoad,
  finishNextPageLoad,
  resetPagination,
  clearPages,
  clear,
  rehydrate,
} = commissionSlice.actions;

// Export reducer
export default commissionSlice.reducer;

// Base selectors
export const selectCommissionState = (state: {
  commissions: CommissionState;
}) => state.commissions;

// Legacy selectors for backward compatibility
export const selectCommissions = createSelector(
  [selectCommissionState],
  (commissionState) => Object.values(commissionState?.items || {})
);

export const selectCommissionsLoading = createSelector(
  [selectCommissionState],
  (commissionState) => commissionState?.isLoading || false
);

export const selectCommissionsError = createSelector(
  [selectCommissionState],
  (commissionState) => commissionState?.error || null
);

export const selectCommissionsLastSync = createSelector(
  [selectCommissionState],
  (commissionState) => commissionState?.lastSync || null
);

export const selectCommissionsTotalCount = createSelector(
  [selectCommissionState],
  (commissionState) => commissionState?.totalCount || 0
);

export const selectCommissionsSearchTerm = createSelector(
  [selectCommissionState],
  (commissionState) => commissionState?.searchTerm || ''
);

export const selectCommissionsFilters = createSelector(
  [selectCommissionState],
  (commissionState) => commissionState?.filters || {}
);
