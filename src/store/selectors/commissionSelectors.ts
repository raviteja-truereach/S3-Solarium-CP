/**
 * Commission Selectors - Following Customer Selectors Pattern
 * Memoized selectors for commission state with pagination support and KPI calculations
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type {
  Commission,
  CommissionKPIStats,
} from '../../database/models/Commission';
import { isDateInRange } from '../../utils/dateHelpers';

/**
 * Select the commission state
 */
export const selectCommissionState = (state: RootState) => state.commissions;

/**
 * Select all commissions as an array
 */
export const selectAllCommissions = createSelector(
  [selectCommissionState],
  (commissionState) => {
    if (!commissionState?.items) return [];
    return Object.values(commissionState.items);
  }
);

/**
 * Select paginated commissions (same as selectAllCommissions for consistency)
 */
export const selectPaginatedCommissions = createSelector(
  [selectAllCommissions],
  (commissions) => commissions
);

/**
 * Select pagination metadata
 */
export const selectPaginationMeta = createSelector(
  [selectCommissionState],
  (commissionState) => ({
    pagesLoaded: commissionState?.pagesLoaded || [],
    totalPages: commissionState?.totalPages || 0,
    totalCount: commissionState?.totalCount || 0,
    loadingNext: commissionState?.loadingNext || false,
    hasMore: commissionState?.hasMore || true,
    error: commissionState?.error || null,
    isPageLoaded: (page: number) =>
      commissionState?.pagesLoaded.includes(page) || false,
  })
);

/**
 * Select loading states for pagination
 */
export const selectPaginationLoading = createSelector(
  [selectCommissionState],
  (commissionState) => ({
    isLoading: commissionState?.isLoading || false,
    loadingNext: commissionState?.loadingNext || false,
    isAnyLoading:
      commissionState?.isLoading || commissionState?.loadingNext || false,
  })
);

/**
 * Select if more commissions can be loaded
 */
export const selectCanLoadMore = createSelector(
  [selectCommissionState],
  (commissionState) => {
    if (!commissionState) return false;

    const hasMore = commissionState.hasMore ?? true;
    const loadingNext = commissionState.loadingNext ?? false;
    const isLoading = commissionState.isLoading ?? false;

    return hasMore && !loadingNext && !isLoading;
  }
);

/**
 * Select last sync timestamp
 */
export const selectLastSync = createSelector(
  [selectCommissionState],
  (commissionState) => commissionState?.lastSync || null
);

/**
 * Select current error state
 */
export const selectCommissionError = createSelector(
  [selectCommissionState],
  (commissionState) => commissionState?.error || null
);

/**
 * Select loading state
 */
export const selectCommissionLoading = createSelector(
  [selectCommissionState],
  (commissionState) => commissionState?.isLoading || false
);

/**
 * Select a commission by ID
 */
export const selectCommissionById = createSelector(
  [
    selectCommissionState,
    (_state: RootState, commissionId: string) => commissionId,
  ],
  (commissionState, commissionId) =>
    commissionState?.items?.[commissionId] || null
);

/**
 * Select search term
 */
export const selectSearchTerm = createSelector(
  [selectCommissionState],
  (commissionState) => commissionState?.searchTerm || ''
);

/**
 * Select current filters
 */
export const selectFilters = createSelector(
  [selectCommissionState],
  (commissionState) => commissionState?.filters || {}
);

/**
 * Select active filter state for components
 */
export const selectActiveFilters = createSelector(
  [selectFilters, selectSearchTerm],
  (filters, searchTerm) => ({
    dateRange: filters.dateRange,
    statuses: filters.statuses || [],
    leadId: filters.leadId,
    searchTerm,
    hasDateRange: !!filters.dateRange,
    hasStatusFilter: !!(filters.statuses && filters.statuses.length > 0),
    hasLeadFilter: !!filters.leadId,
    hasSearchTerm: !!searchTerm.trim(),
  })
);

/**
 * Helper function to check if a commission matches search criteria
 */
const matchesSearch = (commission: Commission, searchTerm: string): boolean => {
  if (!searchTerm.trim()) return true;

  const searchLower = searchTerm.toLowerCase().trim();
  const searchFields = [
    commission.id || '',
    commission.cp_id || '',
    commission.lead_id || '',
    commission.amount.toString() || '',
    commission.status || '',
    commission.description || '',
  ];

  return searchFields.some((field) =>
    field.toLowerCase().includes(searchLower)
  );
};

/**
 * Helper function to check if a commission matches date range filter
 */
