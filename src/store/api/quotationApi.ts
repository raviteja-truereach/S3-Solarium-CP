/**
 * Quotation API
 * RTK Query endpoints for quotation operations with optimistic updates
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from './baseQuery';
import type {
  Quotation,
  QuotationResponse,
  QuotationQueryParams,
  QuotationDetailApi,
  QuotationDetailApiResponse,
  CreateQuotationApiRequest,
  CreateQuotationApiResponse,
  QuotationActionApiResponse,
  QuotationPdfResponse,
  QuotationStatus,
} from '../../types/api/quotation';

/**
 * Quotation API definition
 */
export const quotationApi = createApi({
  reducerPath: 'quotationApi',
  baseQuery: customBaseQuery,
  tagTypes: ['Quotation', 'QuotationDetail', 'QuotationPdf'],
  endpoints: (builder) => ({
    /**
     * Get quotations list with filtering and pagination
     */
    getQuotations: builder.query<Quotation[], QuotationQueryParams>({
      query: (params) => ({
        url: '/api/v1/quotations',
        method: 'GET',
        params: {
          leadId: params.leadId,
          offset: params.offset || 0,
          limit: params.limit || 25,
        },
      }),
      transformResponse: (response: QuotationResponse): Quotation[] => {
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to fetch quotations');
        }
        return response.data.items;
      },
      transformErrorResponse: (error: any): string => {
        return transformQuotationError(error);
      },
      providesTags: (result, error, arg) => [
        { type: 'Quotation', id: 'LIST' },
        { type: 'Quotation', id: arg.leadId },
        ...(result || []).map(({ quotationId }) => ({
          type: 'Quotation' as const,
          id: quotationId,
        })),
      ],
    }),

    /**
     * Get quotation by ID with full details
     */
    getQuotationById: builder.query<QuotationDetailApi, string>({
      query: (quotationId) => ({
        url: `/api/v1/quotations/${quotationId}`,
        method: 'GET',
      }),
      transformResponse: (
        response: QuotationDetailApiResponse
      ): QuotationDetailApi => {
        if (!response.success || !response.data) {
          throw new Error(
            response.error || 'Failed to fetch quotation details'
          );
        }
        return response.data;
      },
      transformErrorResponse: (error: any): string => {
        return transformQuotationError(error);
      },
      providesTags: (result, error, quotationId) => [
        { type: 'QuotationDetail', id: quotationId },
        { type: 'Quotation', id: quotationId },
      ],
    }),

    /**
     * Create new quotation
     */
    createQuotation: builder.mutation<
      { quotationId: string },
      CreateQuotationApiRequest
    >({
      query: (quotationData) => ({
        url: '/api/v1/quotations',
        method: 'POST',
        body: quotationData,
      }),
      transformResponse: (
        response: CreateQuotationApiResponse
      ): { quotationId: string } => {
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to create quotation');
        }
        return response.data;
      },
      transformErrorResponse: (error: any): string => {
        return transformQuotationError(error);
      },
      invalidatesTags: (result, error, arg) => [
        { type: 'Quotation', id: 'LIST' },
        { type: 'Quotation', id: arg.leadId },
      ],
    }),

    /**
     * Share quotation with customer (optimistic update)
     */
    shareQuotation: builder.mutation<void, string>({
      query: (quotationId) => ({
        url: `/api/v1/quotations/${quotationId}/share`,
        method: 'PATCH',
      }),
      transformResponse: (response: QuotationActionApiResponse): void => {
        console.log("shared response", response)
        if (!response.success) {
          throw new Error(response.error || 'Failed to share quotation');
        }
      },
      transformErrorResponse: (error: any): string => {
        console.log("shared error", error)
        return transformQuotationError(error);
      },
      // Optimistic update
      onQueryStarted: async (quotationId, { dispatch, queryFulfilled }) => {
        // Optimistically update the quotation status
        const patchResult = dispatch(
          quotationApi.util.updateQueryData(
            'getQuotationById',
            quotationId,
            (draft) => {
              draft.status = 'Shared';
              draft.sharedAt = new Date().toISOString();
            }
          )
        );

        // Also update the list view
        const listPatchResults: any[] = [];
        dispatch(
          quotationApi.util.updateQueryData(
            'getQuotations',
            { leadId: '' },
            (draft) => {
              const quotation = draft.find(
                (q) => q.quotationId === quotationId
              );
              if (quotation) {
                quotation.status = 'Shared';
              }
            }
          )
        );

        try {
          await queryFulfilled;
        } catch {
          // Revert optimistic update on error
          patchResult.undo();
          listPatchResults.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: (result, error, quotationId) => [
        { type: 'Quotation', id: quotationId },
        { type: 'QuotationDetail', id: quotationId },
      ],
    }),

    /**
     * Accept quotation (optimistic update)
     */
    acceptQuotation: builder.mutation<void, string>({
      query: (quotationId) => ({
        url: `/api/v1/quotations/${quotationId}/accept`,
        method: 'PATCH',
      }),
      transformResponse: (response: QuotationActionApiResponse): void => {
        if (!response.success) {
          throw new Error(response.error || 'Failed to accept quotation');
        }
      },
      transformErrorResponse: (error: any): string => {
        return transformQuotationError(error);
      },
      // Optimistic update
      onQueryStarted: async (quotationId, { dispatch, queryFulfilled }) => {
        // Optimistically update the quotation status
        const patchResult = dispatch(
          quotationApi.util.updateQueryData(
            'getQuotationById',
            quotationId,
            (draft) => {
              draft.status = 'Accepted';
              draft.acceptedAt = new Date().toISOString();
            }
          )
        );

        // Also update the list view
        const listPatchResults: any[] = [];
        dispatch(
          quotationApi.util.updateQueryData(
            'getQuotations',
            { leadId: '' },
            (draft) => {
              const quotation = draft.find(
                (q) => q.quotationId === quotationId
              );
              if (quotation) {
                quotation.status = 'Accepted';
              }
            }
          )
        );

        try {
          await queryFulfilled;
        } catch {
          // Revert optimistic update on error
          patchResult.undo();
          listPatchResults.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: (result, error, quotationId) => [
        { type: 'Quotation', id: quotationId },
        { type: 'QuotationDetail', id: quotationId },
      ],
    }),

    /**
     * Reject quotation (optimistic update)
     */
    rejectQuotation: builder.mutation<void, string>({
      query: (quotationId) => ({
        url: `/api/v1/quotations/${quotationId}/reject`,
        method: 'PATCH',
      }),
      transformResponse: (response: QuotationActionApiResponse): void => {
        if (!response.success) {
          throw new Error(response.error || 'Failed to reject quotation');
        }
      },
      transformErrorResponse: (error: any): string => {
        return transformQuotationError(error);
      },
      // Optimistic update
      onQueryStarted: async (quotationId, { dispatch, queryFulfilled }) => {
        // Optimistically update the quotation status
        const patchResult = dispatch(
          quotationApi.util.updateQueryData(
            'getQuotationById',
            quotationId,
            (draft) => {
              draft.status = 'Rejected';
              draft.rejectedAt = new Date().toISOString();
            }
          )
        );

        // Also update the list view
        const listPatchResults: any[] = [];
        dispatch(
          quotationApi.util.updateQueryData(
            'getQuotations',
            { leadId: '' },
            (draft) => {
              const quotation = draft.find(
                (q) => q.quotationId === quotationId
              );
              if (quotation) {
                quotation.status = 'Rejected';
              }
            }
          )
        );

        try {
          await queryFulfilled;
        } catch {
          // Revert optimistic update on error
          patchResult.undo();
          listPatchResults.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: (result, error, quotationId) => [
        { type: 'Quotation', id: quotationId },
        { type: 'QuotationDetail', id: quotationId },
      ],
    }),

    /**
     * Get quotation PDF download URL
     */
    getQuotationPdf: builder.query<string, string>({
      query: (quotationId) => ({
        url: `/api/v1/quotations/${quotationId}/pdf`,
        method: 'GET',
      }),
      transformResponse: (response: QuotationPdfResponse): string => {
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to generate PDF');
        }
        return response.data.pdfUrl;
      },
      transformErrorResponse: (error: any): string => {
        return transformQuotationError(error);
      },
      providesTags: (result, error, quotationId) => [
        { type: 'QuotationPdf', id: quotationId },
      ],
      // Don't cache PDF URLs as they have expiration
      keepUnusedDataFor: 0,
    }),
  }),
});

/**
 * Transform API errors to user-friendly messages
 */
function transformQuotationError(error: any): string {
  // Handle different error types from customBaseQuery
  if (error?.data?.error) {
    return error.data.error;
  }

  if (error?.data?.message) {
    return error.data.message;
  }

  if (error?.status) {
    switch (error.status) {
      case 400:
        return 'Invalid quotation data. Please check your input.';
      case 401:
        return 'Authentication expired. Please login again.';
      case 403:
        return 'Access denied. You cannot perform this action.';
      case 404:
        return 'Quotation not found.';
      case 409:
        return 'Quotation cannot be modified in current state.';
      case 500:
        return 'Server error processing quotation. Try again later.';
      case 503:
        return 'Service temporarily unavailable. Please retry.';
      case 'FETCH_ERROR':
        return 'Network error. Check your connection and try again.';
      case 'PARSING_ERROR':
        return 'Invalid response format. Contact support.';
      case 'TIMEOUT_ERROR':
        return 'Request timed out. Please try again.';
      default:
        return 'Failed to process quotation. Please try again.';
    }
  }

  // Fallback for unknown errors
  return 'Quotation operation failed. Please check your connection and try again.';
}

// Export hooks for components
export const {
  useGetQuotationsQuery,
  useLazyGetQuotationsQuery,
  useGetQuotationByIdQuery,
  useLazyGetQuotationByIdQuery,
  useCreateQuotationMutation,
  useShareQuotationMutation,
  useAcceptQuotationMutation,
  useRejectQuotationMutation,
  useGetQuotationPdfQuery,
  useLazyGetQuotationPdfQuery,
} = quotationApi;

// Export API for store registration
export default quotationApi;
