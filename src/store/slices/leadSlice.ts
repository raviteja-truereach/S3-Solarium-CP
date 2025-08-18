/**
 * Lead Slice - Normalized with Pagination Support
 * Manages lead state with normalized data structure and pagination metadata
 */
import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { Lead } from '../../database/models/Lead';
import type { LeadsData } from '../../types/api';
import { leadApi } from '../api/leadApi';

/**
 * Normalized Lead state interface
 */
export interface LeadState {
  /** Normalized lead items by ID */
  items: Record<string, Lead>;

  /** Array of page numbers that have been loaded */
  pagesLoaded: number[];

  /** Total number of pages available */
  totalPages: number;

  /** Total count of leads across all pages */
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

  /** Search text for filtering leads */
  searchText: string;

  /** Current filter/search criteria */
  filters: {
    /** Selected status filters */
    statuses: string[];
    /** Date range filter */
    dateRange?: {
      from?: string;
      to?: string;
    };
  };

  // ✅ ADD SUMMARY DATA
  /** Summary data from API */
  summaryData?: {
    overdue: number;
    todayPending: number;
    total: number;
  };
}

/**
 * Upsert leads payload interface
 */
export interface UpsertLeadsPayload {
  items: Lead[];
  page: number;
  totalPages: number;
  totalCount?: number;
}

/**
 * Initial state
 */
const initialState: LeadState = {
  items: {},
  pagesLoaded: [],
  totalPages: 0,
  totalCount: 0,
  loadingNext: false,
  hasMore: true,
  lastSync: null,
  isLoading: false,
  error: null,
  searchText: '',
  filters: {
    statuses: [],
    dateRange: undefined,
  },
  summaryData: undefined,
};

/**
 * Lead slice with normalized structure and pagination
 */
