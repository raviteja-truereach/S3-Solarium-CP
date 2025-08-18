/**
 * Quotation Selectors
 * Memoized selectors following leadSlice patterns
 */
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type { Quotation } from '../../types/api/quotation';
import type { QuotationStatus } from '../../types/api/quotation';

// Base selectors
export const selectQuotationState = (state: RootState) => state.quotation;

export const selectQuotationItems = (state: RootState) => state.quotation.items;

export const selectQuotationDetails = (state: RootState) =>
  state.quotation.quotationDetails;

export const selectWizardState = (state: RootState) => state.quotation.wizard;

export const selectQuotationLoading = (state: RootState) =>
  state.quotation.isLoading;

export const selectQuotationLoadingNext = (state: RootState) =>
  state.quotation.loadingNext;

export const selectQuotationError = (state: RootState) => state.quotation.error;

export const selectQuotationFilters = (state: RootState) =>
  state.quotation.filters;

export const selectQuotationSearchText = (state: RootState) =>
  state.quotation.searchText;

export const selectQuotationSummaryData = (state: RootState) =>
  state.quotation.summaryData;

export const selectQuotationPagination = (state: RootState) => ({
  pagesLoaded: state.quotation.pagesLoaded,
  totalPages: state.quotation.totalPages,
  totalCount: state.quotation.totalCount,
  hasMore: state.quotation.hasMore,
});

// Derived selectors following leadSlice patterns

/**
 * Get all quotations as an array (from normalized items)
 */
export const selectQuotationsArray = createSelector(
  [selectQuotationItems],
  (items) => {
    return Object.values(items).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
);

/**
 * Get quotations filtered by lead ID
 */
export const selectQuotationsByLead = createSelector(
  [selectQuotationsArray, (state: RootState, leadId: string) => leadId],
  (quotations, leadId) => {
    return quotations.filter((quotation) => quotation.leadId === leadId);
  }
);

/**
 * Get quotations filtered by status
 */
export const selectQuotationsByStatus = createSelector(
  [
    selectQuotationsArray,
    (state: RootState, status: QuotationStatus) => status,
  ],
  (quotations, status) => {
    return quotations.filter((quotation) => quotation.status === status);
  }
);

/**
 * Get single quotation by ID
 */
export const selectQuotationById = createSelector(
  [
    selectQuotationItems,
    (state: RootState, quotationId: string) => quotationId,
  ],
  (items, quotationId) => {
    return items[quotationId];
  }
);

/**
 * Get detailed quotation by ID
 */
export const selectQuotationDetailById = createSelector(
  [
    selectQuotationDetails,
    (state: RootState, quotationId: string) => quotationId,
  ],
  (quotationDetails, quotationId) => {
    return quotationDetails[quotationId];
  }
);

/**
 * Get filtered quotations based on current filters and search
 */
export const selectFilteredQuotations = createSelector(
  [selectQuotationsArray, selectQuotationFilters, selectQuotationSearchText],
  (quotations, filters, searchText) => {
    let filtered = quotations;

    // Filter by lead ID
    if (filters.leadId) {
      filtered = filtered.filter(
        (quotation) => quotation.leadId === filters.leadId
      );
    }

    // Filter by status
    if (filters.statuses.length > 0) {
      filtered = filtered.filter((quotation) =>
        filters.statuses.includes(quotation.status)
      );
    }

    // Filter by date range
    if (filters.dateRange?.from || filters.dateRange?.to) {
      filtered = filtered.filter((quotation) => {
        const quotationDate = new Date(quotation.createdAt);
        const fromDate = filters.dateRange?.from
          ? new Date(filters.dateRange.from)
          : null;
        const toDate = filters.dateRange?.to
          ? new Date(filters.dateRange.to)
          : null;

        if (fromDate && quotationDate < fromDate) return false;
        if (toDate && quotationDate > toDate) return false;
        return true;
      });
    }

    // Filter by search text (quotation ID, system KW, or Lead ID)
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(
        (quotation) =>
          quotation.quotationId.toLowerCase().includes(searchLower) ||
          quotation.systemKW.toString().includes(searchLower) ||
          quotation.leadId.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }
);

/**
 * Get quotation statistics
 */
export const selectQuotationStats = createSelector(
  [selectQuotationsArray],
  (quotations) => {
    const stats = {
      total: quotations.length,
      generated: 0,
      shared: 0,
      accepted: 0,
      rejected: 0,
    };

    quotations.forEach((quotation) => {
      switch (quotation.status) {
        case 'Generated':
          stats.generated++;
          break;
        case 'Shared':
          stats.shared++;
          break;
        case 'Accepted':
          stats.accepted++;
          break;
        case 'Rejected':
          stats.rejected++;
          break;
      }
    });

    return stats;
  }
);

/**
 * Get wizard progress information
 */
export const selectWizardProgress = createSelector(
  [selectWizardState],
  (wizard) => {
    return {
      currentStep: wizard.currentStep,
      totalSteps: 7,
      progress: Math.round((wizard.currentStep / 7) * 100),
      isComplete: wizard.currentStep === 7 && wizard.isValid,
      canProceed: wizard.isValid && wizard.currentStep < 7,
    };
  }
);

/**
 * Get recent quotations (last 5)
 */
export const selectRecentQuotations = createSelector(
  [selectQuotationsArray],
  (quotations) => {
    return quotations.slice(0, 5);
  }
);

/**
 * Check if quotations are loaded for current filters
 */
export const selectQuotationsLoaded = createSelector(
  [selectQuotationPagination],
  (pagination) => {
    return pagination.pagesLoaded.length > 0;
  }
);

/**
 * Get quotation counts by lead
 */
export const selectQuotationCountsByLead = createSelector(
  [selectQuotationsArray],
  (quotations) => {
    const counts: Record<string, number> = {};
    quotations.forEach((quotation) => {
      counts[quotation.leadId] = (counts[quotation.leadId] || 0) + 1;
    });
    return counts;
  }
);
