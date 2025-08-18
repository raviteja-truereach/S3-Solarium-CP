/**
 * Document Count Slice - Per Lead Document Count Management
 * Manages document count state with loading states and error handling
 */
import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';

/**
 * Document count state interface
 */
export interface DocumentCountState {
  /** Document counts by lead ID */
  items: Record<string, number>;

  /** Loading states by lead ID */
  loading: Record<string, boolean>;

  /** Error states by lead ID */
  errors: Record<string, string>;

  /** Last sync timestamps by lead ID */
  lastSync: Record<string, number>;

  /** Global loading state */
  isLoading: boolean;

  /** Global error message */
  error: string | null;

  /** UI lock state - prevents interactions during critical operations */
  uiLocked: boolean;

  /** Operations in progress (for race condition prevention) */
  operationsInProgress: Record<string, string[]>;
}

/**
 * Set document count payload
 */
export interface SetDocumentCountPayload {
  leadId: string;
  count: number;
}

/**
 * Increment document count payload
 */
export interface IncrementDocumentCountPayload {
  leadId: string;
  increment: number;
}

/**
 * Set loading state payload
 */
export interface SetLoadingPayload {
  leadId: string;
  loading: boolean;
}

/**
 * Set error state payload
 */
export interface SetErrorPayload {
  leadId: string;
  error: string;
}

/**
 * Set operation in progress payload
 */
export interface SetOperationPayload {
  leadId: string;
  operation: string;
  inProgress: boolean;
}

/**
 * Initial state
 */
const initialState: DocumentCountState = {
  items: {},
  loading: {},
  errors: {},
  lastSync: {},
  isLoading: false,
  error: null,
  uiLocked: false,
  operationsInProgress: {},
};

/**
 * Document count slice
 */
const documentCountSlice = createSlice({
  name: 'documentCount',
  initialState,
  reducers: {
    /**
     * Set document count for a lead
     */
    setDocumentCount: (
      state,
      action: PayloadAction<SetDocumentCountPayload>
    ) => {
      const { leadId, count } = action.payload;

      state.items[leadId] = count;
      state.lastSync[leadId] = Date.now();

      // Clear error for this lead
      if (state.errors[leadId]) {
        delete state.errors[leadId];
      }

      console.log(`✅ Document count set for lead ${leadId}: ${count}`);
    },

    /**
     * Increment document count for a lead
     */
    incrementDocumentCount: (
      state,
      action: PayloadAction<IncrementDocumentCountPayload>
    ) => {
      const { leadId, increment } = action.payload;

      const currentCount = state.items[leadId] || 0;
      const newCount = currentCount + increment;

      state.items[leadId] = newCount;
      state.lastSync[leadId] = Date.now();

      // Clear error for this lead
      if (state.errors[leadId]) {
        delete state.errors[leadId];
      }

      console.log(
        `✅ Document count incremented for lead ${leadId}: ${currentCount} → ${newCount}`
      );
    },

    /**
     * Reset document count for a lead
     */
    resetDocumentCount: (state, action: PayloadAction<string>) => {
      const leadId = action.payload;

      state.items[leadId] = 0;
      state.lastSync[leadId] = Date.now();

      // Clear error for this lead
      if (state.errors[leadId]) {
        delete state.errors[leadId];
      }

      console.log(`✅ Document count reset for lead ${leadId}`);
    },

    /**
     * Set loading state for a lead
     */
    setLoadingState: (state, action: PayloadAction<SetLoadingPayload>) => {
      const { leadId, loading } = action.payload;

      if (loading) {
        state.loading[leadId] = true;
        // Clear error when starting loading
        if (state.errors[leadId]) {
          delete state.errors[leadId];
        }
      } else {
        delete state.loading[leadId];
      }

      // Update global loading state
      state.isLoading = Object.keys(state.loading).length > 0;
    },

    /**
     * Set error state for a lead
     */
    setErrorState: (state, action: PayloadAction<SetErrorPayload>) => {
      const { leadId, error } = action.payload;

      state.errors[leadId] = error;

      // Clear loading state
      if (state.loading[leadId]) {
        delete state.loading[leadId];
      }

      // Update global loading state
      state.isLoading = Object.keys(state.loading).length > 0;

      console.error(`❌ Document count error for lead ${leadId}: ${error}`);
    },

    /**
     * Clear error for a lead
     */
    clearError: (state, action: PayloadAction<string>) => {
      const leadId = action.payload;

      if (state.errors[leadId]) {
        delete state.errors[leadId];
      }
    },

    /**
     * Set global UI lock state
     */
    setUiLocked: (state, action: PayloadAction<boolean>) => {
      state.uiLocked = action.payload;

      if (action.payload) {
        console.log('🔒 UI locked for document count operations');
      } else {
        console.log('🔓 UI unlocked after document count operations');
      }
    },

    /**
     * Set operation in progress (for race condition prevention)
     */
    setOperationInProgress: (
      state,
      action: PayloadAction<SetOperationPayload>
    ) => {
      const { leadId, operation, inProgress } = action.payload;

      if (!state.operationsInProgress[leadId]) {
        state.operationsInProgress[leadId] = [];
      }

      if (inProgress) {
        // Add operation if not already present
        if (!state.operationsInProgress[leadId].includes(operation)) {
          state.operationsInProgress[leadId].push(operation);
        }
      } else {
        // Remove operation
        state.operationsInProgress[leadId] = state.operationsInProgress[
          leadId
        ].filter((op) => op !== operation);

        // Clean up empty arrays
        if (state.operationsInProgress[leadId].length === 0) {
          delete state.operationsInProgress[leadId];
        }
      }
    },

    /**
     * Clear all data for a lead (cleanup on navigation)
     */
    clearLeadData: (state, action: PayloadAction<string>) => {
      const leadId = action.payload;

      delete state.items[leadId];
      delete state.loading[leadId];
      delete state.errors[leadId];
      delete state.lastSync[leadId];
      delete state.operationsInProgress[leadId];

      // Update global loading state
      state.isLoading = Object.keys(state.loading).length > 0;

      console.log(`🧹 Cleared document count data for lead ${leadId}`);
    },

    /**
     * Clear all data (global cleanup)
     */
    clearAllData: (state) => {
      state.items = {};
      state.loading = {};
      state.errors = {};
      state.lastSync = {};
      state.operationsInProgress = {};
      state.isLoading = false;
      state.error = null;
      state.uiLocked = false;

      console.log('🧹 Cleared all document count data');
    },

    /**
     * Set global error
     */
    setGlobalError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      console.error(`❌ Global document count error: ${action.payload}`);
    },

    /**
     * Clear global error
     */
    clearGlobalError: (state) => {
      state.error = null;
    },
  },
});

