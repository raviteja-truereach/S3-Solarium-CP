import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import { SyncScheduler } from '../../src/sync/SyncScheduler';
import { PerformanceMonitor } from '../../src/utils/PerformanceMonitor';
import networkSlice from '../../src/store/slices/networkSlice';

// Mock dependencies for stress testing
jest.mock('../../src/sync/SyncManager', () => ({
  SyncManager: {
    getInstance: jest.fn(() => ({
      manualSync: jest.fn(),
    })),
  },
}));

jest.mock('../../src/utils/AppStateManager');
jest.mock('../../src/store/api/dashboardApi');
jest.mock('react-native');

describe('Sync System Stress Tests', () => {
  let testStore: any;
  let scheduler: SyncScheduler;
  let performanceMonitor: PerformanceMonitor;
  let mockSyncManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset singletons
    (SyncScheduler as any).instance = null;
    (PerformanceMonitor as any).instance = null;

    // Create test store
    const rootReducer = combineReducers({
      network: networkSlice,
    });

    testStore = configureStore({
      reducer: rootReducer,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: false }),
    });

    scheduler = SyncScheduler.getInstance();
    performanceMonitor = PerformanceMonitor.getInstance();

    // Mock sync manager
    mockSyncManager = {
      manualSync: jest
        .fn()
        .mockResolvedValue({ success: true, itemsProcessed: 10 }),
    };

    require('../../src/sync/SyncManager').SyncManager.getInstance.mockReturnValue(
      mockSyncManager
    );

    // Mock AppStateManager
    require('../../src/utils/AppStateManager').AppStateManager = {
      getInstance: () => ({
        getCurrentState: () => 'active',
        isActive: () => true,
        addListener: jest.fn(() => jest.fn()),
        cleanup: jest.fn(),
        getTimeSinceActive: () => 1000,
        getTimeSinceBackground: () => null,
        wasBackgroundedLongEnough: () => false,
      }),
    };
  });

  afterEach(() => {
    scheduler.cleanup();
    performanceMonitor.cleanup();
    jest.useRealTimers();
  });

  describe('High Frequency Operations', () => {
    it('should handle rapid start/stop cycles', () => {
      // Rapid start/stop cycles
      for (let i = 0; i < 100; i++) {
        scheduler.start(testStore);
        scheduler.stop();
      }

      // Should still be in clean state
      expect(scheduler.getStatus().isRunning).toBe(false);
    });

    it('should handle many concurrent timing operations', () => {
      const timingIds: string[] = [];

      // Start many timing operations
      for (let i = 0; i < 200; i++) {
        const id = performanceMonitor.startTiming(`operation-${i}`, {
          index: i,
        });
        timingIds.push(id);
      }

      // End all timing operations
      timingIds.forEach((id) => {
        performanceMonitor.endTiming(id);
      });

      // Should not cause memory issues
      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.activeTiming).toBe(0);
    });

    it('should handle rapid app state changes', () => {
      scheduler.start(testStore);

      // Simulate rapid app state changes
      const stateListener =
        require('../../src/utils/AppStateManager').AppStateManager.getInstance()
          .addListener.mock.calls[0][0];

      for (let i = 0; i < 50; i++) {
        stateListener('background');
        stateListener('active');
      }

      // Should still be functional
      expect(scheduler.getStatus().isRunning).toBe(true);
    });
  });

  describe('Long Running Operations', () => {
    it('should handle extended operation without memory leaks', async () => {
      scheduler.start(testStore);

      // Simulate 24 hours of operation (sync every 3 minutes)
      const cycles = (24 * 60) / 3; // 480 cycles

      for (let i = 0; i < Math.min(cycles, 50); i++) {
        // Limit for test performance
        jest.advanceTimersByTime(180_000); // 3 minutes
        await new Promise((resolve) => setImmediate(resolve));
      }

      // Verify memory bounds
      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.syncHistory.length).toBeLessThanOrEqual(50); // History limit
      expect(summary.recentMemory.length).toBeLessThanOrEqual(20); // Memory snapshots limit
    });

    it('should maintain performance under load', async () => {
      scheduler.start(testStore);

      const startTime = Date.now();

      // Perform many operations
      for (let i = 0; i < 20; i++) {
        jest.advanceTimersByTime(1000);
        await new Promise((resolve) => setImmediate(resolve));
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete reasonably quickly
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });
  });

  describe('Error Resilience', () => {
    it('should survive repeated sync failures', async () => {
      // Mock repeated failures
      mockSyncManager.manualSync.mockResolvedValue({
        success: false,
        error: 'Persistent error',
      });

      scheduler.start(testStore);

      // Trigger many failed syncs
      for (let i = 0; i < 10; i++) {
        jest.advanceTimersByTime(180_000);
        await new Promise((resolve) => setImmediate(resolve));
      }

      // Scheduler should still be running
      expect(scheduler.getStatus().isRunning).toBe(true);

      // Performance monitor should track failures
      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.syncSuccessRate).toBe(0);
      expect(summary.syncHistory.every((sync) => !sync.success)).toBe(true);
    });

    it('should handle corrupted performance data', () => {
      // Corrupt internal data structures
      (performanceMonitor as any).syncPerformanceData = [
        { invalid: 'data' },
        null,
        undefined,
        { syncId: 'valid', duration: 1000, success: true },
      ];

      // Should not crash when getting summary
      expect(() => {
        const summary = performanceMonitor.getPerformanceSummary();
        expect(summary).toBeDefined();
      }).not.toThrow();
    });

    it('should handle scheduler restart scenarios', async () => {
      // Start scheduler
      scheduler.start(testStore);
      expect(scheduler.getStatus().isRunning).toBe(true);

      // Cleanup (simulating crash/restart)
      scheduler.cleanup();

      // Create new scheduler instance
      (SyncScheduler as any).instance = null;
      const newScheduler = SyncScheduler.getInstance();

      // Should start cleanly
      newScheduler.start(testStore);
      expect(newScheduler.getStatus().isRunning).toBe(true);

      newScheduler.cleanup();
    });
  });

  describe('Resource Limits', () => {
    it('should respect memory limits for performance data', () => {
      // Generate lots of sync data
      for (let i = 0; i < 100; i++) {
        const syncId = performanceMonitor.startSyncTracking(`test-${i}`);
        performanceMonitor.endSyncTracking(syncId, true);
      }

      // Should respect limits
      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.syncHistory.length).toBeLessThanOrEqual(50);
    });

    it('should handle very large performance datasets', () => {
      // Generate large metadata
      const largeMetadata = {
        data: new Array(1000).fill('x').join(''),
        items: new Array(100).fill({ id: 1, name: 'test', data: 'large' }),
      };

      const timingId = performanceMonitor.startTiming(
        'large-operation',
        largeMetadata
      );
      const result = performanceMonitor.endTiming(timingId);

      expect(result).toBeTruthy();
      expect(result!.metadata).toEqual(largeMetadata);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple schedulers safely', () => {
      // This tests the singleton pattern under stress
      const schedulers = [];

      for (let i = 0; i < 10; i++) {
        schedulers.push(SyncScheduler.getInstance());
      }

      // All should be the same instance
      expect(schedulers.every((s) => s === schedulers[0])).toBe(true);

      // Should start/stop safely
      schedulers[0].start(testStore);
      expect(schedulers[0].getStatus().isRunning).toBe(true);

      schedulers[0].cleanup();
    });

    it('should handle overlapping performance measurements', () => {
      const timingIds = [];

      // Start overlapping measurements
      for (let i = 0; i < 20; i++) {
        timingIds.push(performanceMonitor.startTiming(`concurrent-${i}`));
      }

      // End them in different order
      for (let i = timingIds.length - 1; i >= 0; i--) {
        performanceMonitor.endTiming(timingIds[i]);
      }

      // All should complete successfully
      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.activeTiming).toBe(0);
    });
  });
});
