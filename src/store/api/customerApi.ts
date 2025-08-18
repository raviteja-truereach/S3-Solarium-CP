/**
 * Customer API - Real Backend Integration
 * RTK Query endpoints for customer data operations
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from './baseQuery';
import type {
  CustomersResponse,
  CustomerDetailResponse,
  GetCustomersParams,
} from '../../types/api/customer';

export const customerApi = createApi({
  reducerPath: 'customerApi',
  baseQuery: customBaseQuery,
  tagTypes: ['Customer', 'CustomerList'],
  endpoints: (builder) => ({
    /**
     * Get customers list with pagination and search
     * GET /api/v1/customers
     */
    getCustomers: builder.query<CustomersResponse, GetCustomersParams>({
      query: ({ limit = 20, offset = 0, search } = {}) => {
        let url = `/api/v1/customers?limit=${limit}&offset=${offset}`;

        // Add search parameter if provided
        if (search && search.trim()) {
          url += `&search=${encodeURIComponent(search.trim())}`;
        }

        return {
          url,
          method: 'GET',
        };
      },
      transformResponse: (response: CustomersResponse) => {
        console.log('👥 Customers API response:', response);

        if (!response.success) {
          throw new Error('Failed to fetch customers');
        }

        return response;
      },
      providesTags: (result) => [
        'CustomerList',
        ...(result?.data?.items?.map(({ customerId }) => ({
          type: 'Customer' as const,
          id: customerId,
        })) || []),
      ],
      // Cache for 5 minutes
      keepUnusedDataFor: 300,
    }),

    /**
     * Get customer detail by ID
     * GET /api/v1/customers/{customerId}
     */
    getCustomerById: builder.query<CustomerDetailResponse, string>({
      query: (customerId) => {
        console.log('👤 Fetching customer detail for:', customerId);
        return {
          url: `/api/v1/customers/${customerId}`,
          method: 'GET',
        };
      },
      transformResponse: (response: CustomerDetailResponse) => {
        console.log('✅ Customer detail response:', response);

        if (!response.success) {
          throw new Error('Failed to fetch customer details');
        }

        return response;
      },
      providesTags: (result, error, customerId) => [
        { type: 'Customer', id: customerId },
      ],
      // Cache for 10 minutes
      keepUnusedDataFor: 600,
    }),

    /**
     * Legacy phone check functionality (keeping for backward compatibility)
     * This uses the customers list to check for duplicate phone numbers
     */
    checkPhoneNumber: builder.query<
      { exists: boolean; customer?: any },
      string
    >({
      query: (phone) => ({
        url: `/api/v1/customers?limit=100`,
        method: 'GET',
      }),
      transformResponse: (response: CustomersResponse, meta, phone) => {
        console.log('📞 Phone check for:', phone);

        if (!response.success || !response.data?.items) {
          return { exists: false };
        }

        // Find customer with matching phone
        const existingCustomer = response.data.items.find(
          (customer) => customer.phone === phone
        );

        const result = {
          exists: !!existingCustomer,
          customer: existingCustomer,
        };

        console.log('📞 Phone check result:', result);
        return result;
      },
      providesTags: [{ type: 'CustomerList', id: 'PHONE_CHECK' }],
      // Cache for 1 minute
      keepUnusedDataFor: 60,
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useLazyGetCustomersQuery,
  useGetCustomerByIdQuery,
  useLazyGetCustomerByIdQuery,
  useCheckPhoneNumberQuery,
  useLazyCheckPhoneNumberQuery,
} = customerApi;

export default customerApi;
