/**
 * Use Lead By ID Hook - Fixed for proper offline handling
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useGetLeadByIdQuery } from '@store/api/leadApi';
import { useDatabase } from '@hooks/useDatabase';
import type { Lead } from '@types/lead';
import type { UseLeadByIdResult, DataSource, HookError } from '@types/api';

interface UseLeadByIdOptions {
  skip?: boolean;
  pollingInterval?: number;
}

interface ApiLeadResponse {
  leadId: string;
  customerName: string;
  phone: string;
  address: string;
  status: string;
  services: string[];
  assignedTo: string;
  remarks: string;
  followUpDate: string;
  createdAt: string;
  updatedAt: string;
  documents: any[];
  quotations: any[];
}

const parseAddress = (
  combinedAddress: string
): {
  address: string;
  city: string | null;
  state: string | null;
  pinCode: string | null;
} => {
  if (!combinedAddress) {
    return { address: '', city: null, state: null, pinCode: null };
  }

  const parts = combinedAddress.split(',').map((part) => part.trim());

  let address = combinedAddress;
  let city = null;
  let state = null;
  let pinCode = null;

  const pinCodeMatch = combinedAddress.match(/\b\d{6}\b/);
  if (pinCodeMatch) {
    pinCode = pinCodeMatch[0];
    address = combinedAddress
      .replace(pinCodeMatch[0], '')
      .replace(/,\s*,/g, ',')
      .trim();
  }

  const indianStates = [
    'Maharashtra',
    'Gujarat',
    'Karnataka',
    'Tamil Nadu',
    'Andhra Pradesh',
    'Telangana',
    'Kerala',
    'Rajasthan',
    'Madhya Pradesh',
    'Uttar Pradesh',
    'West Bengal',
    'Bihar',
    'Odisha',
    'Haryana',
    'Punjab',
    'Himachal Pradesh',
    'Uttarakhand',
    'Jharkhand',
    'Chhattisgarh',
    'Goa',
    'Delhi',
    'Mumbai',
  ];

  for (const stateName of indianStates) {
    if (combinedAddress.toLowerCase().includes(stateName.toLowerCase())) {
      state = stateName;
      break;
    }
  }

  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    const secondLastPart = parts[parts.length - 2];

    if (state && lastPart.toLowerCase().includes(state.toLowerCase())) {
      city = secondLastPart || null;
    } else {
      city = lastPart || null;
    }
  }

  if (city && state) {
    address = parts
      .filter(
        (part) =>
          !part.toLowerCase().includes(city.toLowerCase()) &&
          !part.toLowerCase().includes(state.toLowerCase()) &&
          !part.match(/\d{6}/)
      )
      .join(', ');
  }

  return {
    address: address || combinedAddress,
    city,
    state,
    pinCode,
  };
};

const transformApiResponse = (apiResponse: ApiLeadResponse): Lead => {
  const { address, city, state, pinCode } = parseAddress(apiResponse.address);

  return {
    id: apiResponse.leadId,
    customerName: apiResponse.customerName,
    phone: apiResponse.phone,
    email: null,
    address: address,
    city: city,
    state: state,
    pinCode: pinCode,
    status: apiResponse.status,
    nextFollowUpDate: apiResponse.followUpDate,
    remarks: apiResponse.remarks,
    services: apiResponse.services,
    assignedTo: apiResponse.assignedTo,
    createdAt: apiResponse.createdAt,
    updatedAt: apiResponse.updatedAt,
    documents: apiResponse.documents,
    quotations: apiResponse.quotations,
  };
};

export const useLeadById = (
  leadId: string,
  options: UseLeadByIdOptions = {}
): UseLeadByIdResult => {
  const { skip = false, pollingInterval } = options;

  // State management
  const [isOnline, setIsOnline] = useState(true);
  const [cacheResult, setCacheResult] = useState<{
    lead?: Lead;
    loading: boolean;
    error?: HookError;
  }>({
    loading: false,
  });

  // Refs
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const lastRetryTimeRef = useRef<number>(0);
  const mountTimeRef = useRef<number>(Date.now());

  // Database access
  const { database } = useDatabase();

  // 🔧 FIX: Don't skip API query when offline, let it handle the error
  const {
    data: apiData,
    isLoading: isApiLoading,
    error: apiError,
    refetch: apiRefetch,
  } = useGetLeadByIdQuery(leadId, {
    skip: skip, // Remove the offline skip condition
    pollingInterval: pollingInterval,
  });

  // Transform API response
  const apiLead = useMemo(() => {
    if (!apiData) return undefined;
    return transformApiResponse(apiData);
  }, [apiData]);

  // Network status monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable);
      setIsOnline(online);

      console.log(`🌐 Network status: ${online ? 'Online' : 'Offline'}`);
    });

    return unsubscribe;
  }, []);

  // Fetch from cache
  const fetchFromCache = useCallback(async (): Promise<{
    lead?: Lead;
    error?: HookError;
  }> => {
    try {
      if (!database) {
        console.warn('⚠️ Database not available for cache fallback');
        return { error: 'cache-miss' };
      }

      console.log('🗄️ Fetching lead from cache:', leadId);
      const startTime = Date.now();

      const cachedLead = await database.leadDao.findById(leadId);

      const fetchTime = Date.now() - startTime;
      console.log(`✅ Cache fetch completed in ${fetchTime}ms`);

      if (!cachedLead) {
        console.log('❌ Lead not found in cache:', leadId);
        return { error: 'cache-miss' };
      }

      if (fetchTime > 800) {
        console.warn(`⚠️ Cache fetch exceeded 800ms target: ${fetchTime}ms`);
      }

      console.log('✅ Lead retrieved from cache:', {
        id: cachedLead.id,
        customerName: cachedLead.customerName,
        status: cachedLead.status,
      });

      return { lead: cachedLead };
    } catch (error) {
      console.error(
        '❌ Cache fetch failed:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return {
        error: error instanceof Error ? error : new Error('Cache fetch failed'),
      };
    }
  }, [database, leadId]);

  // 🔧 FIX: Improved cache fallback logic
  useEffect(() => {
    const shouldFallbackToCache = () => {
      // Always try cache when offline
      if (!isOnline) {
        console.log('🔄 Offline detected, trying cache fallback');
        return true;
      }

      // Try cache on API errors (5xx, network errors)
      if (apiError) {
        const error = apiError as any;
        if (error?.status >= 500 || error?.name === 'NetworkError') {
          console.log('🔄 API error detected, trying cache fallback:', error);
          return true;
        }
      }

      return false;
    };

    if (shouldFallbackToCache() && !skip) {
      console.log('🔄 Initiating cache fallback for leadId:', leadId);
      setCacheResult({ loading: true });

      fetchFromCache()
        .then(({ lead, error }) => {
          console.log('🔄 Cache fallback result:', {
            hasLead: Boolean(lead),
            hasError: Boolean(error),
          });
          setCacheResult({
            lead,
            loading: false,
            error,
          });
        })
        .catch((error) => {
          console.error('❌ Cache fallback failed:', error);
          setCacheResult({
            loading: false,
            error:
              error instanceof Error ? error : new Error('Cache fetch failed'),
          });
        });
    }
  }, [isOnline, apiError, skip, fetchFromCache, leadId]);

  // Debounced retry function
  const onRetry = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRetry = now - lastRetryTimeRef.current;

    if (timeSinceLastRetry < 2000) {
      console.log(`🚫 Retry debounced, wait ${2000 - timeSinceLastRetry}ms`);
      return;
    }

    lastRetryTimeRef.current = now;

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    console.log('🔄 Retrying lead fetch:', leadId);

    if (isOnline) {
      console.log('🔄 Retrying API call');
      apiRefetch();
    } else {
      console.log('🔄 Retrying cache fetch');
      setCacheResult({ loading: true });
      fetchFromCache()
        .then(({ lead, error }) => {
          setCacheResult({
            lead,
            loading: false,
            error,
          });
        })
        .catch((error) => {
          setCacheResult({
            loading: false,
            error: error instanceof Error ? error : new Error('Retry failed'),
          });
        });
    }
  }, [isOnline, apiRefetch, fetchFromCache, leadId]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // 🔧 FIX: Improved result determination
  const result: UseLeadByIdResult = useMemo(() => {
    // 1. API data available and online
    if (apiLead && isOnline && !apiError) {
      console.log('📊 Returning API data');
      return {
        lead: apiLead,
        loading: isApiLoading,
        error: undefined,
        source: 'api',
        onRetry,
      };
    }

    // 2. Cache data available (offline or API error)
    if (cacheResult.lead) {
      console.log('📊 Returning cache data');
      return {
        lead: cacheResult.lead,
        loading: cacheResult.loading,
        error: undefined,
        source: 'cache',
        onRetry,
      };
    }

    // 3. Loading states
    if (isApiLoading && isOnline) {
      console.log('📊 API loading');
      return {
        lead: undefined,
        loading: true,
        error: undefined,
        source: 'api',
        onRetry,
      };
    }

    if (cacheResult.loading) {
      console.log('📊 Cache loading');
      return {
        lead: undefined,
        loading: true,
        error: undefined,
        source: 'cache',
        onRetry,
      };
    }

    // 4. Error states
    if (cacheResult.error) {
      console.log('📊 Returning cache error');
      return {
        lead: undefined,
        loading: false,
        error: cacheResult.error,
        source: 'cache',
        onRetry,
      };
    }

    if (apiError) {
      console.log('📊 Returning API error');
      return {
        lead: undefined,
        loading: false,
        error: apiError as Error,
        source: 'api',
        onRetry,
      };
    }

    // 5. Default loading state
    console.log('📊 Default loading state');
    return {
      lead: undefined,
      loading: !skip,
      error: undefined,
      source: 'api',
      onRetry,
    };
  }, [apiLead, isOnline, apiError, isApiLoading, cacheResult, skip, onRetry]);

  // Performance logging
  useEffect(() => {
    if (result.lead && !result.loading) {
      const totalTime = Date.now() - mountTimeRef.current;
      console.log(`📊 Lead loaded from ${result.source} in ${totalTime}ms`);

      if (result.source === 'cache' && totalTime > 800) {
        console.warn(
          `⚠️ Offline load time exceeded target: ${totalTime}ms > 800ms`
        );
      }
    }
  }, [result.lead, result.loading, result.source]);

  return result;
};

export default useLeadById;