const leadSlice = createSlice({
  name: 'leads',
  initialState,
  reducers: {
    /**
     * Upsert leads with pagination metadata
     * Merges leads without duplicates and updates paging info
     */
    // In your leadSlice reducers section:
    upsertLeads: (state, action: PayloadAction<Lead[]>) => {
      console.log(
        '🔄 upsertLeads reducer called with:',
        action.payload?.length || 'undefined',
        'leads'
      );

      // ✅ SAFE CHECK FOR PAYLOAD
      if (!action.payload || !Array.isArray(action.payload)) {
        console.error('❌ upsertLeads: Invalid payload', action.payload);
        return;
      }

      // ✅ SAFE FOREACH WITH ADDITIONAL LOGGING
      action.payload.forEach((lead, index) => {
        if (lead && lead.id) {
          state.items[lead.id] = lead;
          console.log(`✅ Added lead ${index + 1}:`, lead.customerName);
        } else {
          console.error('❌ Invalid lead object:', lead);
        }
      });

      // ✅ UPDATE TOTAL COUNT
      state.totalCount = Object.keys(state.items).length;
      console.log('✅ Total leads in state:', state.totalCount);
    },

    /**
     * Clear all pages and reset pagination state
     */
    clearPages: (state) => {
      state.items = {};
      state.pagesLoaded = [];
      state.totalPages = 0;
      state.totalCount = 0;
      state.lastSync = null;
      state.error = null;
      console.log('✅ Cleared all pages');
    },

    /**
     * Add a single lead item
     */
    addItem: (state, action: PayloadAction<Lead>) => {
      const lead = action.payload;
      if (lead && lead.id) {
        state.items[lead.id] = lead;
        state.totalCount = Object.keys(state.items).length;
      }
    },

    /**
     * Update a lead item
     */
    updateItem: (state, action: PayloadAction<Lead>) => {
      const lead = action.payload;
      if (lead && lead.id && state.items[lead.id]) {
        state.items[lead.id] = lead;
      }
    },

    /**
     * Remove a lead item
     */
    removeItem: (state, action: PayloadAction<string>) => {
      const leadId = action.payload;
      if (state.items[leadId]) {
        delete state.items[leadId];
        state.totalCount = Object.keys(state.items).length;
      }
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
    },

    /**
     * Set filters
     */
    // setFilters: (state, action: PayloadAction<LeadState['filters']>) => {
    //   state.filters = action.payload;
    // },

    /**
     * Clear all filters
     */
    clearFilters: (state) => {
      state.filters = {};
    },
    /**
     * Set search text for filtering
     */
    setSearchText: (state, action: PayloadAction<string>) => {
      state.searchText = action.payload;
    },

    /**
     * Set advanced filters
     */
    setFilters: (
      state,
      action: PayloadAction<{
        statuses?: string[];
        dateRange?: { from?: string; to?: string };
      }>
    ) => {
      const { statuses, dateRange } = action.payload;
      if (statuses !== undefined) {
        state.filters.statuses = statuses;
      }
      if (dateRange !== undefined) {
        state.filters.dateRange = dateRange;
      }
    },

    /**
     * Clear all filters and search
     */
    clearAllFilters: (state) => {
      state.searchText = '';
      state.filters = {
        statuses: [],
        dateRange: undefined,
      };
    },
    /**
     * Start loading next page
     */
    startNextPageLoad: (state) => {
      state.loadingNext = true;
      state.error = null;
    },

    /**
     * Finish loading next page
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

      if (success) {
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
      console.log('🔄 Pagination state reset');
    },

    /**
     * Bulk update sync status for leads
     */
    updateSyncStatus: (
      state,
      action: PayloadAction<{
        leadIds: string[];
        status: 'synced' | 'pending' | 'failed';
      }>
    ) => {
      const { leadIds, status } = action.payload;
      leadIds.forEach((leadId) => {
        if (state.items[leadId]) {
          state.items[leadId].sync_status = status;
        }
      });
    },

    // Add these reducers to your leadSlice:
    setLeads: (state, action: PayloadAction<Lead[]>) => {
      console.log(
        '🔄 setLeads reducer called with:',
        action.payload?.length || 'undefined',
        'leads'
      );

      if (!action.payload || !Array.isArray(action.payload)) {
        console.error('❌ setLeads: Invalid payload', action.payload);
        return;
      }

      // Clear existing leads and set new ones
      state.items = {};
      action.payload.forEach((lead) => {
        if (lead && lead.id) {
          state.items[lead.id] = lead;
        }
      });
      state.totalCount = Object.keys(state.items).length;
      console.log('✅ setLeads: Total leads now:', state.totalCount);
    },

    addLead: (state, action: PayloadAction<Lead>) => {
      console.log(
        '🔄 addLead reducer called for:',
        action.payload?.customerName
      );

      if (action.payload && action.payload.id) {
        state.items[action.payload.id] = action.payload;
        state.totalCount = Object.keys(state.items).length;
        console.log('✅ addLead: Lead added, total now:', state.totalCount);
      }
    },
    /**
     * Update lead status immediately (for MyLeadsScreen consistency)
     */
    updateLeadStatus: (
      state,
      action: PayloadAction<{
        leadId: string;
        status: string;
        remarks?: string;
        followUpDate?: string;
      }>
    ) => {
      const { leadId, status, remarks, followUpDate } = action.payload;

      if (state.items[leadId]) {
        const lead = state.items[leadId];

        // Update the lead with new status
        state.items[leadId] = {
          ...lead,
          status,
          remarks: remarks || lead.remarks,
          follow_up_date: followUpDate || lead.follow_up_date,
          updated_at: new Date().toISOString(),
          sync_status: 'synced' as const,
        };

        console.log('✅ Lead status updated in Redux:', leadId, '→', status);
      }
    },
  },

  /**
   * Extra reducers to handle API responses
   */
  extraReducers: (builder) => {
    builder
      // Handle getLeads fulfilled (for MyLeadsScreen refresh)
      .addMatcher(
        leadApi.endpoints?.getLeads?.matchFulfilled,
        (state, action) => {
          console.log('🔄 getLeads fulfilled, syncing to Redux state');

          if (action.payload?.data?.leads || action.payload?.leads) {
            const leads =
              action.payload.data?.leads || action.payload.leads || [];

            // Update Redux state with fresh data from server
            leads.forEach((apiLead: any) => {
              const transformedLead: Lead = {
                id: apiLead.leadId || apiLead.id,
                customer_id: undefined,
                status: apiLead.status,
                priority: 'medium' as const,
                source: 'CP',
                product_type: apiLead.services?.join(', ') || '',
                estimated_value: undefined,
                follow_up_date:
                  apiLead.nextFollowUpDate || apiLead.followUpDate,
                created_at: apiLead.createdAt,
                updated_at: apiLead.updatedAt,
                remarks: apiLead.remarks || '',
                address: apiLead.address || '',
                phone: apiLead.phone || '',
                email: apiLead.email,
                sync_status: 'synced' as const,
                local_changes: '{}',
                customerName: apiLead.customerName || '',
                assignedTo: apiLead.assignedTo || '',
                services: apiLead.services || [],
              };

              state.items[transformedLead.id] = transformedLead;
            });

            state.totalCount = Object.keys(state.items).length;
            state.lastSync = Date.now();
            console.log(
              '✅ Redux state synced with API data, total leads:',
              state.totalCount
            );
          }
        }
      )

      // Handle createLead fulfilled
      .addMatcher(
        leadApi.endpoints?.createLead?.matchFulfilled,
        (state, action) => {
          console.log('🆕 createLead fulfilled:', action.payload);

          if (action.payload?.data?.lead) {
            const newLead = action.payload.data.lead;

            const transformedLead: Lead = {
              id: newLead.leadId || action.payload.data.leadId,
              customer_id: undefined,
              status: newLead.status || 'New Lead',
              priority: 'medium' as const,
              source: 'CP',
              product_type: newLead.services?.join(', ') || '',
              estimated_value: undefined,
              follow_up_date: newLead.followUpDate,
              created_at: newLead.createdAt || new Date().toISOString(),
              updated_at: newLead.updatedAt || new Date().toISOString(),
              remarks: newLead.remarks,
              address: newLead.address || '',
              phone: newLead.phone || '',
              email: newLead.email,
              sync_status: 'synced' as const,
              local_changes: '{}',
              customerName: newLead.customerName || '',
              assignedTo: newLead.assignedTo || '',
              services: newLead.services || [],
            };

            state.items[transformedLead.id] = transformedLead;
            state.totalCount = Object.keys(state.items).length;
            console.log(
              '✅ New lead added to Redux state:',
              transformedLead.id
            );
          }
        }
      );
  },
});

