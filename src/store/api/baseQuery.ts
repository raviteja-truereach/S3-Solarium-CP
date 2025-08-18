/**
 * Enhanced Base Query
 * RTK Query base query with timeout, retry, and JWT injection
 */
import {
  fetchBaseQuery,
  retry,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { appConfig } from '@config/Config';
import { API_TIMEOUT_MS } from '@config/Network';
import type { RootState } from '../index';

import { getToken } from '../../utils/secureStorage/KeychainHelper';
import { performLogout } from '../thunks/authThunks';

/**
 * Custom base query with enhanced error handling
 */
const customBaseQuery = retry(
  async (args: string | FetchArgs, api, extraOptions) => {
    // Create base query with timeout and auth
    const baseQuery = fetchBaseQuery({
      baseUrl: 'https://truereach-production.up.railway.app', // Direct production URL
      timeout: API_TIMEOUT_MS,
      prepareHeaders: async (headers, { getState }) => {
        // Get token from Redux state first
        const state = getState() as RootState;
        let token = state.auth.token;

        // If no token in Redux, try to get from keychain
        if (!token) {
          try {
            const tokenData = await getToken();
            token = tokenData?.token;
          } catch (error) {
            console.warn('Failed to get token from keychain:', error);
          }
        }

        // Attach Authorization header if token exists
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }

        // Set other headers
        headers.set('accept', '*/*');
        headers.set('Content-Type', 'application/json');
        const isCommissionRequest =
          typeof args === 'string'
            ? args.includes('/commissions')
            : args.url?.includes('/commissions');

        if (isCommissionRequest) {
          // Get cpId from auth state
          const cpId = state.auth.user?.id;
          if (cpId) {
            // If it's a string URL, append cpId as query param
            if (typeof args === 'string') {
              const separator = args.includes('?') ? '&' : '?';
              args = `${args}${separator}cpId=${encodeURIComponent(cpId)}`;
            } else if (args.url) {
              // If it's a FetchArgs object with params
              if (args.params) {
                args.params = { ...args.params, cpId };
              } else {
                const separator = args.url.includes('?') ? '&' : '?';
                args.url = `${args.url}${separator}cpId=${encodeURIComponent(
                  cpId
                )}`;
              }
            }
          } else {
            console.warn('⚠️ Commission API called without cpId in auth state');
          }
        }

        return headers;
      },
    });

    const result = await baseQuery(args, api, extraOptions);

    // Handle 401 Unauthorized - token expired or invalid
    if (result.error?.status === 401) {
      console.warn('Authentication failed - dispatching logout');
      api.dispatch(performLogout());
    }

    return result;
  },
  {
    maxRetries: 1,
  }
);

export default customBaseQuery;
