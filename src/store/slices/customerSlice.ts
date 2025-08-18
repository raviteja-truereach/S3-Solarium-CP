/**
 * Customer Slice - Enhanced with Pagination Pattern
 * Manages customer state following the exact same pattern as leadSlice
 * Only manages search/filters - pagination handled by RTK Query
 */
import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { Customer } from '../../database/models/Customer';
import { customerApi } from '../api/customerApi';

/**
 * Customer filter interface
 */
export interface CustomerFilters {
  kycStatus?: string;
  city?: string;
  state?: string;
  status?: string;
}

/**
 * Enhanced Customer state interface (following lead pattern)
 */
export interface CustomerState {
  /** Normalized customer items by ID */
  items: Record<string, Customer>;

  /** Array of page numbers that have been loaded */
  pagesLoaded: number[];

  /** Total number of pages available */
  totalPages: number;

  /** Total count of customers across all pages */
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
  filters: CustomerFilters;
}

/**
 * Initial state
 */
const initialState: CustomerState = {
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
  filters: {},
};

/**
 * Customer slice with pagination support (following lead pattern)
 */
const customerSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    /**
     * Upsert customers from API response
     */
    upsertCustomers: (state, action: PayloadAction<Customer[]>) => {
      console.log(
        '📄 upsertCustomers reducer called with:',
        action.payload?.length || 'undefined',
        'customers'
      );

      if (!action.payload || !Array.isArray(action.payload)) {
        console.error('❌ upsertCustomers: Invalid payload', action.payload);
        return;
      }

      action.payload.forEach((customer, index) => {
        if (customer && customer.id) {
          state.items[customer.id] = customer;
          console.log(`✅ Added customer ${index + 1}:`, customer.name);
        } else {
          console.error('❌ Invalid customer object:', customer);
        }
      });

      state.totalCount = Object.keys(state.items).length;
      console.log('✅ Total customers in state:', state.totalCount);
    },

    /**
     * Set customers from cache/API (legacy compatibility)
     */
    setItems: (state, action: PayloadAction<Customer[]>) => {
      console.log(
        '📄 setItems reducer called with:',
        action.payload?.length || 'undefined',
        'customers'
      );

      if (!action.payload || !Array.isArray(action.payload)) {
        console.error('❌ setItems: Invalid payload', action.payload);
        return;
      }

      // Clear existing customers and set new ones
      state.items = {};
      action.payload.forEach((customer) => {
        if (customer && customer.id) {
          state.items[customer.id] = customer;
        }
      });
      state.totalCount = Object.keys(state.items).length;
      state.error = null;
      console.log('✅ setItems: Total customers now:', state.totalCount);
    },

    /**
     * Add a single customer item
     */
    addItem: (state, action: PayloadAction<Customer>) => {
      const customer = action.payload;
      if (customer && customer.id) {
        const existingIndex = Object.keys(state.items).findIndex(
          (id) => id === customer.id
        );
        if (existingIndex >= 0) {
          state.items[customer.id] = customer;
          console.log('✅ Updated existing customer:', customer.name);
        } else {
          state.items[customer.id] = customer;
          state.totalCount = Object.keys(state.items).length;
          console.log('✅ Added new customer:', customer.name);
        }
      }
    },

    /**
     * Update a customer item
     */
    updateItem: (state, action: PayloadAction<Customer>) => {
      const customer = action.payload;
      if (customer && customer.id && state.items[customer.id]) {
        state.items[customer.id] = customer;
        console.log('✅ Customer updated:', customer.name);
      }
    },

    /**
     * Remove a customer item
     */
    removeItem: (state, action: PayloadAction<string>) => {
      const customerId = action.payload;
      if (state.items[customerId]) {
        delete state.items[customerId];
        state.totalCount = Object.keys(state.items).length;
        console.log('✅ Customer removed:', customerId);
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
      state.loadingNext = false;
    },

    /**
     * Update last sync timestamp
     */
    setLastSync: (state, action: PayloadAction<number>) => {
      state.lastSync = action.payload;
    },

    /**
     * Update search term (renamed from setSearchTerm for consistency)
     */
    updateSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
      console.log('🔍 Search term updated:', action.payload);
    },

    /**
     * Update filters (renamed from setFilters for consistency)
     */
    updateFilters: (state, action: PayloadAction<CustomerFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
      console.log('🔧 Filters updated:', state.filters);
    },

    /**
     * Clear all filters and search
     */
    clearFilters: (state) => {
      state.filters = {};
      state.searchTerm = '';
      console.log('🧹 Filters and search cleared');
    },

    /**
     * Update KYC status for multiple customers
     */
    updateKycStatus: (
      state,
      action: PayloadAction<{
        customerIds: string[];
        status: Customer['kyc_status'];
      }>
    ) => {
      const { customerIds, status } = action.payload;
      customerIds.forEach((customerId) => {
        if (state.items[customerId]) {
          state.items[customerId].kyc_status = status;
          state.items[customerId].sync_status = 'pending';
        }
      });
      console.log(
        '✅ KYC status updated for customers:',
        customerIds,
        '→',
        status
      );
    },

    /**
     * Start loading next page (pagination support)
     */
    startNextPageLoad: (state) => {
      state.loadingNext = true;
      state.error = null;
      console.log('📄 Started loading next page');
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
      console.log('🔄 Customer pagination state reset');
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
      console.log('✅ Cleared all customer pages');
    },

    /**
     * Bulk update sync status for customers
     */
    updateSyncStatus: (
      state,
      action: PayloadAction<{
        customerIds: string[];
        status: 'synced' | 'pending' | 'failed';
      }>
    ) => {
      const { customerIds, status } = action.payload;
      customerIds.forEach((customerId) => {
        if (state.items[customerId]) {
          state.items[customerId].sync_status = status;
        }
      });
      console.log(
        '✅ Sync status updated for customers:',
        customerIds,
        '→',
        status
      );
    },

    /**
     * Clear all customers data
     */
    clear: (state) => {
      return { ...initialState };
    },

    /**
     * Set rehydration data (used by SQLite transform)
     */
    rehydrate: (
      state,
      action: PayloadAction<{ items: Customer[]; lastSync: number | null }>
    ) => {
      const { items, lastSync } = action.payload;

      // Convert array to normalized structure
      state.items = {};
      if (Array.isArray(items)) {
        items.forEach((customer) => {
          if (customer && customer.id) {
            state.items[customer.id] = customer;
          }
        });
      }

      state.lastSync = lastSync;
      state.totalCount = Object.keys(state.items).length;
      state.isLoading = false;
      state.error = null;
      console.log(
        '✅ Customer state rehydrated with',
        state.totalCount,
        'customers'
      );
    },
  },

  /**
   * Extra reducers to handle API responses
   */
  extraReducers: (builder) => {
    builder
      // Handle getCustomers fulfilled
      .addMatcher(
        customerApi.endpoints?.getCustomers?.matchFulfilled,
        (state, action) => {
          console.log('📄 getCustomers fulfilled, syncing to Redux state');

          if (action.payload?.data?.items) {
            const customers = action.payload.data.items;

            // Transform API customers to our Customer model
            customers.forEach((apiCustomer: any) => {
              const transformedCustomer: Customer = {
                id: apiCustomer.customerId,
                name: apiCustomer.name,
                phone: apiCustomer.phone,
                email: apiCustomer.email || undefined,
                address: apiCustomer.address || undefined,
                city: undefined, // Not provided by API
                state: undefined, // Not provided by API
                pincode: undefined, // Not provided by API
                created_at: new Date().toISOString(), // API doesn't provide this
                updated_at: new Date().toISOString(), // API doesn't provide this
                kyc_status: 'pending', // Default status
                sync_status: 'synced',
                local_changes: '{}',
              };

              state.items[transformedCustomer.id] = transformedCustomer;
            });

            state.totalCount = Object.keys(state.items).length;
            state.lastSync = Date.now();
            console.log(
              '✅ Redux state synced with API data, total customers:',
              state.totalCount
            );
          }
        }
      )

      // Handle getCustomerById fulfilled
      .addMatcher(
        customerApi.endpoints?.getCustomerById?.matchFulfilled,
        (state, action) => {
          console.log('👤 getCustomerById fulfilled:', action.payload);

          if (action.payload?.data) {
            const apiCustomer = action.payload.data;

            const transformedCustomer: Customer = {
              id: apiCustomer.customerId,
              name: apiCustomer.name,
              phone: apiCustomer.phone,
              email: apiCustomer.email || undefined,
              address: apiCustomer.address || undefined,
              city: apiCustomer.city || undefined,
              state: apiCustomer.state || undefined,
              pincode: apiCustomer.pincode || undefined,
              created_at: apiCustomer.createdAt || new Date().toISOString(),
              updated_at: apiCustomer.updatedAt || new Date().toISOString(),
              kyc_status: 'pending', // Default - could map from API if available
              sync_status: 'synced',
              local_changes: '{}',
            };

            state.items[transformedCustomer.id] = transformedCustomer;
            console.log(
              '✅ Customer detail added to Redux state:',
              transformedCustomer.id
            );
          }
        }
      );
  },
});

