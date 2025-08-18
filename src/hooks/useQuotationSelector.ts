/**
 * Quotation Selector Hooks
 * Custom hooks using quotation selectors following leadSlice patterns
 */
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import {
  selectQuotationsByLead,
  selectQuotationById,
  selectWizardState,
  selectQuotationStats,
  selectFilteredQuotations,
  selectWizardProgress,
  selectQuotationsArray,
  selectQuotationLoading,
  selectQuotationError,
  selectQuotationSummaryData,
  selectQuotationPagination,
  selectQuotationsLoaded,
} from '../store/selectors/quotationSelectors';

export const useQuotations = () => {
  return useSelector(selectQuotationsArray);
};

export const useQuotationsByLead = (leadId: string) => {
  return useSelector((state: RootState) =>
    selectQuotationsByLead(state, leadId)
  );
};

export const useQuotationById = (quotationId: string) => {
  return useSelector((state: RootState) =>
    selectQuotationById(state, quotationId)
  );
};

export const useWizardState = () => {
  return useSelector(selectWizardState);
};

export const useQuotationStats = () => {
  return useSelector(selectQuotationStats);
};

export const useFilteredQuotations = () => {
  return useSelector(selectFilteredQuotations);
};

export const useWizardProgress = () => {
  return useSelector(selectWizardProgress);
};

export const useQuotationLoading = () => {
  return useSelector(selectQuotationLoading);
};

export const useQuotationError = () => {
  return useSelector(selectQuotationError);
};

export const useQuotationSummaryData = () => {
  return useSelector(selectQuotationSummaryData);
};

export const useQuotationPagination = () => {
  return useSelector(selectQuotationPagination);
};

export const useQuotationsLoaded = () => {
  return useSelector(selectQuotationsLoaded);
};
