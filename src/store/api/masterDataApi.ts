/**
 * Master Data API
 * RTK Query endpoints for product catalog and configuration data with 24-hour caching
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import customBaseQuery from './baseQuery';
import type {
  MasterData,
  MasterDataResponse,
  MasterDataQueryParams,
} from '../../types/api/masterData';

/**
 * Master Data API definition with 24-hour cache
 */
export const masterDataApi = createApi({
  reducerPath: 'masterDataApi',
  baseQuery: customBaseQuery,
  tagTypes: ['MasterData'],
  keepUnusedDataFor: 24 * 60 * 60, // 24 hours in seconds
  endpoints: (builder) => ({
    /**
     * Get all master data with long-term caching
     */
    getMasterData: builder.query<MasterData, MasterDataQueryParams | void>({
      query: (params = {}) => ({
        url: '/api/master-data',
        method: 'GET',
        params: {
          activeOnly: params.activeOnly ?? true,
          ...(params.category && { category: params.category }),
        },
      }),
      transformResponse: (response: MasterDataResponse): MasterData => {
        return transformMasterDataResponse(response);
      },
      transformErrorResponse: (error: any): string => {
        return transformMasterDataError(error);
      },
      providesTags: ['MasterData'],
      // Additional caching configuration
      serializeQueryArgs: ({ queryArgs }) => {
        // Cache all master data requests under same key regardless of minor param differences
        return 'masterData';
      },
      // Merge cache entries to avoid duplicate requests
      merge: (currentCache, newItems) => {
        return newItems; // Replace cache with fresh data
      },
      // Force cache age to be very long for master data
      forceRefetch: ({ currentArg, previousArg, endpointState }) => {
        // Only refetch if cache is older than 24 hours
        const lastFetch = endpointState?.fulfilledTimeStamp;
        if (!lastFetch) return true;

        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        return lastFetch < twentyFourHoursAgo;
      },
    }),

    /**
     * Refresh master data (force fresh fetch)
     */
    refreshMasterData: builder.mutation<MasterData, void>({
      query: () => ({
        url: '/api/master-data',
        method: 'GET',
        params: { activeOnly: true, _t: Date.now() }, // Cache buster
      }),
      transformResponse: (response: MasterDataResponse): MasterData => {
        return transformMasterDataResponse(response);
      },
      transformErrorResponse: (error: any): string => {
        return transformMasterDataError(error);
      },
      invalidatesTags: ['MasterData'],
    }),
  }),
});

/**
 * Transform backend master data response to normalized structure
 */
