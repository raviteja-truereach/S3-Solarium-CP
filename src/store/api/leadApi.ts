/**
 * Lead API
 * RTK Query endpoints for lead data with filtering and pagination
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from './baseQuery';
import { upsertLeads, setLoading, setError } from '../slices/leadSlice';
import type { Lead } from '../../database/models/Lead';
import type {
  Quotation,
  QuotationResponse,
  QuotationQueryParams,
} from '../../types/api/quotation';
import type {
  UpdateLeadStatusRequest,
  UpdateLeadStatusResponse,
} from '../../types/api/leadStatus';

/**
 * API Response types
 */
/**
 * Create Lead Request interface (matching real API)
 */
interface CreateLeadRequest {
  customerName: string;
  phone: string;
  address: string; // Combined address + state + pincode
  services: string[]; // Array of serviceIds like ["SRV003"]
}

/**
 * Create Lead Response interface (matching real API)
 */
interface CreateLeadResponse {
  success: boolean;
  data: {
    leadId: string;
  };
}
interface LeadSummaryResponse {
  success: boolean;
  data: {
    leads: Lead[];
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasMore: boolean;
    };
    totalCount?: number;
    hasMore?: boolean;
  };
  message?: string;
}

interface LeadQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Create Lead Request interface
 */
// interface CreateLeadRequest {
//   customerName: string;
//   phone: string;
//   address: string;
//   email?: string;
//   services?: string[];
//   pinCode?: string;
//   state?: string;
// }

