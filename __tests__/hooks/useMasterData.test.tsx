/**
 * useMasterData Hook Tests
 * Testing master data hook with caching behavior
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useMasterData } from '../../src/hooks/useMasterData';
import { masterDataApi } from '../../src/store/api/masterDataApi';
import MockFetch from '../mocks/fetchMock';
import type {
  MasterData,
  MasterDataResponse,
} from '../../src/types/api/masterData';

// Mock fetch
global.fetch = MockFetch.fetch;

const createMockStore = () => {
  return configureStore({
    reducer: {
      [masterDataApi.reducerPath]: masterDataApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(masterDataApi.middleware),
  });
};

const createWrapper = (store: any) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useMasterData', () => {
  const mockMasterData: MasterData = {
    panels: [
      {
        panelId: 'PNL001',
        make: 'Tata Power Solar',
        variant: 'TP540M',
        wattage: 540,
        unitPrice: 15000,
        isDCR: true,
        isRecommended: true,
        isActive: true,
        specifications: {
          technology: 'Monocrystalline',
          efficiency: 21.2,
          warranty: 25,
        },
      },
    ],
    inverters: [
      {
        inverterId: 'INV001',
        make: 'ABB',
        model: 'PVS-3.3-TL',
        capacityKW: 3.3,
        phase: 'Single',
        unitPrice: 45000,
        isRecommended: true,
        isActive: true,
        compatibilityRange: { minCapacityKW: 2.8, maxCapacityKW: 3.8 },
        specifications: {
          efficiency: 97.2,
          warranty: 5,
          features: ['MPPT', 'WiFi'],
        },
      },
    ],
    bomItems: [],
    fees: [],
    states: [
      {
        stateId: 'MH',
        stateName: 'Maharashtra',
        stateCode: 'MH',
        isActive: true,
        subsidyType: 'S2',
      },
    ],
    discoms: [],
    subsidyRules: {
      central: { rules: [] },
      state: {
        S1: { name: 'No Subsidy', amount: 0, conditions: [] },
        S2: { name: 'Tiered Subsidy', rules: [], requiresDCR: true },
        S3: { name: 'Higher Tiered Subsidy', rules: [], requiresDCR: true },
      },
    },
    lastUpdated: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    MockFetch.clearMocks();
    jest.clearAllMocks();
  });

  it('should fetch master data successfully', async () => {
    MockFetch.mockResponse({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: mockMasterData,
        } as MasterDataResponse),
    });

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useMasterData(), { wrapper });

    // Initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.masterData).toBeUndefined();
    expect(result.current.isCached).toBe(false);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.masterData).toEqual(mockMasterData);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(result.current.isCached).toBe(true);
  });

  it('should provide specific data accessors', async () => {
    MockFetch.mockResponse({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: mockMasterData,
        } as MasterDataResponse),
    });

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useMasterData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.panels).toEqual(mockMasterData.panels);
    expect(result.current.inverters).toEqual(mockMasterData.inverters);
    expect(result.current.states).toEqual(mockMasterData.states);
    expect(result.current.discoms).toEqual(mockMasterData.discoms);
    expect(result.current.subsidyRules).toEqual(mockMasterData.subsidyRules);
  });

  it('should handle API errors with user-friendly messages', async () => {
    MockFetch.mockResponse({
      ok: false,
      status: 503,
      json: () =>
        Promise.resolve({
          success: false,
          message: 'Service temporarily unavailable',
        }),
    });

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useMasterData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(
      'Product catalog temporarily unavailable. Please retry.'
    );
    expect(result.current.masterData).toBeUndefined();
    expect(result.current.isCached).toBe(false);
  });

  it('should transform different error types correctly', async () => {
    const errorCases = [
      {
        status: 401,
        expectedMessage: 'Session expired. Please login again.',
      },
      {
        status: 403,
        expectedMessage: 'Access denied. Contact administrator.',
      },
      {
        status: 404,
        expectedMessage: 'Product catalog not found. Contact support.',
      },
      {
        status: 500,
        expectedMessage: 'Server error loading product data. Try again later.',
      },
    ];

    for (const errorCase of errorCases) {
      MockFetch.clearMocks();
      MockFetch.mockResponse({
        ok: false,
        status: errorCase.status,
        json: () => Promise.resolve({ success: false }),
      });

      const store = createMockStore();
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => useMasterData(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(errorCase.expectedMessage);
    }
  });

  it('should handle network errors', async () => {
    MockFetch.mockReject(new Error('Network request failed'));

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useMasterData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toContain('Network error');
  });

  it('should handle fetch errors with FETCH_ERROR status', async () => {
    MockFetch.mockResponse({
      ok: false,
      status: 'FETCH_ERROR' as any,
    });

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useMasterData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(
      'Network error. Check your connection and try again.'
    );
  });

  it('should provide refetch functionality', async () => {
    MockFetch.mockResponse({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: mockMasterData,
        } as MasterDataResponse),
    });

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useMasterData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');

    // Should be callable without error
    result.current.refetch();
  });

  it('should handle empty data gracefully', async () => {
    const emptyMasterData: MasterData = {
      panels: [],
      inverters: [],
      bomItems: [],
      fees: [],
      states: [],
      discoms: [],
      subsidyRules: {
        central: { rules: [] },
        state: {
          S1: { name: 'No Subsidy', amount: 0, conditions: [] },
          S2: { name: 'Tiered Subsidy', rules: [], requiresDCR: true },
          S3: { name: 'Higher Tiered Subsidy', rules: [], requiresDCR: true },
        },
      },
      lastUpdated: '2024-01-01T00:00:00Z',
    };

    MockFetch.mockResponse({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: emptyMasterData,
        } as MasterDataResponse),
    });

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useMasterData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.masterData).toEqual(emptyMasterData);
    expect(result.current.panels).toEqual([]);
    expect(result.current.inverters).toEqual([]);
    expect(result.current.states).toEqual([]);
  });

  it('should show loading state correctly during fetching', () => {
    MockFetch.mockResponse({
      ok: true,
      status: 200,
      json: () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                success: true,
                data: mockMasterData,
              }),
            100
          )
        ),
    });

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useMasterData(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isCached).toBe(false);
  });
});
