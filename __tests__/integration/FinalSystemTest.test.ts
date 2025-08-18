import { SystemCleanup } from '../../src/utils/SystemCleanup';
import { SyncScheduler } from '../../src/sync/SyncScheduler';
import { PerformanceMonitor } from '../../src/utils/PerformanceMonitor';
import { Logger } from '../../src/utils/Logger';
import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import networkSlice from '../../src/store/slices/networkSlice';

// Mock all external dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('../../src/sync/SyncManager');
jest.mock('../../src/store/api/baseQuery');

describe('Final System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all singletons
    (SyncScheduler as any).instance = null;
    (PerformanceMonitor as any).instance = null;
    (Logger as any).instance = null;
  });

  afterEach(async () => {
    // Always cleanup after each test
    await SystemCleanup.performFullCleanup();
  });

  describe('Complete System Lifecycle', () => {
    it('should handle full system startup, operation, and shutdown', async () => {
      // Create test store
      const testStore = configureStore({
        reducer: combineReducers({ network: networkSlice }),
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware({ serializableCheck: false }),
      });

      // 1. System startup
      const scheduler = SyncScheduler.getInstance();
      const performanceMonitor = PerformanceMonitor.getInstance();
      const logger = Logger.getInstance();

      expect(scheduler).toBeDefined();
      expect(performanceMonitor).toBeDefined();
      expect(logger).toBeDefined();

      // 2. System operation
      scheduler.start(testStore);

      // Simulate some operations
      const timingId = performanceMonitor.startTiming('test-operation');
      performanceMonitor.endTiming(timingId);

      logger.info('Test', 'System operational');

      // Verify system is running
      expect(scheduler.getStatus().isRunning).toBe(true);
      expect(
        performanceMonitor.getPerformanceSummary().recentMemory.length
      ).toBeGreaterThan(0);
      expect(logger.getRecentLogs().length).toBeGreaterThan(0);

      // 3. System shutdown
      const cleanupReport = await SystemCleanup.performFullCleanup();

      expect(cleanupReport.componentsCleanedUp).toContain('SyncScheduler');
      expect(cleanupReport.componentsCleanedUp).toContain('PerformanceMonitor');
      expect(cleanupReport.componentsCleanedUp).toContain('Logger');
      expect(cleanupReport.errors).toHaveLength(0);
      expect(cleanupReport.totalDuration).toBeGreaterThan(0);
    });

    it('should recover from system errors during operation', async () => {
      const testStore = configureStore({
        reducer: combineReducers({ network: networkSlice }),
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware({ serializableCheck: false }),
      });

      // Start system
      const scheduler = SyncScheduler.getInstance();
      const logger = Logger.getInstance();

      scheduler.start(testStore);

      // Simulate system errors
      logger.error('System', 'Simulated error', new Error('Test error'));

      // System health check should detect issues
      const health = SystemCleanup.checkSystemHealth();
      expect(health.reasons.length).toBeGreaterThan(0);

      // System should still be operational
      expect(scheduler.getStatus().isRunning).toBe(true);

      // Cleanup should succeed despite errors
      const cleanupReport = await SystemCleanup.performFullCleanup();
      expect(cleanupReport.totalDuration).toBeGreaterThan(0);
    });
  });

  describe('System Health Monitoring', () => {
    it('should accurately assess system health', () => {
      // Create system with some issues
      const performanceMonitor = PerformanceMonitor.getInstance();
      const logger = Logger.getInstance();

      // Generate some errors
      for (let i = 0; i < 15; i++) {
        logger.error('Test', `Error ${i}`, new Error(`Test error ${i}`));
      }

      // Generate large sync history
      for (let i = 0; i < 45; i++) {
        const syncId = performanceMonitor.startSyncTracking(`sync-${i}`);
        performanceMonitor.endSyncTracking(syncId, i % 3 === 0); // 33% success rate
      }

      const health = SystemCleanup.checkSystemHealth();

      expect(health.needsCleanup).toBe(true);
      expect(health.reasons).toContain('High error count in logs');
      expect(health.reasons).toContain('Poor sync success rate');
      expect(health.recommendations.length).toBeGreaterThan(0);
    });

    it('should generate comprehensive diagnostic report', () => {
      // Initialize system components
      const scheduler = SyncScheduler.getInstance();
      const performanceMonitor = PerformanceMonitor.getInstance();
      const logger = Logger.getInstance();

      // Generate some activity
      const timingId = performanceMonitor.startTiming('diagnostic-test');
      performanceMonitor.endTiming(timingId);
      logger.info('Diagnostic', 'Test message');

      const report = SystemCleanup.generateDiagnosticReport();

      expect(report).toContain('SYSTEM DIAGNOSTIC REPORT');
      expect(report).toContain('System Health');
      expect(report).toContain('Component Status');
      expect(report).toContain('Scheduler:');
      expect(report).toContain('Performance Monitor:');
    });
  });

  describe('Memory Management', () => {
    it('should detect and report memory leaks', () => {
      // Mock increasing memory usage
      global.performance = {
        now: jest.fn(() => Date.now()),
        memory: {
          usedJSHeapSize: 1024 * 1024,
          totalJSHeapSize: 2 * 1024 * 1024,
        },
      } as any;

      const performanceMonitor = PerformanceMonitor.getInstance();
      const mockMemory = global.performance.memory as any;

      // Create increasing memory pattern
      mockMemory.usedJSHeapSize = 1024 * 1024; // 1MB
      performanceMonitor.takeMemorySnapshot();

      mockMemory.usedJSHeapSize = 1.8 * 1024 * 1024; // 1.8MB
      performanceMonitor.takeMemorySnapshot();

      mockMemory.usedJSHeapSize = 2.5 * 1024 * 1024; // 2.5MB
      performanceMonitor.takeMemorySnapshot();

      const health = SystemCleanup.checkSystemHealth();
      expect(health.reasons).toContain('Potential memory leak detected');
      expect(health.recommendations).toContain('Perform full system cleanup');
    });

    it('should reduce memory usage after cleanup', async () => {
      // Mock memory info
      global.performance = {
        now: jest.fn(() => Date.now()),
        memory: {
          usedJSHeapSize: 2 * 1024 * 1024, // 2MB
          totalJSHeapSize: 4 * 1024 * 1024, // 4MB
        },
      } as any;

      const performanceMonitor = PerformanceMonitor.getInstance();
      const logger = Logger.getInstance();

      // Generate data that uses memory
      for (let i = 0; i < 50; i++) {
        const syncId = performanceMonitor.startSyncTracking(`sync-${i}`);
        performanceMonitor.endSyncTracking(syncId, true);
        logger.info('Test', `Message ${i}`, { data: new Array(100).fill('x') });
      }

      // Perform cleanup
      const cleanupReport = await SystemCleanup.performFullCleanup();

      expect(cleanupReport.memoryBefore).toBeDefined();
      expect(cleanupReport.memoryAfter).toBeDefined();
      expect(cleanupReport.componentsCleanedUp.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery', () => {
    it('should handle cleanup failures gracefully', async () => {
      // Mock a component that fails to cleanup
      const originalScheduler = SyncScheduler.getInstance;
      (SyncScheduler as any).getInstance = jest.fn(() => ({
        cleanup: jest.fn(() => {
          throw new Error('Cleanup failed');
        }),
      }));

      const cleanupReport = await SystemCleanup.performFullCleanup();

      expect(cleanupReport.errors.length).toBeGreaterThan(0);
      expect(cleanupReport.errors[0]).toContain('Cleanup failed');
      expect(cleanupReport.totalDuration).toBeGreaterThan(0);

      // Restore original
      (SyncScheduler as any).getInstance = originalScheduler;
    });

    it('should continue cleanup even when some components fail', async () => {
      // Mock multiple failing components
      (SyncScheduler as any).getInstance = jest.fn(() => ({
        cleanup: jest.fn(() => {
          throw new Error('Scheduler failed');
        }),
      }));

      (PerformanceMonitor as any).getInstance = jest.fn(() => ({
        cleanup: jest.fn(() => {
          throw new Error('Performance monitor failed');
        }),
      }));

      (Logger as any).getInstance = jest.fn(() => ({
        cleanup: jest.fn(), // This one succeeds
      }));

      const cleanupReport = await SystemCleanup.performFullCleanup();

      // Should have errors but still complete
      expect(cleanupReport.errors.length).toBe(2);
      expect(cleanupReport.componentsCleanedUp).toContain('Logger');
      expect(cleanupReport.totalDuration).toBeGreaterThan(0);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should complete full cleanup within reasonable time', async () => {
      const startTime = Date.now();

      // Initialize all components
      const scheduler = SyncScheduler.getInstance();
      const performanceMonitor = PerformanceMonitor.getInstance();
      const logger = Logger.getInstance();

      // Generate some data
      for (let i = 0; i < 20; i++) {
        const syncId = performanceMonitor.startSyncTracking(`perf-test-${i}`);
        performanceMonitor.endSyncTracking(syncId, true);
        logger.info('Perf', `Performance test ${i}`);
      }

      const cleanupReport = await SystemCleanup.performFullCleanup();
      const totalTime = Date.now() - startTime;

      // Should complete quickly
      expect(totalTime).toBeLessThan(5000); // 5 seconds max
      expect(cleanupReport.totalDuration).toBeLessThan(2000); // 2 seconds max for cleanup itself
      expect(cleanupReport.errors).toHaveLength(0);
    });
  });
});
