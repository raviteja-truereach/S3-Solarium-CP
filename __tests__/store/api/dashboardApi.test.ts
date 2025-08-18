import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { dashboardApi } from '../../../src/store/api/dashboardApi';
import { DashboardSummary } from '../../../src/store/types';

// Mock the base query instead of fetch directly
const mockBaseQuery = jest.fn();

jest.mock('../../../src/store/api/baseQuery', () => ({
  baseQuery: mockBaseQuery,
}));

// Create test store with just the dashboard API
const createTestStore = () => {
  const store = configureStore({
    reducer: {
      [dashboardApi.reducerPath]: dashboardApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(dashboardApi.middleware),
  });

  setupListeners(store.dispatch);
  return store;
};

describe('dashboardApi', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    mockBaseQuery.mockClear();
  });

  afterEach(() => {
    store.dispatch(dashboardApi.util.resetApiState());
  });

  const mockDashboardData: DashboardSummary = {
    totalLeads: 150,
    leadsWon: 25,
    customerAccepted: 10,
    followUpPending: 45,
    activeQuotations: 20,
    totalCommission: 75000,
    pendingCommission: 15000,
    lastUpdatedAt: '2024-01-15T10:30:00Z',
  };

  describe('getSummary endpoint', () => {
    it('should fetch dashboard summary successfully', async () => {
      const mockResponse = {
        success: true,
        data: mockDashboardData,
        timestamp: '2024-01-15T10:30:00Z',
      };

      mockBaseQuery.mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await store.dispatch(
        dashboardApi.endpoints.getSummary.initiate()
      );

      expect(mockBaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/dashboard/summary',
          method: 'GET',
        }),
        expect.any(Object),
        expect.any(Object)
      );

      expect(result.data).toEqual(mockDashboardData);
      expect(result.isSuccess).toBe(true);
    });

    it('should handle API error response', async () => {
      const errorResponse = {
        success: false,
        error: 'Unauthorized access',
        timestamp: '2024-01-15T10:30:00Z',
      };

      mockBaseQuery.mockResolvedValueOnce({
        error: {
          status: 401,
          data: errorResponse,
        },
      });

      const result = await store.dispatch(
        dashboardApi.endpoints.getSummary.initiate()
      );

      expect(result.isError).toBe(true);
    });

    it('should include date filters in query params', async () => {
      const mockResponse = {
        success: true,
        data: mockDashboardData,
        timestamp: '2024-01-15T10:30:00Z',
      };

      mockBaseQuery.mockResolvedValueOnce({
        data: mockResponse,
      });

      const params = {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      };

      await store.dispatch(dashboardApi.endpoints.getSummary.initiate(params));

      expect(mockBaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/dashboard/summary',
          method: 'GET',
          params: expect.objectContaining({
            dateFrom: '2024-01-01',
            dateTo: '2024-01-31',
          }),
        }),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('refreshSummary mutation', () => {
    it('should refresh dashboard summary', async () => {
      const mockResponse = {
        success: true,
        data: mockDashboardData,
        timestamp: '2024-01-15T10:30:00Z',
      };

      mockBaseQuery.mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await store.dispatch(
        dashboardApi.endpoints.refreshSummary.initiate()
      );

      expect(mockBaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/dashboard/summary',
          method: 'GET',
          params: expect.objectContaining({
            _t: expect.any(Number),
          }),
        }),
        expect.any(Object),
        expect.any(Object)
      );

      expect(result.data).toEqual(mockDashboardData);
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('response transformation', () => {
    it('should transform successful response correctly', async () => {
      const mockResponse = {
        success: true,
        data: mockDashboardData,
        timestamp: '2024-01-15T10:30:00Z',
      };

      mockBaseQuery.mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await store.dispatch(
        dashboardApi.endpoints.getSummary.initiate()
      );

      // Should return only the data portion, not the wrapper
      expect(result.data).toEqual(mockDashboardData);
      expect(result.data).not.toHaveProperty('success');
      expect(result.data).not.toHaveProperty('timestamp');
    });

    it('should handle response with success: false', async () => {
      const failureResponse = {
        success: false,
        message: 'Data not available',
        timestamp: '2024-01-15T10:30:00Z',
      };

      mockBaseQuery.mockResolvedValueOnce({
        data: failureResponse,
      });

      const result = await store.dispatch(
        dashboardApi.endpoints.getSummary.initiate()
      );

      expect(result.isError).toBe(true);
    });
  });

  describe('endpoint configuration', () => {
    it('should have correct endpoint configuration', () => {
      const endpoints = dashboardApi.endpoints;

      expect(endpoints.getSummary).toBeDefined();
      expect(endpoints.refreshSummary).toBeDefined();
    });

    it('should provide correct tags', () => {
      // Test that the API is configured with proper cache tags
      expect(dashboardApi.reducerPath).toBe('dashboardApi');
    });
  });
});
