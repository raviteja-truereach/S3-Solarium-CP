/**
 * Dashboard API
 * RTK Query endpoints for dashboard data
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from './baseQuery';
import { DashboardSummary, DashboardSummaryResponse } from '../../types/api';
import { setDashboardSummary } from '../slices/networkSlice';

/**
 * Dashboard API endpoints
 */
export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: customBaseQuery,
  tagTypes: ['Dashboard'],
  endpoints: (builder) => ({
    getDashboardSummary: builder.query<DashboardSummary, void>({
      query: () => ({
        url: '/api/v1/leads/summary',
        method: 'GET',
      }),
      transformResponse: (
        response: DashboardSummaryResponse
      ): DashboardSummary => {
        if (!response.success) {
          throw new Error('API returned success: false');
        }
        return response.data;
      },
      providesTags: ['Dashboard'],
      keepUnusedDataFor: 0,
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setDashboardSummary(data));
          console.log('Dashboard summary updated in store:', data);
        } catch (error) {
          console.error('Dashboard summary query failed:', error);
        }
      },
    }),
  }),
});

export const { useGetDashboardSummaryQuery } = dashboardApi;
export { dashboardApi as default };