const matchesDateRangeFilter = (
  commission: Commission,
  dateRange?: { startDate: string; endDate: string }
): boolean => {
  if (!dateRange) return true;
  return isDateInRange(
    commission.created_at,
    dateRange.startDate,
    dateRange.endDate
  );
};

/**
 * Helper function to check if a commission matches status filter
 */
const matchesStatusFilter = (
  commission: Commission,
  statuses?: string[]
): boolean => {
  if (!statuses || statuses.length === 0) return true;
  return statuses.includes(commission.status);
};

/**
 * Helper function to check if a commission matches lead ID filter
 */
const matchesLeadFilter = (
  commission: Commission,
  leadId?: string
): boolean => {
  if (!leadId) return true;
  return commission.lead_id === leadId;
};

/**
 * Memoized selector for filtered commissions
 * Returns commissions matching search term and filters
 * Performance target: ≤ 10ms for ≤ 500 records
 */
export const selectFilteredCommissions = createSelector(
  [selectAllCommissions, selectSearchTerm, selectFilters],
  (commissions, searchTerm, filters) => {
    const startTime = performance.now();

    const filteredCommissions = commissions.filter((commission) => {
      return (
        matchesSearch(commission, searchTerm) &&
        matchesDateRangeFilter(commission, filters.dateRange) &&
        matchesStatusFilter(commission, filters.statuses) &&
        matchesLeadFilter(commission, filters.leadId)
      );
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Log performance for monitoring
    if (duration > 10) {
      console.warn(
        `⚠️ selectFilteredCommissions took ${duration.toFixed(
          2
        )}ms (target: ≤10ms)`
      );
    } else if (__DEV__) {
      console.log(
        `✅ selectFilteredCommissions: ${filteredCommissions.length}/${
          commissions.length
        } commissions in ${duration.toFixed(2)}ms`
      );
    }

    return filteredCommissions;
  }
);

/**
 * Memoized selector for commission KPIs from filtered data
 * Calculates KPI statistics from currently filtered commissions
 */
export const selectCommissionKPIs = createSelector(
  [selectFilteredCommissions],
  (filteredCommissions): CommissionKPIStats => {
    const startTime = performance.now();

    const kpis = filteredCommissions.reduce(
      (acc, commission) => {
        // Update counts
        acc.totalCount++;

        // Update amounts
        acc.totalCommission += commission.amount;

        // Status-specific calculations
        switch (commission.status) {
          case 'paid':
            acc.paidCommission += commission.amount;
            acc.paidCount++;
            break;
          case 'pending':
            acc.pendingCommission += commission.amount;
            acc.pendingCount++;
            break;
          case 'approved':
            acc.approvedCommission += commission.amount;
            acc.approvedCount++;
            break;
          // 'cancelled' and 'processing' don't contribute to specific totals
        }

        return acc;
      },
      {
        totalCommission: 0,
        paidCommission: 0,
        pendingCommission: 0,
        approvedCommission: 0,
        totalCount: 0,
        paidCount: 0,
        pendingCount: 0,
        approvedCount: 0,
      }
    );

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Log performance for monitoring
    if (duration > 5) {
      console.warn(
        `⚠️ selectCommissionKPIs took ${duration.toFixed(2)}ms (target: ≤5ms)`
      );
    } else if (__DEV__) {
      console.log(
        `✅ selectCommissionKPIs: calculated for ${
          kpis.totalCount
        } commissions in ${duration.toFixed(2)}ms`
      );
    }

    return kpis;
  }
);

/**
 * Select commissions by status
 */
export const selectCommissionsByStatus = createSelector(
  [selectAllCommissions, (_state: RootState, status: string) => status],
  (commissions, status) =>
    commissions.filter((commission) => commission.status === status)
);

/**
 * Select commissions count
 */
export const selectCommissionsCount = createSelector(
  [selectAllCommissions],
  (commissions) => commissions.length
);

/**
 * Select active filter count (for badge display)
 */
export const selectActiveFilterCount = createSelector(
  [selectSearchTerm, selectFilters],
  (searchTerm, filters) => {
    let count = 0;

    if (searchTerm.trim()) count++;
    if (filters.dateRange) count++;
    if (filters.statuses && filters.statuses.length > 0) count++;
    if (filters.leadId) count++;

    return count;
  }
);

/**
 * Select cached KPI totals
 */
export const selectCachedKPITotals = createSelector(
  [selectCommissionState],
  (commissionState) => commissionState?.kpiTotals || null
);

/**
 * Legacy compatibility selectors (keeping existing names)
 */
export const selectFilteredAndSearchedCommissions = selectFilteredCommissions;