// Export actions
export const {
  setDocumentCount,
  incrementDocumentCount,
  resetDocumentCount,
  setLoadingState,
  setErrorState,
  clearError,
  setUiLocked,
  setOperationInProgress,
  clearLeadData,
  clearAllData,
  setGlobalError,
  clearGlobalError,
} = documentCountSlice.actions;

// Export reducer
export default documentCountSlice.reducer;

// Base selectors
export const selectDocumentCountState = (state: {
  documentCount: DocumentCountState;
}) => state.documentCount;

// Document count selectors
export const selectDocumentCount = (leadId: string) =>
  createSelector(
    [selectDocumentCountState],
    (state) => state.items[leadId] || 0
  );

export const selectDocumentCountLoading = (leadId: string) =>
  createSelector(
    [selectDocumentCountState],
    (state) => state.loading[leadId] || false
  );

export const selectDocumentCountError = (leadId: string) =>
  createSelector(
    [selectDocumentCountState],
    (state) => state.errors[leadId] || null
  );

export const selectDocumentCountLastSync = (leadId: string) =>
  createSelector(
    [selectDocumentCountState],
    (state) => state.lastSync[leadId] || null
  );

// Global selectors
export const selectGlobalDocumentCountLoading = createSelector(
  [selectDocumentCountState],
  (state) => state.isLoading
);

export const selectGlobalDocumentCountError = createSelector(
  [selectDocumentCountState],
  (state) => state.error
);

export const selectUiLocked = createSelector(
  [selectDocumentCountState],
  (state) => state.uiLocked
);

export const selectOperationsInProgress = (leadId: string) =>
  createSelector(
    [selectDocumentCountState],
    (state) => state.operationsInProgress[leadId] || []
  );

export const selectIsOperationInProgress = (
  leadId: string,
  operation: string
) =>
  createSelector([selectDocumentCountState], (state) =>
    (state.operationsInProgress[leadId] || []).includes(operation)
  );

// Utility selectors
export const selectAllDocumentCounts = createSelector(
  [selectDocumentCountState],
  (state) => state.items
);

export const selectLoadingLeads = createSelector(
  [selectDocumentCountState],
  (state) => Object.keys(state.loading)
);

export const selectErrorLeads = createSelector(
  [selectDocumentCountState],
  (state) => Object.keys(state.errors)
);

export const selectLeadWithDocumentCount = (leadId: string) =>
  createSelector([selectDocumentCountState], (state) => ({
    leadId,
    count: state.items[leadId] || 0,
    loading: state.loading[leadId] || false,
    error: state.errors[leadId] || null,
    lastSync: state.lastSync[leadId] || null,
    operationsInProgress: state.operationsInProgress[leadId] || [],
  }));
