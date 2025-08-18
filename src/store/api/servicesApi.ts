/**
 * Services API - Real Backend Integration
 * RTK Query endpoints for services data
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from './baseQuery';

/**
 * Service item interface (matching real API response)
 */
interface Service {
  serviceId: string;
  name: string;
  type: string;
  description: string;
  status: string;
}

/**
 * Services API response interface
 */
interface ServicesResponse {
  success: boolean;
  data: {
    items: Service[];
    total: number;
    offset: number;
    limit: number;
  };
}

export const servicesApi = createApi({
  reducerPath: 'servicesApi',
  baseQuery: customBaseQuery,
  tagTypes: ['Services'],
  endpoints: (builder) => ({
    /**
     * Get active services from real backend
     * GET /api/v1/services?status=Active&offset=0&limit=25
     */
    getActiveServices: builder.query<
      ServicesResponse,
      {
        status?: string;
        offset?: number;
        limit?: number;
      }
    >({
      query: ({ status = 'Active', offset = 0, limit = 25 } = {}) => ({
        url: `/api/v1/services?status=${status}&offset=${offset}&limit=${limit}`,
        method: 'GET',
      }),
      transformResponse: (response: ServicesResponse) => {
        console.log('🔧 Services API response:', response);
        return response;
      },
      providesTags: ['Services'],
      // Cache for 5 minutes
      keepUnusedDataFor: 300,
    }),
  }),
});

export const { useGetActiveServicesQuery, useLazyGetActiveServicesQuery } =
  servicesApi;

export default servicesApi;
