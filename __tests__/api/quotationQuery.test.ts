/**
 * Quotation Query Unit Tests
 * Testing quotation fetching with edge cases
 */

import { leadApi } from '../../src/store/api/leadApi';
import { configureStore } from '@reduxjs/toolkit';

// Mock fetch
global.fetch = jest.fn();

const createMockStore = () => {
  return configureStore({
    reducer: {
      [leadApi.reducerPath]: leadApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(leadApi.middleware),
  });
};

describe('Quotation Query Tests', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
    jest.clearAllMocks();
  });

  describe('getQuotationsByLeadId Query', () => {
    test('should handle successful quotation fetch', async () => {
      const mockResponse = {
        success: true,
        data: {
          items: [
            {
              quotationId: 'QUOT-123',
              leadId: 'LEAD-456',
              systemKW: 5,
              totalCost: 350000,
              status: 'Generated',
              createdAt: '2024-01-01T00:00:00Z',
            },
          ],
          total: 1,
          offset: 0,
          limit: 25,
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await store.dispatch(
        leadApi.endpoints.getQuotationsByLeadId.initiate({
          leadId: 'LEAD-456',
          offset: 0,
          limit: 25,
        })
      );

      expect(result.data).toEqual(mockResponse.data.items);
    });

    test('should handle empty quotation response', async () => {
      const mockResponse = {
        success: true,
        data: {
          items: [],
          total: 0,
          offset: 0,
          limit: 25,
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await store.dispatch(
        leadApi.endpoints.getQuotationsByLeadId.initiate({
          leadId: 'LEAD-NO-QUOTES',
        })
      );

      expect(result.data).toEqual([]);
    });

    test('should handle API error response', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Lead not found',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => mockErrorResponse,
      });

      const result = await store.dispatch(
        leadApi.endpoints.getQuotationsByLeadId.initiate({
          leadId: 'LEAD-NONEXISTENT',
        })
      );

      expect(result.error).toBeDefined();
    });

    test('should handle network error', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await store.dispatch(
        leadApi.endpoints.getQuotationsByLeadId.initiate({
          leadId: 'LEAD-456',
        })
      );

      expect(result.error).toBeDefined();
    });

    test('should use default pagination parameters', () => {
      const endpoint = leadApi.endpoints.getQuotationsByLeadId;

      const query = endpoint.query({ leadId: 'LEAD-123' });

      expect(query.url).toBe(
        '/api/v1/quotations?leadId=LEAD-123&offset=0&limit=25'
      );
    });

    test('should use custom pagination parameters', () => {
      const endpoint = leadApi.endpoints.getQuotationsByLeadId;

      const query = endpoint.query({
        leadId: 'LEAD-123',
        offset: 50,
        limit: 10,
      });

      expect(query.url).toBe(
        '/api/v1/quotations?leadId=LEAD-123&offset=50&limit=10'
      );
    });
  });

  describe('Quotation Query Caching', () => {
    test('should provide correct cache tags', () => {
      const endpoint = leadApi.endpoints.getQuotationsByLeadId;

      const tags = endpoint.providesTags?.([], null, { leadId: 'LEAD-123' });

      expect(tags).toEqual([{ type: 'QuotationsByLead', id: 'LEAD-123' }]);
    });

    test('should invalidate cache on lead status update', () => {
      const statusEndpoint = leadApi.endpoints.updateLeadStatus;

      const invalidatedTags = statusEndpoint.invalidatesTags?.({}, null, {
        leadId: 'LEAD-123',
      });

      expect(invalidatedTags).toContain({
        type: 'QuotationsByLead',
        id: 'LEAD-123',
      });
    });
  });
});
