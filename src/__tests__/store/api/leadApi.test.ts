/**
 * Lead API Tests - Comprehensive Coverage
 * Tests payload validation, page metadata, error handling, and edge cases
 */
import { configureStore } from '@reduxjs/toolkit';
import { leadApi } from '../../../store/api/leadApi';
import { authSlice } from '../../../store/slices/authSlice';
import { leadApiFetchMock, setupLeadApiMocks } from '../../mocks/fetchMock';
import { isApiLead, transformApiLeadToLead } from '../../../models/LeadModel';

// Setup mocks
setupLeadApiMocks();

const createTestStore = () => {
  return configureStore({
    reducer: {
      [leadApi.reducerPath]: leadApi.reducer,
      auth: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(leadApi.middleware),
  });
};

describe('Lead API Comprehensive Tests', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();

    // Set up authenticated user
    store.dispatch(
      authSlice.actions.loginSuccess({
        token: 'test-auth-token',
        user: {
          id: 'CP-001',
          name: 'Test Channel Partner',
          phone: '+1234567890',
          email: 'test@example.com',
        },
        expiresAt: Date.now() + 3600000,
      })
    );
  });

  describe('Happy Path - Multi-page scenarios', () => {
    it('should handle standard 3-page scenario correctly', async () => {
      leadApiFetchMock.setupStandard3PageScenario();

      const result = await store.dispatch(
        leadApi.endpoints.getLeads.initiate({ offset: 0, limit: 25 })
      );

      expect(result.data).toBeDefined();
      expect(result.data!.items).toHaveLength(25);
      expect(result.data!.total).toBe(60);
      expect(result.data!.totalPages).toBe(3);
      expect(result.data!.page).toBe(1);
      expect(result.data!.offset).toBe(0);
      expect(result.data!.limit).toBe(25);

      // Verify all items are valid
      result.data!.items.forEach((item) => {
        expect(isApiLead(item)).toBe(true);
        expect(item.leadId).toMatch(/^LEAD-\d{3}$/);
        expect(item.customerName).toBeTruthy();
        expect(item.phone).toBeTruthy();
        expect(item.address).toBeTruthy();
      });
    });

    it('should handle page 2 request correctly', async () => {
      leadApiFetchMock.setupStandard3PageScenario();

      const result = await store.dispatch(
        leadApi.endpoints.getLeads.initiate({ offset: 25, limit: 25 })
      );

      expect(result.data).toBeDefined();
      expect(result.data!.items).toHaveLength(25);
      expect(result.data!.page).toBe(2);
      expect(result.data!.offset).toBe(25);

      // Verify correct lead IDs for page 2
      expect(result.data!.items[0].leadId).toBe('LEAD-026');
      expect(result.data!.items[24].leadId).toBe('LEAD-050');
    });

    it('should handle final partial page correctly', async () => {
      leadApiFetchMock.setupStandard3PageScenario();

      const result = await store.dispatch(
        leadApi.endpoints.getLeads.initiate({ offset: 50, limit: 25 })
      );

      expect(result.data).toBeDefined();
      expect(result.data!.items).toHaveLength(10); // Only 10 remaining
      expect(result.data!.page).toBe(3);
      expect(result.data!.totalPages).toBe(3);

      // Verify correct lead IDs for final page
      expect(result.data!.items[0].leadId).toBe('LEAD-051');
      expect(result.data!.items[9].leadId).toBe('LEAD-060');
    });

    it('should handle single page scenario', async () => {
      leadApiFetchMock.setupSinglePageScenario(15);

      const result = await store.dispatch(
        leadApi.endpoints.getLeads.initiate({ offset: 0, limit: 25 })
      );

      expect(result.data).toBeDefined();
      expect(result.data!.items).toHaveLength(15);
      expect(result.data!.total).toBe(15);
      expect(result.data!.totalPages).toBe(1);
      expect(result.data!.page).toBe(1);
    });

    it('should handle empty response', async () => {
      leadApiFetchMock.setupEmptyScenario();

      const result = await store.dispatch(
        leadApi.endpoints.getLeads.initiate({ offset: 0, limit: 25 })
      );

      expect(result.data).toBeDefined();
      expect(result.data!.items).toHaveLength(0);
      expect(result.data!.total).toBe(0);
      expect(result.data!.totalPages).toBe(0);
      expect(result.data!.page).toBe(1);
    });
  });

  describe('Payload Validation', () => {
    it('should validate and filter invalid leads', async () => {
      leadApiFetchMock.setupMixedValidityScenario();

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await store.dispatch(
        leadApi.endpoints.getLeads.initiate({ offset: 0, limit: 25 })
      );

      expect(result.data).toBeDefined();
      expect(result.data!.items).toHaveLength(2); // Only 2 valid leads
      expect(result.data!.total).toBe(4); // Original total preserved

      // Should log warnings for invalid leads
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid lead skipped'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should handle completely invalid response envelope', async () => {
      leadApiFetchMock.setResponse('/api/v1/leads?offset=0&limit=25', {
        invalid: 'response',
        structure: true,
      });

      const result = await store.dispatch(
        leadApi.endpoints.getLeads.initiate({ offset: 0, limit: 25 })
      );

      expect(result.error).toBeDefined();
      expect(result.error).toEqual({
        status: 'CUSTOM_ERROR',
        error: expect.stringContaining('Invalid leads API response'),
      });
    });

    it('should handle success:false envelope', async () => {
      leadApiFetchMock.setResponse('/api/v1/leads?offset=0&limit=25', {
        success: false,
        message: 'API validation failed',
        data: null,
      });

      const result = await store.dispatch(
        leadApi.endpoints.getLeads.initiate({ offset: 0, limit: 25 })
      );

      expect(result.error).toBeDefined();
      expect(result.error).toEqual({
        status: 'CUSTOM_ERROR',
        error: expect.stringContaining('Invalid leads API response'),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      leadApiFetchMock.setupFailureScenario('network');

      const result = await store.dispatch(
        leadApi.endpoints.getLeads.initiate({ offset: 0, limit: 25 })
      );

      expect(result.error).toBeDefined();
      expect(result.error).toEqual({
        status: 'FETCH_ERROR',
        error: 'Network request failed',
      });
    });

    it('should handle 500 server errors', async () => {
      leadApiFetchMock.setupFailureScenario('server');

      const result = await store.dispatch(
        leadApi.endpoints.getLeads.initiate({ offset: 0, limit: 25 })
      );

      expect(result.error).toBeDefined();
      expect(result.error).toEqual({
        status: 500,
        data: { error: 'Server error' },
      });
    });

    it('should handle 401 authentication errors', async () => {
      leadApiFetchMock.setupFailureScenario('auth');

      const result = await store.dispatch(
        leadApi.endpoints.getLeads.initiate({ offset: 0, limit: 25 })
      );

      expect(result.error).toBeDefined();
      expect(result.error).toEqual({
        status: 401,
        data: { error: 'Authentication failed' },
      });
    });

    it('should handle unauthenticated requests', async () => {
      // Clear auth state
      store.dispatch(authSlice.actions.logout());

      const result = await store.dispatch(
        leadApi.endpoints.getLeads.initiate({ offset: 0, limit: 25 })
      );

      expect(result.error).toBeDefined();
      expect(result.error).toEqual({
        status: 401,
        data: { message: 'User not authenticated' },
      });
    });
  });

  describe('Cache Management', () => {
    it('should provide correct cache tags for successful response', async () => {
      leadApiFetchMock.setupSinglePageScenario(3);

      const endpoint = leadApi.endpoints.getLeads;

      const mockResult = {
        items: [
          { leadId: 'LEAD-001' },
          { leadId: 'LEAD-002' },
          { leadId: 'LEAD-003' },
        ],
        total: 3,
        page: 1,
        totalPages: 1,
        offset: 0,
        limit: 25,
      };

      const tags = endpoint.providesTags(mockResult, undefined, {});

      expect(tags).toEqual([
        'Lead',
        { type: 'Lead', id: 'LEAD-001' },
        { type: 'Lead', id: 'LEAD-002' },
        { type: 'Lead', id: 'LEAD-003' },
      ]);
    });

    it('should provide fallback cache tags for error response', async () => {
      const endpoint = leadApi.endpoints.getLeads;

      const tags = endpoint.providesTags(
        undefined,
        { status: 500, data: 'Server error' },
        {}
      );

      expect(tags).toEqual(['Lead']);
    });
  });

  describe('Pagination Calculation', () => {
    it('should calculate totalPages correctly for various scenarios', async () => {
      const testCases = [
        { total: 0, limit: 25, expectedPages: 0 },
        { total: 10, limit: 25, expectedPages: 1 },
        { total: 25, limit: 25, expectedPages: 1 },
        { total: 26, limit: 25, expectedPages: 2 },
        { total: 50, limit: 25, expectedPages: 2 },
        { total: 51, limit: 25, expectedPages: 3 },
        { total: 100, limit: 25, expectedPages: 4 },
      ];

      for (const testCase of testCases) {
        leadApiFetchMock.setResponse('/api/v1/leads?offset=0&limit=25', {
          success: true,
          data: {
            items: [],
            total: testCase.total,
            offset: 0,
            limit: testCase.limit,
          },
        });

        const result = await store.dispatch(
          leadApi.endpoints.getLeads.initiate({ offset: 0, limit: 25 })
        );

        expect(result.data!.totalPages).toBe(testCase.expectedPages);
      }
    });

    it('should calculate page number correctly for different offsets', async () => {
      const testCases = [
        { offset: 0, limit: 25, expectedPage: 1 },
        { offset: 25, limit: 25, expectedPage: 2 },
        { offset: 50, limit: 25, expectedPage: 3 },
        { offset: 75, limit: 25, expectedPage: 4 },
        { offset: 0, limit: 10, expectedPage: 1 },
        { offset: 10, limit: 10, expectedPage: 2 },
        { offset: 20, limit: 10, expectedPage: 3 },
      ];

      for (const testCase of testCases) {
        leadApiFetchMock.setResponse(
          `/api/v1/leads?offset=${testCase.offset}&limit=${testCase.limit}`,
          {
            success: true,
            data: {
              items: [],
              total: 100,
              offset: testCase.offset,
              limit: testCase.limit,
            },
          }
        );

        const result = await store.dispatch(
          leadApi.endpoints.getLeads.initiate({
            offset: testCase.offset,
            limit: testCase.limit,
          })
        );

        expect(result.data!.page).toBe(testCase.expectedPage);
      }
    });
  });

  describe('Default Parameters', () => {
    it('should use default parameters when none provided', async () => {
      leadApiFetchMock.setupSinglePageScenario(10);

      const result = await store.dispatch(
        leadApi.endpoints.getLeads.initiate({})
      );

      expect(result.data).toBeDefined();
      expect(result.data!.offset).toBe(0);
      expect(result.data!.limit).toBe(25); // Default limit
      expect(result.data!.page).toBe(1);
    });

    it('should handle undefined parameters', async () => {
      leadApiFetchMock.setupSinglePageScenario(10);

      const result = await store.dispatch(
        leadApi.endpoints.getLeads.initiate(undefined as any)
      );

      expect(result.data).toBeDefined();
      expect(result.data!.offset).toBe(0);
      expect(result.data!.limit).toBe(25);
      expect(result.data!.page).toBe(1);
    });
  });

  describe('Performance & Load Testing', () => {
    it('should handle large page responses efficiently', async () => {
      // Mock a large response
      const largeResponse = {
        success: true,
        data: {
          items: Array.from({ length: 100 }, (_, i) => ({
            leadId: `LARGE-LEAD-${String(i + 1).padStart(3, '0')}`,
            customerName: `Large Test Customer ${i + 1}`,
            phone: `+91${String(i + 1).padStart(10, '0')}`,
            address: `Large Test Address ${i + 1}`,
            status: 'New Lead',
            services: ['SRV001'],
            assignedTo: 'CP-001',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })),
          total: 100,
          offset: 0,
          limit: 100,
        },
      };

      leadApiFetchMock.setResponse(
        '/api/v1/leads?offset=0&limit=100',
        largeResponse
      );

      const startTime = Date.now();
      const result = await store.dispatch(
        leadApi.endpoints.getLeads.initiate({ offset: 0, limit: 100 })
      );
      const duration = Date.now() - startTime;

      expect(result.data).toBeDefined();
      expect(result.data!.items).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed API lead data gracefully', async () => {
      const malformedResponse = {
        success: true,
        data: {
          items: [
            null,
            undefined,
            {},
            {
              leadId: 'VALID-001',
              customerName: 'Valid Customer',
              phone: '1234567890',
              address: 'Valid Address',
              status: 'New Lead',
              services: ['SRV001'],
              assignedTo: 'CP-001',
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            },
            'not-an-object',
            { leadId: 'PARTIAL-001' }, // Missing required fields
          ],
          total: 6,
          offset: 0,
          limit: 25,
        },
      };

      leadApiFetchMock.setResponse(
        '/api/v1/leads?offset=0&limit=25',
        malformedResponse
      );

      const result = await store.dispatch(
        leadApi.endpoints.getLeads.initiate({ offset: 0, limit: 25 })
      );

      expect(result.data).toBeDefined();
      expect(result.data!.items).toHaveLength(1); // Only 1 valid lead
      expect(result.data!.items[0].leadId).toBe('VALID-001');
    });

    it('should handle zero total with items present', async () => {
      const inconsistentResponse = {
        success: true,
        data: {
          items: [
            {
              leadId: 'INCONSISTENT-001',
              customerName: 'Inconsistent Customer',
              phone: '1234567890',
              address: 'Inconsistent Address',
              status: 'New Lead',
              services: ['SRV001'],
              assignedTo: 'CP-001',
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            },
          ],
          total: 0, // Inconsistent with items array
          offset: 0,
          limit: 25,
        },
      };

      leadApiFetchMock.setResponse(
        '/api/v1/leads?offset=0&limit=25',
        inconsistentResponse
      );

      const result = await store.dispatch(
        leadApi.endpoints.getLeads.initiate({ offset: 0, limit: 25 })
      );

      expect(result.data).toBeDefined();
      expect(result.data!.items).toHaveLength(1);
      expect(result.data!.total).toBe(0); // Preserves API response
      expect(result.data!.totalPages).toBe(0); // Calculated from total
    });
  });
});