function transformMasterDataResponse(response: MasterDataResponse): MasterData {
  try {
    if (!response.success || !response.data) {
      throw new Error('Invalid master data response structure');
    }

    const data = response.data;

    // Validate required fields
    if (!data.panels || !Array.isArray(data.panels)) {
      throw new Error('Master data missing panels array');
    }
    if (!data.inverters || !Array.isArray(data.inverters)) {
      throw new Error('Master data missing inverters array');
    }
    if (!data.states || !Array.isArray(data.states)) {
      throw new Error('Master data missing states array');
    }

    // Normalize and validate data structure
    const normalizedData: MasterData = {
      panels: data.panels.map((panel) => ({
        panelId: panel.panelId || '',
        make: panel.make || '',
        variant: panel.variant || '',
        wattage: Number(panel.wattage) || 0,
        unitPrice: Number(panel.unitPrice) || 0,
        isDCR: Boolean(panel.isDCR),
        isRecommended: Boolean(panel.isRecommended),
        isActive: Boolean(panel.isActive ?? true),
        specifications: {
          technology: panel.specifications?.technology || '',
          efficiency: Number(panel.specifications?.efficiency) || 0,
          warranty: Number(panel.specifications?.warranty) || 0,
          dimensions: panel.specifications?.dimensions
            ? {
                length: Number(panel.specifications.dimensions.length) || 0,
                width: Number(panel.specifications.dimensions.width) || 0,
                thickness:
                  Number(panel.specifications.dimensions.thickness) || 0,
              }
            : undefined,
        },
      })),

      inverters: data.inverters.map((inverter) => ({
        inverterId: inverter.inverterId || '',
        make: inverter.make || '',
        model: inverter.model || '',
        capacityKW: Number(inverter.capacityKW) || 0,
        phase: inverter.phase === 'Three' ? 'Three' : 'Single',
        unitPrice: Number(inverter.unitPrice) || 0,
        isRecommended: Boolean(inverter.isRecommended),
        isActive: Boolean(inverter.isActive ?? true),
        compatibilityRange: {
          minCapacityKW:
            Number(inverter.compatibilityRange?.minCapacityKW) || 0,
          maxCapacityKW:
            Number(inverter.compatibilityRange?.maxCapacityKW) || 999,
        },
        specifications: {
          efficiency: Number(inverter.specifications?.efficiency) || 0,
          warranty: Number(inverter.specifications?.warranty) || 0,
          features: Array.isArray(inverter.specifications?.features)
            ? inverter.specifications.features
            : [],
        },
      })),

      bomItems: (data.bomItems || []).map((item) => ({
        itemId: item.itemId || '',
        name: item.name || '',
        type: ['Cable', 'Structure', 'Accessory'].includes(item.type)
          ? (item.type as 'Cable' | 'Structure' | 'Accessory')
          : 'Accessory',
        subType: item.subType || undefined,
        unitPrice: Number(item.unitPrice) || 0,
        unit: item.unit || 'piece',
        isActive: Boolean(item.isActive ?? true),
        specifications: {
          material: item.specifications?.material || undefined,
          rating: item.specifications?.rating || undefined,
          description: item.specifications?.description || undefined,
        },
      })),

      fees: (data.fees || []).map((fee) => ({
        id: fee.id || '',
        state: fee.state || '',
        discom: fee.discom || '',
        phase: fee.phase === 'Three' ? 'Three' : 'Single',
        hasSmartMeter: Boolean(fee.hasSmartMeter),
        fees: {
          discomFee: Number(fee.fees?.discomFee) || 0,
          discomMiscCharges: Number(fee.fees?.discomMiscCharges) || 0,
          installationFee: Number(fee.fees?.installationFee) || 0,
          meterCharges: Number(fee.fees?.meterCharges) || 0,
          modemBoxCharges: Number(fee.fees?.modemBoxCharges) || 0,
        },
        isActive: Boolean(fee.isActive ?? true),
      })),

      states: data.states.map((state) => ({
        stateId: state.stateId || '',
        stateName: state.stateName || '',
        stateCode: state.stateCode || '',
        isActive: Boolean(state.isActive ?? true),
        subsidyType: ['S1', 'S2', 'S3'].includes(state.subsidyType)
          ? (state.subsidyType as 'S1' | 'S2' | 'S3')
          : 'S1',
      })),

      discoms: (data.discoms || []).map((discom) => ({
        discomId: discom.discomId || '',
        discomName: discom.discomName || '',
        stateId: discom.stateId || '',
        isActive: Boolean(discom.isActive ?? true),
        supportedPhases: Array.isArray(discom.supportedPhases)
          ? discom.supportedPhases.filter((phase) =>
              ['Single', 'Three'].includes(phase)
            )
          : ['Single'],
        smartMeterOptions: Array.isArray(discom.smartMeterOptions)
          ? discom.smartMeterOptions.filter((opt) => typeof opt === 'boolean')
          : [true, false],
      })),

      subsidyRules: data.subsidyRules || {
        central: { rules: [] },
        state: {
          S1: { name: 'No Subsidy', amount: 0, conditions: [] },
          S2: { name: 'Tiered Subsidy', rules: [], requiresDCR: true },
          S3: { name: 'Higher Tiered Subsidy', rules: [], requiresDCR: true },
        },
      },

      lastUpdated: data.lastUpdated || new Date().toISOString(),
    };

    return normalizedData;
  } catch (error) {
    console.error('Master data transformation error:', error);
    throw new Error(
      `Failed to process master data: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Transform API errors to user-friendly messages
 */
function transformMasterDataError(error: any): string {
  // Handle different error types from customBaseQuery
  if (error?.data?.message) {
    return error.data.message;
  }

  if (error?.status) {
    switch (error.status) {
      case 401:
        return 'Authentication expired. Please login again.';
      case 403:
        return 'Access denied. Contact administrator.';
      case 404:
        return 'Master data not found. Contact support.';
      case 500:
        return 'Server error loading product data. Try again later.';
      case 503:
        return 'Service temporarily unavailable. Please retry.';
      case 'FETCH_ERROR':
        return 'Network error. Check your connection and try again.';
      case 'PARSING_ERROR':
        return 'Invalid data format received. Contact support.';
      case 'TIMEOUT_ERROR':
        return 'Request timed out. Please try again.';
      default:
        return 'Failed to load product data. Please try again.';
    }
  }

  // Fallback for unknown errors
  return 'Unable to load product catalog. Please check your connection and try again.';
}

// Export hooks for components
export const {
  useGetMasterDataQuery,
  useLazyGetMasterDataQuery,
  useRefreshMasterDataMutation,
} = masterDataApi;

// Export API for store registration
export default masterDataApi;
