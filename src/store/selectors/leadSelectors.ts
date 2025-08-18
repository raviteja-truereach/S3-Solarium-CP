/**
 * Lead Selectors - Updated with all required selectors
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../types';
import type { Lead } from '../../database/models/Lead';

/**
 * Select the lead state
 */
export const selectLeadState = (state: RootState) => state.lead;

/**
 * Select all leads as an array
 */
export const selectAllLeads = createSelector([selectLeadState], (leadState) => {
  if (!leadState?.items) return [];
  return Object.values(leadState.items);
});

/**
 * Select paginated leads (same as selectAllLeads for now)
 */
export const selectPaginatedLeads = createSelector(
  [selectAllLeads],
  (leads) => leads
);

/**
 * Select pagination metadata
 */
export const selectPaginationMeta = createSelector(
  [selectLeadState],
  (leadState) => ({
    pagesLoaded: leadState?.pagesLoaded || [],
    totalPages: leadState?.totalPages || 0,
    totalCount: leadState?.totalCount || 0,
    loadingNext: leadState?.loadingNext || false,
    hasMore: leadState?.hasMore || true,
    isPageLoaded: (page: number) =>
      leadState?.pagesLoaded.includes(page) || false,
  })
);

/**
 * Select loading states for pagination
 */
export const selectPaginationLoading = createSelector(
  [selectLeadState],
  (leadState) => ({
    isLoading: leadState?.isLoading || false,
    loadingNext: leadState?.loadingNext || false,
    isAnyLoading: leadState?.isLoading || leadState?.loadingNext || false,
  })
);

/**
 * Select if more leads can be loaded
 */
export const selectCanLoadMore = createSelector(
  [selectLeadState],
  (leadState) => {
    if (!leadState) return false;

    // Fix: Make sure we have proper boolean values
    const hasMore = leadState.hasMore ?? true;
    const loadingNext = leadState.loadingNext ?? false;
    const isLoading = leadState.isLoading ?? false;

    return hasMore && !loadingNext && !isLoading;
  }
);

/**
 * Select last sync timestamp - ADD THIS MISSING SELECTOR
 */
export const selectLastSync = createSelector(
  [selectLeadState],
  (leadState) => leadState?.lastSync || null
);

/**
 * Select current error state
 */
export const selectLeadError = createSelector(
  [selectLeadState],
  (leadState) => leadState?.error || null
);

/**
 * Select loading state
 */
export const selectLeadLoading = createSelector(
  [selectLeadState],
  (leadState) => leadState?.isLoading || false
);

/**
 * Select a lead by ID
 */
export const selectLeadById = createSelector(
  [selectLeadState, (_state: RootState, leadId: string) => leadId],
  (leadState, leadId) => leadState?.items?.[leadId] || null
);

/**
 * Select leads by status
 */
export const selectLeadsByStatus = createSelector(
  [selectAllLeads, (_state: RootState, status: string) => status],
  (leads, status) => leads.filter((lead) => lead.status === status)
);

/**
 * Select leads count
 */
export const selectLeadsCount = createSelector(
  [selectAllLeads],
  (leads) => leads.length
);

/**
 * Select leads that need sync
 */
export const selectLeadsNeedingSync = createSelector(
  [selectAllLeads],
  (leads) => leads.filter((lead) => lead.sync_status !== 'synced')
);

/**
 * Select search text
 */
export const selectSearchText = createSelector(
  [selectLeadState],
  (leadState) => leadState?.searchText || ''
);

/**
 * Select current filters
 */
export const selectFilters = createSelector(
  [selectLeadState],
  (leadState) => leadState?.filters || { statuses: [], dateRange: undefined }
);

/**
 * Helper function to check if a lead matches search criteria
 */
const matchesSearch = (lead: Lead, searchText: string): boolean => {
  if (!searchText.trim()) return true;

  const searchLower = searchText.toLowerCase().trim();
  const searchFields = [
    lead.customerName || '',
    lead.phone || '',
    lead.address || '',
    lead.status || '',
    lead.email || '',
    lead.id || '',
  ];

  return searchFields.some((field) =>
    field.toLowerCase().includes(searchLower)
  );
};

/**
 * Helper function to check if a lead matches status filters
 */
