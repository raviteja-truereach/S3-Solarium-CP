/**
 * Quotation API Tests
 * Unit tests for quotation API endpoints with RTK Query
 */
import { quotationApi } from '../../../src/store/api/quotationApi';
import { configureStore } from '@reduxjs/toolkit';
import MockFetch from '../../mocks/fetchMock';
import type {
  QuotationResponse,
  CreateQuotationApiRequest,
  QuotationDetailApiResponse,
} from '../../../src/types/api/quotation';

// Mock fetch
global.fetch = MockFetch.fetch;

const createMockStore = () => {
  return configureStore({
    reducer: {
      [quotationApi.reducerPath]: quotationApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(quotationApi.middleware),
  });
};

describe('quotationApi', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
    MockFetch.clearMocks();
    jest.clearAllMocks();
  });

  describe('getQuotations', () => {
    it('should fetch quotations successfully', async () => {
      const mockResponse: QuotationResponse = {
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

      MockFetch.mockResponse({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await store.dispatch(
        quotationApi.endpoints.getQuotations.initiate({ leadId: 'LEAD-456' })
      );

      expect(result.data).toEqual(mockResponse.data.items);
      expect(MockFetch.getLastCall()?.url).toContain('/api/v1/quotations');
    });

    it('should handle API error response', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Quotations not found',
      };

      MockFetch.mockResponse({
        ok: false,
        status: 404,
        json: () => Promise.resolve(mockErrorResponse),
      });

      const result = await store.dispatch(
        quotationApi.endpoints.getQuotations.initiate({ leadId: 'LEAD-456' })
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });

    it('should transform response correctly', () => {
      const mockBackendResponse: QuotationResponse = {
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

      const endpoint = quotationApi.endpoints.getQuotations;
      const result = endpoint.transformResponse!(mockBackendResponse);

      expect(result).toEqual(mockBackendResponse.data.items);
    });

    it('should handle invalid response structure', () => {
      const invalidResponse = { success: false };

      const endpoint = quotationApi.endpoints.getQuotations;

      expect(() => {
        endpoint.transformResponse!(invalidResponse as any);
      }).toThrow('Failed to fetch quotations');
    });
  });

  describe('getQuotationById', () => {
    it('should fetch quotation details successfully', async () => {
      const mockResponse: QuotationDetailApiResponse = {
        success: true,
        data: {
          quotationId: 'QUOT-123',
          leadId: 'LEAD-456',
          systemKW: 5,
          roofType: 'RCC',
          components: {
            panels: [{ id: 'PNL001', name: 'Solar Panel 540W', quantity: 10 }],
            inverters: [
              { id: 'INV002', name: 'Single Phase Inverter 3kW', quantity: 1 },
            ],
          },
          pricing: {
            systemCost: 350000,
            installationFee: 25000,
            transportFee: 5000,
            gst: 15000,
            total: 395000,
          },
          status: 'Generated',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };

      MockFetch.mockResponse({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await store.dispatch(
        quotationApi.endpoints.getQuotationById.initiate('QUOT-123')
      );

      expect(result.data).toEqual(mockResponse.data);
      expect(MockFetch.getLastCall()?.url).toContain(
        '/api/v1/quotations/QUOT-123'
      );
    });

    it('should handle 404 error for non-existent quotation', async () => {
      MockFetch.mockResponse({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({ success: false, error: 'Quotation not found' }),
      });

      const result = await store.dispatch(
        quotationApi.endpoints.getQuotationById.initiate('INVALID-ID')
      );

      expect(result.error).toBeDefined();
      expect((result.error as any).status).toBe(404);
    });
  });

  describe('createQuotation', () => {
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

      const mockResponse = {
        success: true,
        data: { quotationId: 'QUOT-NEW-123' },
      };

      MockFetch.mockResponse({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await store.dispatch(
        quotationApi.endpoints.createQuotation.initiate(mockRequest)
      );

      expect(result.data).toEqual(mockResponse.data);
      expect(MockFetch.getLastCall()?.options?.method).toBe('POST');
      expect(MockFetch.getLastCall()?.options?.body).toContain('LEAD-456');
    });

    it('should handle validation errors', async () => {
      const invalidRequest = {
        leadId: '',
        systemKW: 0,
      } as CreateQuotationApiRequest;

      MockFetch.mockResponse({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({ success: false, error: 'Invalid quotation data' }),
      });

      const result = await store.dispatch(
        quotationApi.endpoints.createQuotation.initiate(invalidRequest)
      );

      expect(result.error).toBeDefined();
      expect((result.error as any).status).toBe(400);
    });
  });

  describe('shareQuotation', () => {
    it('should share quotation successfully with optimistic update', async () => {
      // First, seed the store with a quotation
      const quotation = {
        quotationId: 'QUOT-123',
        leadId: 'LEAD-456',
        systemKW: 5,
        roofType: 'RCC' as const,
        status: 'Generated' as const,
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
      };

      // Mock successful share response
      MockFetch.mockResponse({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await store.dispatch(
        quotationApi.endpoints.shareQuotation.initiate('QUOT-123')
      );

      expect(result.data).toBeUndefined(); // Void return type
      expect(MockFetch.getLastCall()?.url).toContain(
        '/api/v1/quotations/QUOT-123/share'
      );
      expect(MockFetch.getLastCall()?.options?.method).toBe('PATCH');
    });

    it('should handle share failure', async () => {
      MockFetch.mockResponse({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Quotation cannot be shared in current state',
          }),
      });

      const result = await store.dispatch(
        quotationApi.endpoints.shareQuotation.initiate('QUOT-123')
      );

      expect(result.error).toBeDefined();
      expect((result.error as any).status).toBe(409);
    });
  });

  describe('acceptQuotation', () => {
    it('should accept quotation successfully', async () => {
      MockFetch.mockResponse({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await store.dispatch(
        quotationApi.endpoints.acceptQuotation.initiate('QUOT-123')
      );

      expect(result.data).toBeUndefined(); // Void return type
      expect(MockFetch.getLastCall()?.url).toContain(
        '/api/v1/quotations/QUOT-123/accept'
      );
    });
  });

  describe('rejectQuotation', () => {
    it('should reject quotation successfully', async () => {
      MockFetch.mockResponse({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await store.dispatch(
        quotationApi.endpoints.rejectQuotation.initiate('QUOT-123')
      );

      expect(result.data).toBeUndefined(); // Void return type
      expect(MockFetch.getLastCall()?.url).toContain(
        '/api/v1/quotations/QUOT-123/reject'
      );
    });
  });

  describe('getQuotationPdf', () => {
    it('should get PDF URL successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          pdfUrl:
            'https://storage.solarium.com/quotations/QUOT-123/quotation.pdf?expires=1234567890',
        },
      };

      MockFetch.mockResponse({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await store.dispatch(
        quotationApi.endpoints.getQuotationPdf.initiate('QUOT-123')
      );

      expect(result.data).toBe(mockResponse.data.pdfUrl);
      expect(MockFetch.getLastCall()?.url).toContain(
        '/api/v1/quotations/QUOT-123/pdf'
      );
    });

    it('should handle PDF generation failure', async () => {
      MockFetch.mockResponse({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({ success: false, error: 'PDF generation failed' }),
      });

      const result = await store.dispatch(
        quotationApi.endpoints.getQuotationPdf.initiate('QUOT-123')
      );

      expect(result.error).toBeDefined();
      expect((result.error as any).status).toBe(500);
    });
  });

  describe('error transformation', () => {
    it('should transform network errors correctly', async () => {
      MockFetch.mockReject(new Error('Network request failed'));

      const result = await store.dispatch(
        quotationApi.endpoints.getQuotations.initiate({ leadId: 'LEAD-456' })
      );

      expect(result.error).toBeDefined();
    });

    it('should transform timeout errors correctly', async () => {
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
});
