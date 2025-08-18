/**
 * API Module Exports
 * Barrel file for all API-related exports
 */
export { baseApi } from './baseApi';
export {
  authApi,
  useRequestOtpMutation,
  useVerifyOtpMutation,
} from './authApi';
export { dashboardApi, useGetDashboardSummaryQuery } from './dashboardApi';
export { leadApi, useGetLeadsQuery } from './leadApi';

// Re-export RTK Query utilities for convenience
export {
  createApi,
  fetchBaseQuery,
  setupListeners,
} from '@reduxjs/toolkit/query/react';

// Export types
export type {
  DashboardSummary,
  DashboardSummaryResponse,
  LeadsApiResponse,
  LeadsData,
  GetLeadsParams,
  ApiLead,
} from '../../types/api';

// Export lead slice types
export type { UpsertLeadsPayload } from '../slices/leadSlice';

// Export all selectors
export * from '../selectors/leadSelectors';
export {
  // New actions
  upsertLeads,
  clearPages,
  // Legacy selectors for backward compatibility
  selectLeads,
  selectLeadsLoading,
  selectLeadsError,
  selectLeadsLastSync,
  selectLeadsTotalCount,
  selectLeadsFilters,
  selectLeadsByStatus,
  selectLeadsByCustomer,
  selectPendingLeads,
} from '../slices/leadSlice';

export { default as masterDataApi } from './masterDataApi';

export { default as quotationApi } from './quotationApi';
export { default as documentApi } from './documentApi';