const matchesStatusFilter = (lead: Lead, statuses: string[]): boolean => {
  if (!statuses.length) return true;
  return statuses.includes(lead.status);
};

/**
 * Helper function to check if a lead matches date range filter
 */
const matchesDateFilter = (
  lead: Lead,
  dateRange?: { from?: string; to?: string }
): boolean => {
  if (!dateRange || (!dateRange.from && !dateRange.to)) return true;

  const leadDate = lead.created_at;
  if (!leadDate) return false;

  try {
    const leadTimestamp = new Date(leadDate).getTime();

    if (dateRange.from) {
      const fromTimestamp = new Date(dateRange.from).getTime();
      if (leadTimestamp < fromTimestamp) return false;
    }

    if (dateRange.to) {
      const toTimestamp = new Date(dateRange.to).getTime();
      if (leadTimestamp > toTimestamp) return false;
    }

    return true;
  } catch (error) {
    console.warn('Date filter error:', error);
    return false;
  }
};

/**
 * Terminal status check - leads in these statuses are considered closed
 */
const TERMINAL_STATUSES = [
  'Executed',
  'Not Responding',
  'Not Interested',
  'Other Territory',
];

const isTerminalStatus = (status: string): boolean => {
  return TERMINAL_STATUSES.includes(status);
};

/**
 * Helper function to check if a lead is overdue
 */
const isOverdue = (lead: Lead): boolean => {
  if (!lead.follow_up_date || isTerminalStatus(lead.status)) {
    return false;
  }

  try {
    const followUpDate = new Date(lead.follow_up_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    return followUpDate.getTime() < today.getTime();
  } catch (error) {
    return false;
  }
};

/**
 * Memoized selector for filtered leads
 * Returns leads matching search text and filters
 * Performance target: ≤ 10ms for ≤ 500 records
 */
export const selectFilteredLeads = createSelector(
  [selectAllLeads, selectSearchText, selectFilters],
  (leads, searchText, filters) => {
    const startTime = performance.now();

    const filteredLeads = leads.filter((lead) => {
      return (
        matchesSearch(lead, searchText) &&
        matchesStatusFilter(lead, filters.statuses) &&
        matchesDateFilter(lead, filters.dateRange)
      );
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Log performance for monitoring
    if (duration > 10) {
      console.warn(
        `⚠️ selectFilteredLeads took ${duration.toFixed(2)}ms (target: ≤10ms)`
      );
    } else if (__DEV__) {
      console.log(
        `✅ selectFilteredLeads: ${filteredLeads.length}/${
          leads.length
        } leads in ${duration.toFixed(2)}ms`
      );
    }

    return filteredLeads;
  }
);

/**
 * Select active filter count (for badge display)
 */
export const selectActiveFilterCount = createSelector(
  [selectSearchText, selectFilters],
  (searchText, filters) => {
    let count = 0;

    if (searchText.trim()) count++;
    if (filters.statuses.length > 0) count++;
    if (filters.dateRange?.from || filters.dateRange?.to) count++;

    return count;
  }
);

/**
 * Select summary data from API
 */
export const selectSummaryData = createSelector(
  [selectLeadState],
  (leadState) => leadState?.summaryData
);

/**
 * Select overdue count from summary data as fallback
 */
export const selectOverdueCountFromSummary = createSelector(
  [selectSummaryData],
  (summaryData) => summaryData?.overdue || 0
);

/**
 * Enhanced overdue count selector with fallback to summary data
 */
export const selectOverdueCount = createSelector(
  [selectAllLeads, selectOverdueCountFromSummary],
  (leads, summaryOverdueCount) => {
    const startTime = performance.now();
    console.log('🔍 selectOverdueCount - leads count:', leads.length);
    console.log(
      '🔍 selectOverdueCount - summary overdue:',
      summaryOverdueCount
    );

    // ✅ IF WE HAVE ACTUAL LEADS DATA, CALCULATE FROM LEADS
    if (leads.length > 0) {
      const overdueCount = leads.filter(isOverdue).length;
      console.log(
        '✅ Using calculated overdue count from leads:',
        overdueCount
      );
      return overdueCount;
    }

    // ✅ FALLBACK TO SUMMARY DATA IF NO LEADS LOADED YET
    console.log(
      '✅ Using overdue count from API summary:',
      summaryOverdueCount
    );
    return summaryOverdueCount;
  }
);
