/**
 * Custom hook for getting quotation details by ID
 * Enhanced with comprehensive error handling
 */
import { useMemo } from 'react';
import { useGetQuotationByIdQuery } from '../store/api/quotationApi';
import type { QuotationDetailApi } from '../types/api/quotation';

interface UseQuotationDetailResult {
  quotation: QuotationDetailApi | undefined;
  loading: boolean;
  error: string | undefined;
  refetch: () => void;
  isError: boolean;
}

/**
 * Transform technical errors to user-friendly messages
 */
const transformQuotationError = (error: any): string => {
  if (!error) return 'Unknown error occurred';

  // Handle RTK Query errors
  if (error.status) {
    switch (error.status) {
      case 400:
        return 'Invalid quotation ID provided.';
      case 401:
        return 'Session expired. Please login again.';
      case 403:
        return 'You do not have permission to view this quotation.';
      case 404:
        return 'Quotation not found. It may have been deleted.';
      case 500:
        return 'Server error loading quotation. Try again later.';
      case 503:
        return 'Service temporarily unavailable. Please retry.';
      case 'FETCH_ERROR':
        return 'Network error. Check your connection and try again.';
      case 'PARSING_ERROR':
        return 'Invalid response format. Contact support.';
      case 'TIMEOUT_ERROR':
        return 'Request timed out. Please try again.';
      default:
        return 'Failed to load quotation details. Please try again.';
    }
  }

  // Handle error messages
  if (error.data?.error) {
    return error.data.error;
  }

  if (error.data?.message) {
    return error.data.message;
  }

  if (error.message) {
    return error.message;
  }

  return 'Unable to load quotation details. Please try again.';
};

export const useQuotationDetail = (
  quotationId: string
): UseQuotationDetailResult => {
  const {
    data: quotation,
    isLoading: loading,
    error,
    refetch,
    isError,
  } = useGetQuotationByIdQuery(quotationId, {
    skip: !quotationId,
  });

  // Transform error message
  const userFriendlyError = useMemo(() => {
    return error ? transformQuotationError(error) : undefined;
  }, [error]);

  return {
    quotation,
    loading,
    error: userFriendlyError,
    refetch,
    isError,
  };
};

export default useQuotationDetail;
