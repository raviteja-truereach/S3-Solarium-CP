/**
 * Commission API - Real Backend Integration
 * RTK Query endpoints for commission data operations
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from './baseQuery';
import type { RootState } from '../index';
import type {
  CommissionsResponse,
  CommissionDetailResponse,
  GetCommissionsParams,
  GetCommissionByIdParams,
} from '../../types/api/commission';

export const commissionApi = createApi({
  reducerPath: 'commissionApi',
  baseQuery: customBaseQuery,
  tagTypes: ['Commission', 'CommissionList'],
  endpoints: (builder) => ({
    /**
     * Get commissions list with pagination and filters
     * GET /api/v1/commissions
     */
    getCommissions: builder.query<
      CommissionsResponse,
      Omit<GetCommissionsParams, 'cpId'>
    >({
      query: (params = {}) => {
        // Default pagination parameters
        const {
          limit = 25,
          offset = 0,
          status,
          startDate,
          endDate,
          searchTerm,
        } = params;

        // Format date range as comma-separated string if both dates provided
        const dateRangeParam =
          startDate && endDate ? `${startDate},${endDate}` : undefined;

        return {
          url: '/api/v1/commissions',
          method: 'GET',
          params: {
            limit,
            offset,
            ...(status && { status }),
            ...(dateRangeParam && { dateRange: dateRangeParam }),
            ...(searchTerm && { search: searchTerm }), // Assuming 'search' parameter
          },
        };
      },
      transformResponse: (response: CommissionsResponse) => {
        console.log('💰 Commissions API response:', response);

        if (!response.success) {
          throw new Error('Failed to fetch commissions');
        }

        return response;
      },
      providesTags: (result) => [
        'CommissionList',
        ...(result?.data?.items?.map(({ commissionId }) => ({
          type: 'Commission' as const,
          id: commissionId,
        })) || []),
      ],
      // Cache for 5 minutes
      keepUnusedDataFor: 300,
    }),

    /**
     * Get commission detail by ID
     * GET /api/v1/commissions/{commissionId}
     */
    getCommissionById: builder.query<CommissionDetailResponse, string>({
      query: (commissionId) => {
        console.log('💰 Fetching commission detail for:', commissionId);
        return {
          url: `/api/v1/commissions/${commissionId}`,
          method: 'GET',
        };
      },
      transformResponse: (response: CommissionDetailResponse) => {
        console.log('✅ Commission detail response:', response);

        if (!response.success) {
          throw new Error('Failed to fetch commission details');
        }

        return response;
      },
      providesTags: (result, error, commissionId) => [
        { type: 'Commission', id: commissionId },
      ],
      // Cache for 10 minutes
      keepUnusedDataFor: 600,
    }),
  }),
});

export const {
  useGetCommissionsQuery,
  useLazyGetCommissionsQuery,
  useGetCommissionByIdQuery,
  useLazyGetCommissionByIdQuery,
} = commissionApi;

export default commissionApi;
