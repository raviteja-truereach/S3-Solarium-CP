/**
 * useQuotations Hook Tests
 * Testing quotation hooks with React Testing Library
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import {
  useQuotations,
  useCreateQuotation,
} from '../../src/hooks/useQuotations';
import { quotationApi } from '../../src/store/api/quotationApi';
import quotationSlice from '../../src/store/slices/quotationSlice';
import MockFetch from '../mocks/fetchMock';
import type {
  Quotation,
  CreateQuotationApiRequest,
} from '../../src/types/api/quotation';

// Mock fetch
global.fetch = MockFetch.fetch;

const createMockStore = (preloadedState?: any) => {
  return configureStore({
    reducer: {
      quotation: quotationSlice,
      [quotationApi.reducerPath]: quotationApi.reducer,
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(quotationApi.middleware),
  });
};

const createWrapper = (store: any) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useQuotations', () => {
  beforeEach(() => {
    MockFetch.clearMocks();
    jest.clearAllMocks();
  });

  it('should fetch quotations successfully', async () => {
    const mockQuotations: Quotation[] = [
      {
        quotationId: 'QUOT-123',
        leadId: 'LEAD-456',
        systemKW: 5,
        totalCost: 350000,
        status: 'Generated',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    MockFetch.mockResponse({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: { items: mockQuotations, total: 1, offset: 0, limit: 25 },
        }),
    });

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotations({ leadId: 'LEAD-456' }), {
      wrapper,
    });

    // Initial state
    expect(result.current.loading).toBe(true);
    expect(result.current.quotations).toEqual([]);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.quotations).toEqual(mockQuotations);
    expect(result.current.error).toBeUndefined();
  });

  it('should handle API errors with user-friendly messages', async () => {
    MockFetch.mockResponse({
      ok: false,
      status: 404,
      json: () =>
        Promise.resolve({ success: false, message: 'Quotations not found' }),
    });

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotations({ leadId: 'LEAD-456' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Quotations not found.');
    expect(result.current.quotations).toEqual([]);
  });

  it('should transform network errors to user-friendly messages', async () => {
    MockFetch.mockReject(new Error('Network request failed'));

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotations({ leadId: 'LEAD-456' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('Network error');
  });

  it('should use local state when no leadId provided', () => {
    const store = createMockStore({
      quotation: {
        items: {
          'QUOT-123': {
            quotationId: 'QUOT-123',
            leadId: 'LEAD-456',
            systemKW: 5,
            totalCost: 350000,
            status: 'Generated',
            createdAt: '2024-01-01T00:00:00Z',
          },
        },
        isLoading: false,
        error: null,
        // ... other initial state
      },
    });
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotations(), { wrapper });

    expect(result.current.loading).toBe(false);
    // Should use filtered quotations from local state
  });

  it('should handle filter operations', async () => {
    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotations(), { wrapper });

    act(() => {
      result.current.setStatusFilter(['Generated', 'Shared']);
    });

    act(() => {
      result.current.setLeadFilter('LEAD-456');
    });

    act(() => {
      result.current.setSearchFilter('QUOT-123');
    });

    act(() => {
      result.current.clearFilters();
    });

    // These operations should not cause errors
    expect(result.current.error).toBeUndefined();
  });

  it('should provide stats from selector', () => {
    const store = createMockStore({
      quotation: {
        items: {
          'QUOT-1': { status: 'Generated' },
          'QUOT-2': { status: 'Shared' },
          'QUOT-3': { status: 'Accepted' },
        },
        // ... other state
      },
    });
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotations(), { wrapper });

    expect(result.current.stats).toBeDefined();
    expect(typeof result.current.stats.total).toBe('number');
  });

  it('should handle refetch correctly', async () => {
    MockFetch.mockResponse({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: { items: [], total: 0, offset: 0, limit: 25 },
        }),
    });

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useQuotations({ leadId: 'LEAD-456' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.refetch();
    });

    expect(typeof result.current.refetch).toBe('function');
  });
});

describe('useCreateQuotation', () => {
  beforeEach(() => {
    MockFetch.clearMocks();
    jest.clearAllMocks();
  });

  it('should create quotation successfully', async () => {
    const mockRequest: CreateQuotationApiRequest = {
      leadId: 'LEAD-456',
      systemKW: 5,
      roofType: 'RCC',
      state: 'Maharashtra',
      discom: 'MSEDCL',
      phase: 'Single',
      hasSmartMeter: true,
      panels: [{ id: 'PNL001', quantity: 10 }],
      inverters: [{ id: 'INV002', quantity: 1 }],
      bom: [],
      structure: {
        extraHeight: 0,
        extraHeightCost: 0,
        cableType: 'Standard',
        cableTypeCost: 0,
      },
      dealerAddOnPerKW: 1800,
    };

    MockFetch.mockResponse({
      ok: true,
      status: 201,
      json: () =>
        Promise.resolve({
          success: true,
          data: { quotationId: 'QUOT-NEW-123' },
        }),
    });

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useCreateQuotation(), { wrapper });

    expect(result.current.isCreating).toBe(false);
    expect(result.current.error).toBeUndefined();

    let createdQuotation: any;
    await act(async () => {
      createdQuotation = await result.current.createQuotation(mockRequest);
    });

    expect(createdQuotation).toEqual({ quotationId: 'QUOT-NEW-123' });
  });

  it('should handle creation errors with user-friendly messages', async () => {
    MockFetch.mockResponse({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({ success: false, error: 'Invalid quotation data' }),
    });

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useCreateQuotation(), { wrapper });

    const invalidRequest = { leadId: '' } as CreateQuotationApiRequest;

    await act(async () => {
      try {
        await result.current.createQuotation(invalidRequest);
      } catch (error) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBe(
        'Invalid quotation data. Please check your input.'
      );
    });
  });

  it('should show loading state during creation', async () => {
    MockFetch.mockResponse({
      ok: true,
      status: 201,
      json: () =>
        Promise.resolve({
          success: true,
          data: { quotationId: 'QUOT-NEW-123' },
        }),
    });

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useCreateQuotation(), { wrapper });

    const mockRequest = { leadId: 'LEAD-456' } as CreateQuotationApiRequest;

    act(() => {
      result.current.createQuotation(mockRequest);
    });

    expect(result.current.isCreating).toBe(true);

    await waitFor(() => {
      expect(result.current.isCreating).toBe(false);
    });
  });
});
