import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import { DashboardSync } from '../../src/sync/DashboardSync';
import { dashboardApi } from '../../src/store/api/dashboardApi';
import networkSlice from '../../src/store/slices/networkSlice';

// Mock the base query
const mockBaseQuery = jest.fn();

jest.mock('../../src/store/api/baseQuery', () => ({
  baseQuery: mockBaseQuery,
}));

const createTestStore = () => {
  const rootReducer = combineReducers({
    network: networkSlice,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
  });

  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }).concat(
        dashboardApi.middleware
      ),
  });
};

describe('DashboardSync', () => {
  let testStore: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    testStore = createTestStore();
    mockBaseQuery.mockClear();
  });

  describe('refreshSummary', () => {
    it('should refresh dashboard successfully', async () => {
      const mockData = {
        totalLeads: 100,
        leadsWon: 20,
        customerAccepted: 5,
        followUpPending: 30,
        activeQuotations: 15,
        totalCommission: 50000,
        pendingCommission: 10000,
        lastUpdatedAt: '2024-01-15T10:30:00Z',
      };

      const mockResponse = {
        success: true,
        data: mockData,
        timestamp: '2024-01-15T10:30:00Z',
      };

      mockBaseQuery.mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await DashboardSync.refreshSummary(testStore);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockBaseQuery).toHaveBeenCalled();
    });

    it('should handle refresh failure', async () => {
      mockBaseQuery.mockResolvedValueOnce({
        error: {
          status: 500,
          data: { error: 'Server error' },
        },
      });

      const result = await DashboardSync.refreshSummary(testStore);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include request parameters', async () => {
      const mockResponse = {
        success: true,
        data: {},
        timestamp: '2024-01-15T10:30:00Z',
      };

      mockBaseQuery.mockResolvedValueOnce({
        data: mockResponse,
      });

      const params = {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      };

      await DashboardSync.refreshSummary(testStore, params);

      expect(mockBaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
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

  describe('isDashboardStale', () => {
    it('should return true for no timestamp', () => {
      expect(DashboardSync.isDashboardStale()).toBe(true);
      expect(DashboardSync.isDashboardStale('')).toBe(true);
    });

    it('should return true for old timestamp', () => {
      const oldTimestamp = new Date(Date.now() - 400_000).toISOString(); // 6+ minutes ago
      expect(DashboardSync.isDashboardStale(oldTimestamp)).toBe(true);
    });

    it('should return false for recent timestamp', () => {
      const recentTimestamp = new Date(Date.now() - 200_000).toISOString(); // 3 minutes ago
      expect(DashboardSync.isDashboardStale(recentTimestamp)).toBe(false);
    });

    it('should respect custom max age', () => {
      const timestamp = new Date(Date.now() - 120_000).toISOString(); // 2 minutes ago

      expect(DashboardSync.isDashboardStale(timestamp, 60_000)).toBe(true); // 1 minute max
      expect(DashboardSync.isDashboardStale(timestamp, 180_000)).toBe(false); // 3 minutes max
    });
  });
});
