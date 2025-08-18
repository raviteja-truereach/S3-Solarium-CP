/**
 * RTK Query Base API
 * Centralized API configuration for all endpoints
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from './baseQuery';
import { createListenerMiddleware } from '@reduxjs/toolkit';
import { logout } from '../slices/authSlice'; // Import logout action

export const cacheInvalidationMiddleware = createListenerMiddleware();

cacheInvalidationMiddleware.startListening({
  actionCreator: logout,
  effect: async (action, listenerApi) => {
    // Invalidate all caches on logout
    listenerApi.dispatch(baseApi.util.resetApiState());
  },
});

/**
 * Base RTK Query API
 * Configured with enhanced authentication, timeout, and retry logic
 */
export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: customBaseQuery,
  tagTypes: [
    // Define cache tags for different data types
    'Lead',
    'Customer',
    'Quotation',
    'Commission',
    'User',
    'KYC',
    'Product',
    'Service',
  ],
  endpoints: () => ({}), // Empty endpoints - will be injected by feature APIs
});

// Export hooks will be generated automatically when endpoints are added
export const {} = baseApi;

export default baseApi;
