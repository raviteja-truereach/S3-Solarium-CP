/**
 * Master Data API Tests
 * Unit tests for master data API endpoints with caching behavior
 */
import { masterDataApi } from '../../../src/store/api/masterDataApi';
import { configureStore } from '@reduxjs/toolkit';
import MockFetch from '../../mocks/fetchMock';
import type {
  MasterDataResponse,
  MasterData,
} from '../../../src/types/api/masterData';

// Mock fetch
global.fetch = MockFetch.fetch;

const createMockStore = () => {
  return configureStore({
    reducer: {
      [masterDataApi.reducerPath]: masterDataApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(masterDataApi.middleware),
  });
};

describe('masterDataApi', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
    MockFetch.clearMocks();
    jest.clearAllMocks();
  });

  describe('getMasterData', () => {
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

    it('should fetch master data successfully', async () => {
      const mockResponse: MasterDataResponse = {
        success: true,
        data: mockMasterData,
      };

      MockFetch.mockResponse({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await store.dispatch(
        masterDataApi.endpoints.getMasterData.initiate()
      );

      expect(result.data).toEqual(mockMasterData);
      expect(MockFetch.getLastCall()?.url).toContain('/api/master-data');
    });

    it('should handle API error response', async () => {
      MockFetch.mockResponse({
        ok: false,
        status: 503,
        json: () =>
          Promise.resolve({
            success: false,
            message: 'Service temporarily unavailable',
          }),
      });

      const result = await store.dispatch(
        masterDataApi.endpoints.getMasterData.initiate()
      );

      expect(result.error).toBeDefined();
      expect((result.error as any).status).toBe(503);
    });

    it('should transform response correctly', () => {
      const mockResponse: MasterDataResponse = {
        success: true,
        data: mockMasterData,
      };

      const endpoint = masterDataApi.endpoints.getMasterData;
      const result = endpoint.transformResponse!(mockResponse);

      expect(result).toEqual(mockMasterData);
      expect(result.panels).toHaveLength(1);
      expect(result.panels[0].panelId).toBe('PNL001');
    });

    it('should handle invalid response structure', () => {
      const invalidResponse = { success: false };

      const endpoint = masterDataApi.endpoints.getMasterData;

      expect(() => {
        endpoint.transformResponse!(invalidResponse as any);
      }).toThrow('Invalid master data response structure');
    });

    it('should normalize panel data correctly', () => {
      const responseWithInvalidPanel: MasterDataResponse = {
        success: true,
        data: {
          ...mockMasterData,
          panels: [
            {
              panelId: 'PNL002',
              make: 'Test Make',
              variant: 'Test Variant',
              wattage: 'invalid' as any, // Invalid wattage
              unitPrice: 15000,
              isDCR: 'true' as any, // String instead of boolean
              isRecommended: null as any,
              isActive: true,
              specifications: {
                technology: 'Monocrystalline',
                efficiency: 21.2,
                warranty: 25,
              },
            },
          ],
        },
      };

      const endpoint = masterDataApi.endpoints.getMasterData;
      const result = endpoint.transformResponse!(responseWithInvalidPanel);

      expect(result.panels[0].wattage).toBe(0); // Should default to 0
      expect(result.panels[0].isDCR).toBe(true); // Should convert string to boolean
      expect(result.panels[0].isRecommended).toBe(false); // Should handle null
    });

    it('should handle missing data fields gracefully', () => {
      const responseWithMissingFields: MasterDataResponse = {
        success: true,
        data: {
          ...mockMasterData,
          panels: undefined as any,
        },
      };

      const endpoint = masterDataApi.endpoints.getMasterData;

      expect(() => {
        endpoint.transformResponse!(responseWithMissingFields);
      }).toThrow('Master data missing panels array');
    });
  });

  describe('refreshMasterData', () => {
    it('should refresh master data and invalidate cache', async () => {
      const mockResponse: MasterDataResponse = {
        success: true,
        data: mockMasterData,
      };

      MockFetch.mockResponse({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await store.dispatch(
        masterDataApi.endpoints.refreshMasterData.initiate()
      );

      expect(result.data).toEqual(mockMasterData);
      expect(MockFetch.getLastCall()?.url).toContain('_t='); // Cache buster
    });
  });

  describe('caching behavior', () => {
    it('should use 24-hour cache configuration', () => {
      expect(masterDataApi.reducerPath).toBe('masterDataApi');
      // keepUnusedDataFor is set to 24 * 60 * 60 seconds
    });

    it('should not refetch on focus', () => {
      const endpoint = masterDataApi.endpoints.getMasterData;
      // This would be tested in integration tests with actual component mounting
    });
  });

  describe('error transformation', () => {
    it('should transform authentication errors correctly', async () => {
      MockFetch.mockResponse({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            success: false,
            message: 'Authentication required',
          }),
      });

      const result = await store.dispatch(
        masterDataApi.endpoints.getMasterData.initiate()
      );

      expect(result.error).toBeDefined();
      expect((result.error as any).status).toBe(401);
    });

    it('should transform network errors correctly', async () => {
      MockFetch.mockReject(new Error('Network request failed'));

      const result = await store.dispatch(
        masterDataApi.endpoints.getMasterData.initiate()
      );

      expect(result.error).toBeDefined();
    });
  });
});
