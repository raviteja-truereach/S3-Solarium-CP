import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncScheduler } from '../../src/sync/SyncScheduler';
import { SyncManager } from '../../src/sync/SyncManager';
import { AppStateManager } from '../../src/utils/AppStateManager';
import { PerformanceMonitor } from '../../src/utils/PerformanceMonitor';
import { Logger } from '../../src/utils/Logger';
import { DashboardSync } from '../../src/sync/DashboardSync';
import networkSlice, {
  selectSyncInProgress,
  selectLastSyncAt,
  selectDashboardSummary,
} from '../../src/store/slices/networkSlice';
import authSlice from '../../src/store/slices/authSlice';
import { dashboardApi } from '../../src/store/api/dashboardApi';

// Mock all external dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

// Mock base query
const mockBaseQuery = jest.fn();
jest.mock('../../src/store/api/baseQuery', () => ({
  baseQuery: mockBaseQuery,
}));

// Mock SyncManager
const mockSyncManager = {
  manualSync: jest.fn(),
  getLastSyncResult: jest.fn(),
  cleanup: jest.fn(),
};

jest.mock('../../src/sync/SyncManager', () => ({
  SyncManager: {
    getInstance: jest.fn(() => mockSyncManager),
  },
}));

// Create comprehensive test store
const createIntegrationTestStore = () => {
  const rootReducer = combineReducers({
    auth: authSlice,
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

describe('Sync System Integration Tests', () => {
  let testStore: ReturnType<typeof createIntegrationTestStore>;
  let scheduler: SyncScheduler;
  let appStateManager: AppStateManager;
  let performanceMonitor: PerformanceMonitor;
  let logger: Logger;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock AsyncStorage
    const mockAsyncStorage = AsyncStorage as jest.MockedFunction<any>;
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);

    // Reset all singletons
    (SyncScheduler as any).instance = null;
    (AppStateManager as any).instance = null;
    (PerformanceMonitor as any).instance = null;
    (Logger as any).instance = null;

    // Create test store and instances
    testStore = createIntegrationTestStore();
    scheduler = SyncScheduler.getInstance();
    appStateManager = AppStateManager.getInstance();
    performanceMonitor = PerformanceMonitor.getInstance();
    logger = Logger.getInstance();

    // Mock successful sync by default
    mockSyncManager.manualSync.mockResolvedValue({
      success: true,
      itemsProcessed: 10,
      message: 'Sync completed successfully',
    });

    // Mock successful dashboard API
    mockBaseQuery.mockResolvedValue({
      data: {
        success: true,
        data: {
          totalLeads: 100,
          leadsWon: 25,
          customerAccepted: 5,
          followUpPending: 30,
          activeQuotations: 15,
          totalCommission: 50000,
          pendingCommission: 10000,
          lastUpdatedAt: '2024-01-15T10:30:00Z',
        },
        timestamp: '2024-01-15T10:30:00Z',
      },
    });
  });

  afterEach(() => {
    // Cleanup all singletons
    scheduler.cleanup();
    appStateManager.cleanup();
    performanceMonitor.cleanup();
    logger.cleanup();

    jest.useRealTimers();
  });

  describe('Full Sync Flow Integration', () => {
    it('should perform complete sync cycle with all components', async () => {
      // Start scheduler
      scheduler.start(testStore);

      // Verify initial state
      expect(scheduler.getStatus().isRunning).toBe(true);
      expect(selectSyncInProgress(testStore.getState())).toBe(false);

      // Trigger sync cycle
      jest.advanceTimersByTime(1000); // Initial delay
      await new Promise((resolve) => setImmediate(resolve));

      // Verify sync was called
      expect(mockSyncManager.manualSync).toHaveBeenCalledWith('scheduler');

      // Verify dashboard API was called
      expect(mockBaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/dashboard/summary',
          method: 'GET',
        }),
        expect.any(Object),
        expect.any(Object)
      );

      // Verify store state updates
      const finalState = testStore.getState();
      expect(selectLastSyncAt(finalState)).toBeGreaterThan(0);
      expect(selectDashboardSummary(finalState)).toBeTruthy();

      // Verify performance monitoring
      const performanceSummary = performanceMonitor.getPerformanceSummary();
      expect(performanceSummary.syncHistory.length).toBeGreaterThan(0);
      expect(performanceSummary.syncHistory[0].success).toBe(true);
    });

    it('should handle sync failures gracefully', async () => {
      // Mock sync failure
      mockSyncManager.manualSync.mockResolvedValue({
        success: false,
        error: 'Network timeout',
      });

      scheduler.start(testStore);

      // Trigger sync
      jest.advanceTimersByTime(1000);
      await new Promise((resolve) => setImmediate(resolve));

      // Verify error handling
      const state = testStore.getState();
      expect(state.network.lastError).toBe('Network timeout');
      expect(state.network.syncInProgress).toBe(false);

      // Verify performance tracking of failures
      const performanceSummary = performanceMonitor.getPerformanceSummary();
      expect(performanceSummary.syncHistory[0].success).toBe(false);
      expect(performanceSummary.syncHistory[0].error).toBe('Network timeout');
    });

    it('should continue sync when dashboard API fails', async () => {
      // Mock dashboard API failure
      mockBaseQuery.mockResolvedValue({
        error: {
          status: 500,
          data: { error: 'Server error' },
        },
      });

      scheduler.start(testStore);

      // Trigger sync
      jest.advanceTimersByTime(1000);
      await new Promise((resolve) => setImmediate(resolve));

      // Verify sync still completed (dashboard failure doesn't break sync)
      const state = testStore.getState();
      expect(selectLastSyncAt(state)).toBeGreaterThan(0);
      expect(state.network.lastError).toBeNull(); // Sync itself succeeded

      // Verify performance tracking
      const performanceSummary = performanceMonitor.getPerformanceSummary();
      expect(performanceSummary.syncHistory[0].success).toBe(true);
    });
  });

  describe('App Lifecycle Integration', () => {
    it('should handle background/foreground transitions', async () => {
      scheduler.start(testStore);
      expect(scheduler.getStatus().isRunning).toBe(true);

      // Simulate app going to background
      const appStateListener = jest.mocked(
        require('react-native').AppState.addEventListener
      ).mock.calls[0][1];
      appStateListener('background');

      // Verify scheduler paused
      expect(scheduler.getStatus().isPaused).toBe(true);

      // Verify pause action dispatched
      const state = testStore.getState();
      expect(state.network.syncInProgress).toBe(false);

      // Simulate app returning to foreground
      appStateListener('active');

      // Verify scheduler resumed
      expect(scheduler.getStatus().isPaused).toBe(false);
      expect(scheduler.getStatus().isRunning).toBe(true);
    });

    it('should trigger immediate sync after long background', async () => {
      scheduler.start(testStore);

      // Mock long background duration
      jest
        .spyOn(appStateManager, 'wasBackgroundedLongEnough')
        .mockReturnValue(true);

      // Simulate app returning from long background
      const appStateListener = jest.mocked(
        require('react-native').AppState.addEventListener
      ).mock.calls[0][1];
      appStateListener('active');

      // Fast forward to trigger immediate sync
      jest.advanceTimersByTime(3000);
      await new Promise((resolve) => setImmediate(resolve));

      // Verify immediate sync was triggered
      expect(mockSyncManager.manualSync).toHaveBeenCalledWith('scheduler');
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track memory usage during sync operations', async () => {
      // Mock memory info
      global.performance = {
        now: jest.fn(() => Date.now()),
        memory: {
          usedJSHeapSize: 1024 * 1024,
          totalJSHeapSize: 2 * 1024 * 1024,
        },
      } as any;

      scheduler.start(testStore);

      // Trigger sync
      jest.advanceTimersByTime(1000);
      await new Promise((resolve) => setImmediate(resolve));

      // Verify memory snapshots were taken
      const performanceSummary = performanceMonitor.getPerformanceSummary();
      expect(performanceSummary.recentMemory.length).toBeGreaterThan(0);

      // Verify sync performance data includes memory info
      const syncData = performanceSummary.syncHistory[0];
      expect(syncData.memoryBefore).toBeDefined();
      expect(syncData.memoryAfter).toBeDefined();
    });

    it('should detect performance degradation', async () => {
      // Mock slow sync
      mockSyncManager.manualSync.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ success: true, itemsProcessed: 5 }),
              5000
            )
          )
      );

      scheduler.start(testStore);

      // Trigger slow sync
      jest.advanceTimersByTime(1000);
      jest.advanceTimersByTime(5000); // Let sync complete
      await new Promise((resolve) => setImmediate(resolve));

      // Verify performance tracking shows slow sync
      const performanceSummary = performanceMonitor.getPerformanceSummary();
      expect(performanceSummary.averageSyncDuration).toBeGreaterThan(4000);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from scheduler crashes', async () => {
      scheduler.start(testStore);

      // Simulate scheduler error
      jest
        .spyOn(scheduler as any, 'performScheduledSync')
        .mockRejectedValue(new Error('Scheduler crashed'));

      // Trigger sync that will crash
      jest.advanceTimersByTime(1000);
      await new Promise((resolve) => setImmediate(resolve));

      // Scheduler should still be running (error handled)
      expect(scheduler.getStatus().isRunning).toBe(true);

      // Error should be logged
      const errorLogs = logger.getLogsByLevel('error');
      expect(
        errorLogs.some((log) => log.message.includes('Scheduler crashed'))
      ).toBe(true);
    });

    it('should handle store becoming unavailable', async () => {
      scheduler.start(testStore);

      // Simulate store becoming null
      (scheduler as any).store = null;

      // Trigger sync attempt
      jest.advanceTimersByTime(1000);
      await new Promise((resolve) => setImmediate(resolve));

      // Should handle gracefully without crashing
      const warningLogs = logger.getLogsByCategory('SyncScheduler');
      expect(
        warningLogs.some((log) => log.message.includes('No store available'))
      ).toBe(true);
    });
  });

  describe('Manual Dashboard Refresh Integration', () => {
    it('should integrate manual dashboard refresh with performance monitoring', async () => {
      const result = await DashboardSync.refreshSummary(testStore);

      expect(result.success).toBe(true);
      expect(mockBaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/dashboard/summary',
          params: expect.objectContaining({
            _t: expect.any(Number),
          }),
        }),
        expect.any(Object),
        expect.any(Object)
      );

      // Verify dashboard data in store
      const state = testStore.getState();
      expect(selectDashboardSummary(state)).toBeTruthy();
    });

    it('should handle dashboard API errors in manual refresh', async () => {
      mockBaseQuery.mockResolvedValue({
        error: {
          status: 401,
          data: { error: 'Unauthorized' },
        },
      });

      const result = await DashboardSync.refreshSummary(testStore);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });
  });

  describe('Memory Management and Cleanup', () => {
    it('should not leak memory during extended operation', async () => {
      const initialMemorySnapshots =
        performanceMonitor.getPerformanceSummary().recentMemory.length;

      scheduler.start(testStore);

      // Simulate multiple sync cycles
      for (let i = 0; i < 10; i++) {
        jest.advanceTimersByTime(180_000); // Full sync interval
        await new Promise((resolve) => setImmediate(resolve));
      }

      // Verify memory snapshots don't grow unbounded
      const finalMemorySnapshots =
        performanceMonitor.getPerformanceSummary().recentMemory.length;
      expect(finalMemorySnapshots).toBeLessThanOrEqual(20); // Max snapshots limit

      // Verify sync history doesn't grow unbounded
      const syncHistory =
        performanceMonitor.getPerformanceSummary().syncHistory.length;
      expect(syncHistory).toBeLessThanOrEqual(50); // Max sync history limit
    });

    it('should cleanup all resources properly', () => {
      scheduler.start(testStore);

      // Create some performance data
      const timingId = performanceMonitor.startTiming('test-operation');
      performanceMonitor.endTiming(timingId);

      // Add some logs
      logger.info('Test', 'Test message');

      // Verify resources exist
      expect(scheduler.getStatus().isRunning).toBe(true);
      expect(
        performanceMonitor.getPerformanceSummary().syncHistory.length
      ).toBeGreaterThan(0);
      expect(logger.getRecentLogs().length).toBeGreaterThan(0);

      // Cleanup all
      scheduler.cleanup();
      appStateManager.cleanup();
      performanceMonitor.cleanup();
      logger.cleanup();

      // Verify cleanup
      expect(scheduler.getStatus().isRunning).toBe(false);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across sync cycles', async () => {
      scheduler.start(testStore);

      // Perform multiple sync cycles
      for (let i = 0; i < 3; i++) {
        jest.advanceTimersByTime(1000);
        await new Promise((resolve) => setImmediate(resolve));

        // Verify state consistency after each sync
        const state = testStore.getState();
        expect(selectLastSyncAt(state)).toBeGreaterThan(0);
        expect(state.network.syncInProgress).toBe(false);

        // Wait for next interval
        jest.advanceTimersByTime(179_000);
      }

      // Verify final state
      const finalState = testStore.getState();
      expect(selectDashboardSummary(finalState)).toBeTruthy();

      // Verify performance data consistency
      const performanceSummary = performanceMonitor.getPerformanceSummary();
      expect(performanceSummary.syncHistory.length).toBe(3);
      expect(performanceSummary.syncSuccessRate).toBe(100);
    });
  });
});
