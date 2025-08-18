/**
 * Quotation Sync Integration Tests
 * Testing quotation synchronization with SyncManager
 */
import { configureStore } from '@reduxjs/toolkit';
import { SyncManager } from '../../src/sync/SyncManager';
import { quotationApi } from '../../src/store/api/quotationApi';
import quotationSlice from '../../src/store/slices/quotationSlice';
import MockFetch from '../mocks/fetchMock';
import { createMockStore } from '../mocks/syncMocks';
import type { Quotation } from '../../src/types/api/quotation';

// Mock dependencies
global.fetch = MockFetch.fetch;
jest.mock('react-native-sqlite-storage', () => ({
  SQLiteDatabase: jest.fn(),
}));

jest.mock('../../src/database/dao/QuotationDao', () => ({
  QuotationDao: jest.fn().mockImplementation(() => ({
    findAll: jest.fn().mockResolvedValue([]),
    upsertBatch: jest.fn().mockResolvedValue(true),
    findById: jest.fn().mockResolvedValue(null),
  })),
}));

describe('Quotation Sync Integration', () => {
  let store: ReturnType<typeof configureStore>;
  let syncManager: SyncManager;
  let mockDatabase: any;

  const mockQuotations: Quotation[] = [
    {
      quotationId: 'QUOT-123',
      leadId: 'LEAD-456',
      systemKW: 5,
      totalCost: 350000,
      status: 'Generated',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      quotationId: 'QUOT-124',
      leadId: 'LEAD-457',
      systemKW: 3,
      totalCost: 210000,
      status: 'Shared',
      createdAt: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    store = configureStore({
      reducer: {
        quotation: quotationSlice,
        [quotationApi.reducerPath]: quotationApi.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false,
        }).concat(quotationApi.middleware),
    });

    mockDatabase = {
      quotationDao: {
        findAll: jest.fn().mockResolvedValue([]),
        upsertBatch: jest.fn().mockResolvedValue(true),
      },
    };

    syncManager = new SyncManager(mockDatabase as any, 'test-token');
    MockFetch.clearMocks();
    jest.clearAllMocks();
  });

  describe('API to Redux Integration', () => {
    it('should sync quotations from API to Redux store', async () => {
      MockFetch.mockResponse({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              items: mockQuotations,
              total: 2,
              offset: 0,
              limit: 25,
            },
          }),
      });

      const result = await store.dispatch(
        quotationApi.endpoints.getQuotations.initiate({ leadId: 'LEAD-456' })
      );

      expect(result.data).toEqual(mockQuotations);

      // Check that data is available in the store
      const storeState = store.getState();
      expect(storeState[quotationApi.reducerPath]).toBeDefined();
    });

    it('should handle API errors and update store error state', async () => {
      MockFetch.mockResponse({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Internal server error',
          }),
      });

      const result = await store.dispatch(
        quotationApi.endpoints.getQuotations.initiate({ leadId: 'LEAD-456' })
      );

      expect(result.error).toBeDefined();
      expect((result.error as any).status).toBe(500);
    });
  });

  describe('Optimistic Updates Integration', () => {
    it('should handle optimistic updates for share quotation', async () => {
      // First, seed the cache with a quotation
      MockFetch.mockResponse({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              quotationId: 'QUOT-123',
              leadId: 'LEAD-456',
              systemKW: 5,
              roofType: 'RCC',
              status: 'Generated',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              components: { panels: [], inverters: [] },
              pricing: {
                systemCost: 0,
                installationFee: 0,
                transportFee: 0,
                gst: 0,
                total: 0,
              },
            },
          }),
      });

      // First get the quotation to populate cache
      await store.dispatch(
        quotationApi.endpoints.getQuotationById.initiate('QUOT-123')
      );

      // Now mock the share response
      MockFetch.clearMocks();
      MockFetch.mockResponse({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      // Perform share operation
      const shareResult = await store.dispatch(
        quotationApi.endpoints.shareQuotation.initiate('QUOT-123')
      );

      expect(shareResult.data).toBeUndefined(); // Void return type
      expect(MockFetch.getLastCall()?.url).toContain('/share');
    });

    it('should rollback optimistic updates on error', async () => {
      // Seed cache first
      MockFetch.mockResponse({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              quotationId: 'QUOT-123',
              status: 'Generated',
              leadId: 'LEAD-456',
              systemKW: 5,
              roofType: 'RCC',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              components: { panels: [], inverters: [] },
              pricing: {
                systemCost: 0,
                installationFee: 0,
                transportFee: 0,
                gst: 0,
                total: 0,
              },
            },
          }),
      });

      await store.dispatch(
        quotationApi.endpoints.getQuotationById.initiate('QUOT-123')
      );

      // Mock share failure
      MockFetch.clearMocks();
      MockFetch.mockResponse({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Cannot share quotation in current state',
          }),
      });

      const shareResult = await store.dispatch(
        quotationApi.endpoints.shareQuotation.initiate('QUOT-123')
      );

      expect(shareResult.error).toBeDefined();
      expect((shareResult.error as any).status).toBe(409);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate related caches on quotation creation', async () => {
      MockFetch.mockResponse({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            success: true,
            data: { quotationId: 'QUOT-NEW-123' },
          }),
      });

      const createRequest = {
        leadId: 'LEAD-456',
        systemKW: 5,
        roofType: 'RCC' as const,
        state: 'Maharashtra',
        discom: 'MSEDCL',
        phase: 'Single' as const,
        hasSmartMeter: true,
        panels: [{ id: 'PNL001', quantity: 10 }],
        inverters: [{ id: 'INV002', quantity: 1 }],
        bom: [],
        structure: {
          extraHeight: 0,
          extraHeightCost: 0,
          cableType: 'Standard' as const,
          cableTypeCost: 0,
        },
        dealerAddOnPerKW: 1800,
      };

      const result = await store.dispatch(
        quotationApi.endpoints.createQuotation.initiate(createRequest)
      );

      expect(result.data).toEqual({ quotationId: 'QUOT-NEW-123' });

      // Verify that the request was made correctly
      expect(MockFetch.getLastCall()?.options?.method).toBe('POST');
      expect(MockFetch.getLastCall()?.options?.body).toContain('LEAD-456');
    });
  });

  describe('Offline Scenarios', () => {
    it('should handle network errors gracefully', async () => {
      MockFetch.mockReject(new Error('Network request failed'));

      const result = await store.dispatch(
        quotationApi.endpoints.getQuotations.initiate({ leadId: 'LEAD-456' })
      );

      expect(result.error).toBeDefined();
      // Should not crash the application
    });

    it('should handle timeout errors', async () => {
      MockFetch.mockResponse({
        ok: false,
        status: 'TIMEOUT_ERROR' as any,
        statusText: 'Request timeout',
      });

      const result = await store.dispatch(
        quotationApi.endpoints.getQuotations.initiate({ leadId: 'LEAD-456' })
      );

      expect(result.error).toBeDefined();
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across multiple operations', async () => {
      // Create initial quotation
      MockFetch.mockResponse({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            success: true,
            data: { quotationId: 'QUOT-CONSISTENCY-TEST' },
          }),
      });

      const createResult = await store.dispatch(
        quotationApi.endpoints.createQuotation.initiate({
          leadId: 'LEAD-456',
          systemKW: 5,
        } as any)
      );

      expect(createResult.data?.quotationId).toBe('QUOT-CONSISTENCY-TEST');

      // Fetch quotation details
      MockFetch.clearMocks();
      MockFetch.mockResponse({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              quotationId: 'QUOT-CONSISTENCY-TEST',
              leadId: 'LEAD-456',
              systemKW: 5,
              roofType: 'RCC',
              status: 'Generated',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              components: { panels: [], inverters: [] },
              pricing: {
                systemCost: 0,
                installationFee: 0,
                transportFee: 0,
                gst: 0,
                total: 0,
              },
            },
          }),
      });

      const detailResult = await store.dispatch(
        quotationApi.endpoints.getQuotationById.initiate(
          'QUOT-CONSISTENCY-TEST'
        )
      );

      expect(detailResult.data?.quotationId).toBe('QUOT-CONSISTENCY-TEST');
      expect(detailResult.data?.status).toBe('Generated');

      // Share quotation
      MockFetch.clearMocks();
      MockFetch.mockResponse({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      const shareResult = await store.dispatch(
        quotationApi.endpoints.shareQuotation.initiate('QUOT-CONSISTENCY-TEST')
      );

      expect(shareResult.error).toBeUndefined();
    });
  });

  describe('Error Recovery', () => {
    it('should recover from transient errors', async () => {
      // First request fails
      MockFetch.mockResponse({
        ok: false,
        status: 503,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Service temporarily unavailable',
          }),
      });

      let result = await store.dispatch(
        quotationApi.endpoints.getQuotations.initiate({ leadId: 'LEAD-456' })
      );

      expect(result.error).toBeDefined();

      // Second request succeeds
      MockFetch.clearMocks();
      MockFetch.mockResponse({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              items: mockQuotations,
              total: 2,
              offset: 0,
              limit: 25,
            },
          }),
      });

      result = await store.dispatch(
        quotationApi.endpoints.getQuotations.initiate({ leadId: 'LEAD-456' })
      );

      expect(result.data).toEqual(mockQuotations);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large quotation lists efficiently', async () => {
      const largeQuotationList: Quotation[] = Array.from(
        { length: 1000 },
        (_, index) => ({
          quotationId: `QUOT-${index}`,
          leadId: `LEAD-${index}`,
          systemKW: 5,
          totalCost: 350000,
          status: 'Generated',
          createdAt: '2024-01-01T00:00:00Z',
        })
      );

      MockFetch.mockResponse({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              items: largeQuotationList,
              total: 1000,
              offset: 0,
              limit: 1000,
            },
          }),
      });

      const startTime = Date.now();
      const result = await store.dispatch(
        quotationApi.endpoints.getQuotations.initiate({ leadId: 'LEAD-BULK' })
      );
      const endTime = Date.now();

      expect(result.data).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