export const leadApi = createApi({
  reducerPath: 'leadApi',
  baseQuery: customBaseQuery,
  tagTypes: ['Lead', 'LeadList', 'QuotationsByLead'],
  endpoints: (builder) => ({
    /**
     * Get leads summary (overdue, today pending, total)
     */
    getLeadsSummary: builder.query<any, void>({
      query: () => ({
        url: '/api/v1/leads/summary',
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        console.log('📊 Summary API response:', response);
        return response.data || response;
      },
      providesTags: ['LeadList'],
    }),

    /**
     * Get leads list with pagination
     */
    getLeadsList: builder.query<any, { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 20 } = {}) => ({
        url: `/api/v1/leads?page=${page}&limit=${limit}`,
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        console.log('📋 Leads list API response:', response);
        return response.data || response;
      },
      providesTags: (result) => [
        'LeadList',
        ...(result?.items?.map(({ leadId }: any) => ({
          type: 'Lead' as const,
          id: leadId,
        })) || []),
      ],
    }),

    /**
     * Flexible getLeads endpoint (backward compatibility)
     */
    getLeads: builder.query<
      any,
      { page?: number; limit?: number; summary?: boolean }
    >({
      query: ({ page = 1, limit = 20, summary = false } = {}) => {
        if (summary) {
          return {
            url: '/api/v1/leads/summary',
            method: 'GET',
          };
        }
        return {
          url: `/api/v1/leads?page=${page}&limit=${limit}`,
          method: 'GET',
        };
      },
      transformResponse: (response: any) => {
        console.log('📡 getLeads API response:', response);
        return response.data || response;
      },
      providesTags: (result, error, args) => {
        if (args.summary) {
          return ['LeadList'];
        }
        return [
          'LeadList',
          ...(result?.items?.map(({ leadId }: any) => ({
            type: 'Lead' as const,
            id: leadId,
          })) || []),
        ];
      },
    }),

    /**
     * Create new lead
     * POST /api/v1/leads
     */
    createLead: builder.mutation<CreateLeadResponse, CreateLeadRequest>({
      query: (leadData) => {
        console.log('📝 Creating lead with data:', leadData);
        return {
          url: '/api/v1/leads',
          method: 'POST',
          body: leadData,
        };
      },
      transformResponse: (response: CreateLeadResponse) => {
        console.log('✅ Create lead response:', response);
        if (!response.success) {
          throw new Error('Failed to create lead');
        }
        return response;
      },
      invalidatesTags: ['Lead', 'LeadList'], // ✅ Invalidate cache to refresh MyLeads
      async onQueryStarted(leadData, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          console.log('🎉 Lead created successfully:', data.data.leadId);
        } catch (error) {
          console.error('❌ Create lead failed:', error);
        }
      },
    }),

    /**
     * Update lead status with optimistic updates
     */
    updateLeadStatus: builder.mutation<
      UpdateLeadStatusResponse,
      { leadId: string } & UpdateLeadStatusRequest
    >({
      query: ({
        leadId,
        newStatus,
        followUpDate,
        quotationRef,
        tokenNumber,
        ...otherData
      }) => {
        console.log('nextFollowUpDate', followUpDate);
        console.log('other data ---->', otherData);
        // Transform field names and filter out empty optional fields
        const body: any = {
          status: otherData?.status,
          remarks: otherData.remarks,
        };

        // Only add followUpDate if it exists
        if (followUpDate) {
          body.followUpDate = followUpDate;
        }

        // Only add quotationRef if it has a value
        if (quotationRef && quotationRef.trim() !== '') {
          body.quotationRef = quotationRef;
        }

        // Only add tokenNumber if it has a value
        if (tokenNumber && tokenNumber.trim() !== '') {
          body.tokenNumber = tokenNumber;
        }

        console.log('🔄 API request body:', body);

        return {
          url: `/api/v1/leads/${leadId}/status`,
          method: 'PATCH',
          body,
        };
      },
      transformResponse: (response: UpdateLeadStatusResponse) => {
        console.log('✅ Update lead status response:', response);
        if (!response.success) {
          throw new Error('Failed to update lead status');
        }
        return response;
      },
      invalidatesTags: (result, error, { leadId }) => [
        'LeadList',
        { type: 'Lead', id: leadId },
        { type: 'QuotationsByLead', id: leadId },
      ],
      async onQueryStarted(
        { leadId, ...statusData },
        { dispatch, queryFulfilled, getCacheEntry }
      ) {
        // Optimistic update
        const patchResult = dispatch(
          leadApi.util.updateQueryData('getLeadById', leadId, (draft) => {
            if (draft) {
              const oldStatus = draft.status;
              draft.status = statusData.status;
              draft.remarks = statusData.remarks;
              draft.nextFollowUpDate = statusData.followUpDate;
              draft.quotationRef = statusData.quotationRef;
              draft.tokenNumber = statusData.tokenNumber;
              draft.updatedAt = new Date().toISOString();

              console.log('🔄 Optimistic update applied:', {
                leadId,
                oldStatus,
                newStatus: statusData.status,
              });
            }
          })
        );

        try {
          const { data } = await queryFulfilled;
          console.log('✅ Lead status updated successfully:', leadId);

          // 🚀 IMMEDIATE: Update Redux state for MyLeadsScreen
          dispatch({
            type: 'leads/updateItem',
            payload: {
              id: leadId,
              status: statusData.status,
              remarks: statusData.remarks,
              follow_up_date: statusData.followUpDate,
              updated_at: new Date().toISOString(),
              sync_status: 'synced' as const,
            },
          });

          // 🚀 AUTO-REFRESH: Invalidate leads list cache within 2 seconds
          setTimeout(() => {
            console.log('🔄 Auto-refreshing MyLeadsScreen after status update');
            dispatch(leadApi.util.invalidateTags(['LeadList']));
          }, 1500);

          // 🚀 BACKGROUND SYNC: Schedule SQLite persistence
          setTimeout(async () => {
            try {
              console.log(
                '🔄 Triggering background sync for SQLite persistence'
              );
              const { getSyncManager } = await import(
                '../../services/SyncManager'
              );
              const syncManager = getSyncManager();
              if (syncManager) {
                await syncManager.manualSync('statusUpdate');
                console.log('✅ Background sync completed');
              }
            } catch (error) {
              console.warn('⚠️ Background sync failed:', error);
            }
          }, 3000); // 3 seconds delay for background sync
        } catch (error) {
          console.error('❌ Update lead status failed, rolling back:', error);

          // Rollback optimistic update
          patchResult.undo();

          // Force reload of single lead data
          dispatch(leadApi.util.invalidateTags([{ type: 'Lead', id: leadId }]));
          dispatch(leadApi.util.invalidateTags(['LeadList']));

          console.log('🔄 Forced refetch triggered for lead:', leadId);
        }
      },
    }),

    /**
     * Get single lead by ID
     */
    getLeadById: builder.query<any, string>({
      query: (leadId) => ({
        url: `/api/v1/leads/${leadId}`,
        method: 'GET',
      }),
      transformResponse: (response: any) => {
        console.log('📄 Get lead by ID response:', response);
        return response.data || response;
      },
      providesTags: (result, error, leadId) => [{ type: 'Lead', id: leadId }],
    }),
    /**
     * Get quotations by lead ID
     * GET /api/v1/quotations?leadId={id}&offset={offset}&limit={limit}
     */
    getQuotationsByLeadId: builder.query<Quotation[], QuotationQueryParams>({
      query: ({ leadId, offset = 0, limit = 25 }) => ({
        url: `/api/v1/quotations?leadId=${leadId}&offset=${offset}&limit=${limit}`,
        method: 'GET',
      }),
      transformResponse: (response: QuotationResponse) => {
        console.log('📊 Get quotations by lead ID response:', response);
        if (!response.success) {
          throw new Error('Failed to fetch quotations');
        }
        return response.data.items || [];
      },
      providesTags: (result, error, { leadId }) => [
        { type: 'QuotationsByLead', id: leadId },
      ],
    }),
  }),
});

export const {
  useGetLeadsQuery,
  useLazyGetLeadsQuery,
  useGetLeadsSummaryQuery,
  useGetLeadsListQuery,
  useCreateLeadMutation,
  useUpdateLeadStatusMutation,
  useGetLeadByIdQuery,
  useGetQuotationsByLeadIdQuery,
} = leadApi;

export { leadApi as default };