// Export actions
export const {
  upsertCustomers,
  setItems,
  addItem,
  updateItem,
  removeItem,
  setLoading,
  setError,
  setLastSync,
  updateSearchTerm,
  updateFilters,
  clearFilters,
  updateKycStatus,
  startNextPageLoad,
  finishNextPageLoad,
  resetPagination,
  clearPages,
  updateSyncStatus,
  clear,
  rehydrate,
} = customerSlice.actions;

// Export reducer
export default customerSlice.reducer;

// Base selectors
export const selectCustomerState = (state: { customers: CustomerState }) =>
  state.customers;

// Legacy selectors for backward compatibility
export const selectCustomers = createSelector(
  [selectCustomerState],
  (customerState) => Object.values(customerState?.items || {})
);

export const selectCustomersLoading = createSelector(
  [selectCustomerState],
  (customerState) => customerState?.isLoading || false
);

export const selectCustomersError = createSelector(
  [selectCustomerState],
  (customerState) => customerState?.error || null
);

export const selectCustomersLastSync = createSelector(
  [selectCustomerState],
  (customerState) => customerState?.lastSync || null
);

export const selectCustomersTotalCount = createSelector(
  [selectCustomerState],
  (customerState) => customerState?.totalCount || 0
);

export const selectCustomersSearchTerm = createSelector(
  [selectCustomerState],
  (customerState) => customerState?.searchTerm || ''
);

export const selectCustomersFilters = createSelector(
  [selectCustomerState],
  (customerState) => customerState?.filters || {}
);

// Legacy filtered selectors
export const selectCustomersByKycStatus = (status: string) =>
  createSelector([selectCustomers], (customers) =>
    customers.filter((customer) => customer.kyc_status === status)
  );

export const selectCustomersByLocation = (city?: string, state?: string) =>
  createSelector([selectCustomers], (customers) =>
    customers.filter(
      (customer) =>
        (!city || customer.city === city) &&
        (!state || customer.state === state)
    )
  );

export const selectPendingCustomers = createSelector(
  [selectCustomers],
  (customers) =>
    customers.filter((customer) => customer.sync_status === 'pending')
);
