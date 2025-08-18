/**
 * Hooks Export Index
 * Centralized exports for all custom hooks
 */
export { useAppDispatch, useAppSelector } from './reduxHooks';
export type { UsePullToRefreshReturn } from './usePullToRefresh';
export type { UseDashboardRefreshReturn } from './useDashboardRefresh';

// Lead hooks
export { default as usePaginatedLeads } from './usePaginatedLeads';
export { default as useLeadsRefresh } from './useLeadsRefresh';
export { default as useLeadById } from './useLeadById';

// Dashboard hooks
export { default as useDashboardRefresh } from './useDashboardRefresh';
export { default as usePullToRefresh } from './usePullToRefresh';

// Quotation hooks - Core functionality
export { default as useQuotations, useCreateQuotation } from './useQuotations'; // ✅ ADD
export { default as useQuotationDetail } from './useQuotationDetail';
export { default as useQuotationActions } from './useQuotationActions';
export { default as useQuotationsByLead } from './useQuotationsByLead';
export { default as useQuotationWizard } from './useQuotationWizard'; // ✅ ADD

// Quotation hooks - Selector-based
export * from './useQuotationSelector';

// Master data hooks
export { default as useMasterData } from './useMasterData';

// Utility hooks
export { useThemeToggle } from './useThemeToggle';
export { useDatabase } from './useDatabase';

// ADD to existing exports
export { useDocumentCount } from './useDocumentCount';
export type {
  UseDocumentCountReturn,
  UseDocumentCountOptions,
} from './useDocumentCount';
