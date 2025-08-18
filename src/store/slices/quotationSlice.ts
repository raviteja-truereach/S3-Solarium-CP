/**
 * Quotation Slice - Normalized with Pagination Support
 * Manages quotation state with normalized data structure following leadSlice patterns
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Quotation } from '../../types/api/quotation';
import type {
  QuotationWizardData,
  QuotationWizardStep,
} from '../../types/quotation';
import { quotationApi } from '../api/quotationApi';

/**
 * Normalized Quotation state interface
 */
export interface QuotationState {
  /** Normalized quotation items by ID */
  items: Record<string, Quotation>;

  /** Array of page numbers that have been loaded */
  pagesLoaded: number[];

  /** Total number of pages available */
  totalPages: number;

  /** Total count of quotations across all pages */
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

  /** Search text for filtering quotations */
  searchText: string;

  /** Current filter/search criteria */
  filters: {
    /** Selected status filters */
    statuses: string[];
    /** Lead ID filter */
    leadId?: string;
    /** Date range filter */
    dateRange?: {
      from?: string;
      to?: string;
    };
  };

  /** Summary data from API */
  summaryData?: {
    generated: number;
    shared: number;
    accepted: number;
    rejected: number;
    total: number;
  };

  /** Wizard state management */
  wizard: {
    isActive: boolean;
    currentStep: QuotationWizardStep;
    leadId: string | null;
    data: Partial<QuotationWizardData>;
    errors: Record<string, string>;
    isValid: boolean;
    creating: boolean;
  };

  /** Detailed quotation data cache */
  quotationDetails: Record<string, any>;
}

/**
 * Upsert quotations payload interface
 */
export interface UpsertQuotationsPayload {
  items: Quotation[];
  page: number;
  totalPages: number;
  totalCount?: number;
}

/**
 * Initial state
 */
const initialState: QuotationState = {
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
    leadId: undefined,
    dateRange: undefined,
  },
  summaryData: undefined,
  wizard: {
    isActive: false,
    currentStep: 1 as QuotationWizardStep,
    leadId: null,
    data: {},
    errors: {},
    isValid: false,
    creating: false,
  },
  quotationDetails: {},
};

/**
 * Quotation slice with normalized structure and pagination
 */
