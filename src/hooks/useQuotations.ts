/**
 * Quotations Hook
 * Comprehensive hook for quotation list management with error handling
 */
import { useCallback, useMemo } from 'react';
import {
  useGetQuotationsQuery,
  useCreateQuotationMutation,
} from '../store/api/quotationApi';
import { useAppSelector, useAppDispatch } from './reduxHooks';
import {
  selectFilteredQuotations,
  selectQuotationLoading,
  selectQuotationError,
  selectQuotationStats,
} from '../store/selectors/quotationSelectors';
import { setFilters, setSearchText } from '../store/slices/quotationSlice';
import type {
  QuotationQueryParams,
  CreateQuotationApiRequest,
  QuotationStatus,
} from '../types/api/quotation';

interface UseQuotationsResult {
  quotations: any[];
  loading: boolean;
  error: string | undefined;
  refetch: () => void;
  stats: {
    total: number;
    generated: number;
    shared: number;
    accepted: number;
    rejected: number;
  };
  // Filtering functions
  setStatusFilter: (statuses: QuotationStatus[]) => void;
  setLeadFilter: (leadId: string | null) => void;
  setSearchFilter: (searchText: string) => void;
  clearFilters: () => void;
}

interface UseCreateQuotationResult {
  createQuotation: (
    data: CreateQuotationApiRequest
  ) => Promise<{ quotationId: string }>;
  isCreating: boolean;
  error: string | undefined;
}

/**
 * Transform technical errors to user-friendly messages
 */
const transformError = (error: any): string => {
  if (!error) return 'Unknown error occurred';

  // Handle RTK Query errors
  if (error.status) {
    switch (error.status) {
      case 400:
        return 'Invalid quotation data. Please check your input.';
      case 401:
        return 'Session expired. Please login again.';
      case 403:
        return 'You do not have permission to access quotations.';
      case 404:
        return 'Quotations not found.';
      case 409:
        return 'Quotation already exists or cannot be created.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please retry.';
      case 'FETCH_ERROR':
        return 'Network error. Check your connection.';
      case 'PARSING_ERROR':
        return 'Invalid response format. Contact support.';
      case 'TIMEOUT_ERROR':
        return 'Request timed out. Please try again.';
      default:
        return 'Failed to load quotations. Please try again.';
    }
  }

  // Handle error messages
  if (error.data?.message) {
    return error.data.message;
  }

  if (error.message) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
};

/**
 * Hook for quotation list management
 */
export const useQuotations = (
  params?: QuotationQueryParams
): UseQuotationsResult => {
  const dispatch = useAppDispatch();

  // RTK Query for API data
  const {
    data: apiQuotations = [],
    isLoading,
    error: apiError,
    refetch,
  } = useGetQuotationsQuery(params || { offset: 0, limit: 25 }, {
    skip: !params?.leadId, // Only fetch if leadId is provided
  });

  // Redux selectors for local state
  const filteredQuotations = useAppSelector(selectFilteredQuotations);
  const localLoading = useAppSelector(selectQuotationLoading);
  const localError = useAppSelector(selectQuotationError);
  const stats = useAppSelector(selectQuotationStats);

  // Determine which data source to use
  const quotations = params?.leadId ? apiQuotations : filteredQuotations;
  const loading = params?.leadId ? isLoading : localLoading;
  const error = params?.leadId ? apiError : localError;

  // Filter management functions
  const setStatusFilter = useCallback(
    (statuses: QuotationStatus[]) => {
      dispatch(setFilters({ statuses }));
    },
    [dispatch]
  );

  const setLeadFilter = useCallback(
    (leadId: string | null) => {
      dispatch(setFilters({ leadId }));
    },
    [dispatch]
  );

  const setSearchFilter = useCallback(
    (searchText: string) => {
      dispatch(setSearchText(searchText));
    },
    [dispatch]
  );

  const clearFilters = useCallback(() => {
    dispatch(setFilters({ statuses: [], leadId: undefined }));
    dispatch(setSearchText(''));
  }, [dispatch]);

  // Transform error message
  const userFriendlyError = useMemo(() => {
    return error ? transformError(error) : undefined;
  }, [error]);

  return {
    quotations,
    loading,
    error: userFriendlyError,
    refetch,
    stats,
    setStatusFilter,
    setLeadFilter,
    setSearchFilter,
    clearFilters,
  };
};

/**
 * Hook for creating quotations
 */
export const useCreateQuotation = (): UseCreateQuotationResult => {
  const [createQuotationMutation, { isLoading: isCreating, error }] =
    useCreateQuotationMutation();

  const createQuotation = useCallback(
    async (data: CreateQuotationApiRequest) => {
      try {
        const result = await createQuotationMutation(data).unwrap();
        return result;
      } catch (error) {
        // Error is already handled by RTK Query and will be available in the error state
        throw error;
      }
    },
    [createQuotationMutation]
  );

  // Transform error message
  const userFriendlyError = useMemo(() => {
    return error ? transformError(error) : undefined;
  }, [error]);

  return {
    createQuotation,
    isCreating,
    error: userFriendlyError,
  };
};

export default useQuotations;
