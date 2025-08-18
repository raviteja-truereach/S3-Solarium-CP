/**
 * Master Data Hook
 * Enhanced interface for accessing master data with comprehensive error handling
 */
import { useMemo } from 'react';
import { useGetMasterDataQuery } from '../store/api/masterDataApi';
import type { MasterData } from '../types/api/masterData';

interface UseMasterDataResult {
  masterData: MasterData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: string | undefined;
  refetch: () => void;
  isCached: boolean;
  // Specific data accessors
  panels: MasterData['panels'] | undefined;
  inverters: MasterData['inverters'] | undefined;
  states: MasterData['states'] | undefined;
  discoms: MasterData['discoms'] | undefined;
  subsidyRules: MasterData['subsidyRules'] | undefined;
}

/**
 * Transform technical errors to user-friendly messages
 */
const transformMasterDataError = (error: any): string => {
  if (!error) return 'Unknown error occurred';

  // Handle RTK Query errors
  if (error.status) {
    switch (error.status) {
      case 401:
        return 'Session expired. Please login again.';
      case 403:
        return 'Access denied. Contact administrator.';
      case 404:
        return 'Product catalog not found. Contact support.';
      case 500:
        return 'Server error loading product data. Try again later.';
      case 503:
        return 'Product catalog temporarily unavailable. Please retry.';
      case 'FETCH_ERROR':
        return 'Network error. Check your connection and try again.';
      case 'PARSING_ERROR':
        return 'Invalid data format received. Contact support.';
      case 'TIMEOUT_ERROR':
        return 'Request timed out. Please try again.';
      default:
        return 'Failed to load product catalog. Please try again.';
    }
  }

  // Handle error messages
  if (error.data?.message) {
    return error.data.message;
  }

  if (error.message) {
    return error.message;
  }

  return 'Unable to load product catalog. Please check your connection and try again.';
};

export const useMasterData = (): UseMasterDataResult => {
  const {
    data: masterData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    isSuccess,
  } = useGetMasterDataQuery(undefined, {
    // Stale time of 24 hours
    refetchOnMountOrArgChange: 24 * 60 * 60,
    refetchOnFocus: false,
    refetchOnReconnect: true,
  });

  // Transform error message
  const userFriendlyError = useMemo(() => {
    return error ? transformMasterDataError(error) : undefined;
  }, [error]);

  return {
    masterData,
    isLoading: isLoading || isFetching,
    isError,
    error: userFriendlyError,
    refetch,
    isCached: isSuccess && !isLoading && !isFetching,
    // Specific data accessors for convenience
    panels: masterData?.panels,
    inverters: masterData?.inverters,
    states: masterData?.states,
    discoms: masterData?.discoms,
    subsidyRules: masterData?.subsidyRules,
  };
};

export default useMasterData;