// Export actions
export const {
  upsertLeads,
  clearPages,
  addItem,
  updateItem,
  updateLeadStatus,
  removeItem,
  setLoading,
  setError,
  setFilters,
  clearFilters,
  setSearchText,
  clearAllFilters,
  updateSyncStatus,
  startNextPageLoad,
  finishNextPageLoad,
  resetPagination,
  setLeads, // Legacy compatibility
  addLead,
} = leadSlice.actions;

// Export reducer
export default leadSlice.reducer;

// Base selectors
export const selectLeadState = (state: { lead: LeadState }) => state.lead;

// Legacy selectors for backward compatibility
export const selectLeads = createSelector([selectLeadState], (leadState) =>
  Object.values(leadState?.items || {})
);

export const selectLeadsLoading = createSelector(
  [selectLeadState],
  (leadState) => leadState?.isLoading || false
);

export const selectLeadsError = createSelector(
  [selectLeadState],
  (leadState) => leadState?.error || null
);

export const selectLeadsLastSync = createSelector(
  [selectLeadState],
  (leadState) => leadState?.lastSync || null
);

export const selectLeadsTotalCount = createSelector(
  [selectLeadState],
  (leadState) => leadState?.totalCount || 0
);

export const selectLeadsFilters = createSelector(
  [selectLeadState],
  (leadState) => leadState?.filters || {}
);

// Legacy filtered selectors
export const selectLeadsByStatus = (status: string) =>
  createSelector([selectLeads], (leads) =>
    leads.filter((lead) => lead.status === status)
  );

export const selectLeadsByCustomer = (customerId: string) =>
  createSelector([selectLeads], (leads) =>
    leads.filter((lead) => lead.customer_id === customerId)
  );

export const selectPendingLeads = createSelector([selectLeads], (leads) =>
  leads.filter((lead) => lead.sync_status === 'pending')
);
