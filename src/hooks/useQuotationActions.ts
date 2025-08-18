/**
 * Custom hook for quotation actions (share, accept, reject)
 * Enhanced with comprehensive error handling and user feedback
 */
import { useMemo, useCallback } from 'react';
import Toast from 'react-native-toast-message';
import {
  useShareQuotationMutation,
  useAcceptQuotationMutation,
  useRejectQuotationMutation,
} from '../store/api/quotationApi';

interface UseQuotationActionsResult {
  shareQuotation: (quotationId: string) => Promise<void>;
  acceptQuotation: (quotationId: string) => Promise<void>;
  rejectQuotation: (quotationId: string) => Promise<void>;
  isSharing: boolean;
  isAccepting: boolean;
  isRejecting: boolean;
  error: string | undefined;
  isLoading: boolean;
}

/**
 * Transform technical errors to user-friendly messages
 */
const transformActionError = (error: any, action: string): string => {
  if (!error) return `Unknown error occurred while ${action} quotation`;

  // Handle RTK Query errors
  if (error.status) {
    switch (error.status) {
      case 400:
        return `Invalid request. Cannot ${action} this quotation.`;
      case 401:
        return 'Session expired. Please login again.';
      case 403:
        return `You do not have permission to ${action} this quotation.`;
      case 404:
        return 'Quotation not found. It may have been deleted.';
      case 409:
        return `Quotation cannot be ${action}ed in its current state.`;
      case 500:
        return `Server error ${action}ing quotation. Try again later.`;
      case 503:
        return 'Service temporarily unavailable. Please retry.';
      case 'FETCH_ERROR':
        return 'Network error. Check your connection and try again.';
      case 'PARSING_ERROR':
        return 'Invalid response format. Contact support.';
      case 'TIMEOUT_ERROR':
        return 'Request timed out. Please try again.';
      default:
        return `Failed to ${action} quotation. Please try again.`;
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

  return `Unable to ${action} quotation. Please try again.`;
};

export const useQuotationActions = (): UseQuotationActionsResult => {
  const [shareQuotationMutation, { isLoading: isSharing, error: shareError }] =
    useShareQuotationMutation();
  const [
    acceptQuotationMutation,
    { isLoading: isAccepting, error: acceptError },
  ] = useAcceptQuotationMutation();
  const [
    rejectQuotationMutation,
    { isLoading: isRejecting, error: rejectError },
  ] = useRejectQuotationMutation();

  const shareQuotation = useCallback(
    async (quotationId: string) => {
      try {
        await shareQuotationMutation(quotationId).unwrap();
        Toast.show({
          type: 'success',
          text1: 'Quotation Shared',
          text2: 'Quotation has been shared with the customer',
          visibilityTime: 3000,
        });
      } catch (error) {
        const errorMessage = transformActionError(error, 'share');
        Toast.show({
          type: 'error',
          text1: 'Share Failed',
          text2: errorMessage,
          visibilityTime: 4000,
        });
        throw error;
      }
    },
    [shareQuotationMutation]
  );

  const acceptQuotation = useCallback(
    async (quotationId: string) => {
      try {
        await acceptQuotationMutation(quotationId).unwrap();
        Toast.show({
          type: 'success',
          text1: 'Quotation Accepted',
          text2: 'Quotation has been accepted successfully',
          visibilityTime: 3000,
        });
      } catch (error) {
        const errorMessage = transformActionError(error, 'accept');
        Toast.show({
          type: 'error',
          text1: 'Accept Failed',
          text2: errorMessage,
          visibilityTime: 4000,
        });
        throw error;
      }
    },
    [acceptQuotationMutation]
  );

  const rejectQuotation = useCallback(
    async (quotationId: string) => {
      try {
        await rejectQuotationMutation(quotationId).unwrap();
        Toast.show({
          type: 'success',
          text1: 'Quotation Rejected',
          text2: 'Quotation has been rejected',
          visibilityTime: 3000,
        });
      } catch (error) {
        const errorMessage = transformActionError(error, 'reject');
        Toast.show({
          type: 'error',
          text1: 'Reject Failed',
          text2: errorMessage,
          visibilityTime: 4000,
        });
        throw error;
      }
    },
    [rejectQuotationMutation]
  );

  // Transform error messages
  const userFriendlyError = useMemo(() => {
    if (shareError) return transformActionError(shareError, 'share');
    if (acceptError) return transformActionError(acceptError, 'accept');
    if (rejectError) return transformActionError(rejectError, 'reject');
    return undefined;
  }, [shareError, acceptError, rejectError]);

  return {
    shareQuotation,
    acceptQuotation,
    rejectQuotation,
    isSharing,
    isAccepting,
    isRejecting,
    error: userFriendlyError,
    isLoading: isSharing || isAccepting || isRejecting,
  };
};

export default useQuotationActions;