const quotationSlice = createSlice({
  name: 'quotations',
  initialState,
  reducers: {
    /**
     * Upsert quotations with pagination support
     */
    upsertQuotations: (
      state,
      action: PayloadAction<UpsertQuotationsPayload>
    ) => {
      const { items, page, totalPages, totalCount } = action.payload;

      // Normalize quotations into items object
      items.forEach((quotation) => {
        state.items[quotation.quotationId] = quotation;
      });

      // Update pagination metadata
      if (!state.pagesLoaded.includes(page)) {
        state.pagesLoaded.push(page);
      }
      state.totalPages = totalPages;
      if (totalCount !== undefined) {
        state.totalCount = totalCount;
      }

      // Update hasMore flag
      state.hasMore = page < totalPages;

      console.log(`📄 Upserted ${items.length} quotations for page ${page}`);
    },

    /**
     * Update quotation status (for optimistic updates)
     */
    updateQuotationStatus: (
      state,
      action: PayloadAction<{
        quotationId: string;
        status: string;
        timestamp?: string;
      }>
    ) => {
      const { quotationId, status, timestamp } = action.payload;

      if (state.items[quotationId]) {
        state.items[quotationId].status = status as any;

        // Update timestamp based on status
        const now = timestamp || new Date().toISOString();
        // Note: These fields don't exist in the simple Quotation interface,
        // but would be used if we had the extended interface
      }

      // Also update in quotationDetails if exists
      if (state.quotationDetails[quotationId]) {
        state.quotationDetails[quotationId].status = status;
        if (status === 'Shared') {
          state.quotationDetails[quotationId].sharedAt =
            timestamp || new Date().toISOString();
        } else if (status === 'Accepted') {
          state.quotationDetails[quotationId].acceptedAt =
            timestamp || new Date().toISOString();
        } else if (status === 'Rejected') {
          state.quotationDetails[quotationId].rejectedAt =
            timestamp || new Date().toISOString();
        }
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
     * Set loading next page state
     */
    setLoadingNext: (state, action: PayloadAction<boolean>) => {
      state.loadingNext = action.payload;
    },

    /**
     * Set error state
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
      state.loadingNext = false;
    },

    /**
     * Update search text
     */
    setSearchText: (state, action: PayloadAction<string>) => {
      state.searchText = action.payload;
    },
    /**
     * Clear all filters and search text
     */
    clearAllFilters: (state) => {
      state.searchText = '';
      state.filters = {
        statuses: [],
        leadId: undefined,
        dateRange: undefined,
      };
    },

    /**
     * Update filters
     */
    setFilters: (
      state,
      action: PayloadAction<Partial<QuotationState['filters']>>
    ) => {
      state.filters = {
        ...state.filters,
        ...action.payload,
      };
    },

    /**
     * Clear all quotations and reset pagination
     */
    clearQuotations: (state) => {
      state.items = {};
      state.pagesLoaded = [];
      state.totalPages = 0;
      state.totalCount = 0;
      state.hasMore = true;
      state.error = null;
    },

    /**
     * Set last sync timestamp
     */
    setLastSync: (state, action: PayloadAction<number>) => {
      state.lastSync = action.payload;
    },

    /**
     * Update summary data
     */
    setSummaryData: (
      state,
      action: PayloadAction<QuotationState['summaryData']>
    ) => {
      state.summaryData = action.payload;
    },

    // Wizard management reducers
    /**
     * Start quotation wizard
     */
    startWizard: (state, action: PayloadAction<{ leadId: string }>) => {
      state.wizard.isActive = true;
      state.wizard.currentStep = 1;
      state.wizard.leadId = action.payload.leadId;
      state.wizard.data = { leadId: action.payload.leadId };
      state.wizard.errors = {};
      state.wizard.isValid = false;
      state.wizard.creating = false;
    },

    /**
     * Set wizard step
     */
    setWizardStep: (state, action: PayloadAction<QuotationWizardStep>) => {
      state.wizard.currentStep = action.payload;
    },

    /**
     * Update wizard data
     */
    updateWizardData: (
      state,
      action: PayloadAction<Partial<QuotationWizardData>>
    ) => {
      state.wizard.data = {
        ...state.wizard.data,
        ...action.payload,
      };
    },

    /**
     * Set wizard validation errors
     */
    setWizardErrors: (state, action: PayloadAction<Record<string, string>>) => {
      state.wizard.errors = action.payload;
    },

    /**
     * Set wizard validity
     */
    setWizardValid: (state, action: PayloadAction<boolean>) => {
      state.wizard.isValid = action.payload;
    },

    /**
     * Set wizard creating state
     */
    setWizardCreating: (state, action: PayloadAction<boolean>) => {
      state.wizard.creating = action.payload;
    },

    /**
     * Clear wizard state
     */
    clearWizard: (state) => {
      state.wizard = initialState.wizard;
    },

    /**
     * Cache detailed quotation data
     */
    cacheQuotationDetail: (
      state,
      action: PayloadAction<{ quotationId: string; data: any }>
    ) => {
      const { quotationId, data } = action.payload;
      state.quotationDetails[quotationId] = data;
    },

    // In the quotationSlice reducers, ADD:
    /**
     * Populate quotations from preloaded cache data
     */
    populateFromCache: (
      state,
      action: PayloadAction<{
        quotations: Quotation[];
        lastSync: number | null;
      }>
    ) => {
      const { quotations, lastSync } = action.payload;

      // Convert array to normalized object
      const quotationItems: Record<string, Quotation> = {};
      quotations.forEach((quotation) => {
        quotationItems[quotation.quotationId] = quotation;
      });

      state.items = quotationItems;
      state.lastSync = lastSync;
      state.isLoading = false;
      state.error = null;

      console.log(`✅ Populated ${quotations.length} quotations from cache`);
    },
  },

  extraReducers: (builder) => {
    builder
      // Handle getQuotations API responses
      .addMatcher(
        quotationApi.endpoints.getQuotations.matchPending,
        (state) => {
          state.isLoading = true;
          state.error = null;
        }
      )
      .addMatcher(
        quotationApi.endpoints.getQuotations.matchFulfilled,
        (state, action) => {
          const quotations = action.payload;

          // For simplicity, treat as page 1 (can be enhanced later)
          const payload: UpsertQuotationsPayload = {
            items: quotations,
            page: 1,
            totalPages: 1,
            totalCount: quotations.length,
          };

          // Use the upsertQuotations logic
          payload.items.forEach((quotation) => {
            state.items[quotation.quotationId] = quotation;
          });

          if (!state.pagesLoaded.includes(payload.page)) {
            state.pagesLoaded.push(payload.page);
          }
          state.totalPages = payload.totalPages;
          state.totalCount = payload.totalCount || 0;
          state.hasMore = payload.page < payload.totalPages;

          state.isLoading = false;
          state.lastSync = Date.now();
        }
      )
      .addMatcher(
        quotationApi.endpoints.getQuotations.matchRejected,
        (state, action) => {
          state.isLoading = false;
          state.error = action.error.message || 'Failed to fetch quotations';
        }
      )

      // Handle getQuotationById API responses
      .addMatcher(
        quotationApi.endpoints.getQuotationById.matchFulfilled,
        (state, action) => {
          const quotationDetail = action.payload;
          state.quotationDetails[quotationDetail.quotationId] = quotationDetail;
        }
      )

      // Handle createQuotation API responses
      .addMatcher(
        quotationApi.endpoints.createQuotation.matchPending,
        (state) => {
          state.wizard.creating = true;
          state.error = null;
        }
      )
      .addMatcher(
        quotationApi.endpoints.createQuotation.matchFulfilled,
        (state) => {
          state.wizard.creating = false;
          // Clear wizard after successful creation
          state.wizard = initialState.wizard;
        }
      )
      .addMatcher(
        quotationApi.endpoints.createQuotation.matchRejected,
        (state, action) => {
          state.wizard.creating = false;
          state.error = action.error.message || 'Failed to create quotation';
        }
      )

      // Handle action errors (share/accept/reject)
      .addMatcher(
        quotationApi.endpoints.shareQuotation.matchRejected,
        (state, action) => {
          state.error = action.error.message || 'Failed to share quotation';
        }
      )
      .addMatcher(
        quotationApi.endpoints.acceptQuotation.matchRejected,
        (state, action) => {
          state.error = action.error.message || 'Failed to accept quotation';
        }
      )
      .addMatcher(
        quotationApi.endpoints.rejectQuotation.matchRejected,
        (state, action) => {
          state.error = action.error.message || 'Failed to reject quotation';
        }
      );
  },
});

// Export actions
export const {
  upsertQuotations,
  updateQuotationStatus,
  setLoading,
  setLoadingNext,
  setError,
  setSearchText,
  clearAllFilters,
  setFilters,
  clearQuotations,
  setLastSync,
  setSummaryData,
  startWizard,
  setWizardStep,
  updateWizardData,
  setWizardErrors,
  setWizardValid,
  setWizardCreating,
  clearWizard,
  cacheQuotationDetail,
  populateFromCache,
} = quotationSlice.actions;

// Export reducer
export default quotationSlice.reducer;
