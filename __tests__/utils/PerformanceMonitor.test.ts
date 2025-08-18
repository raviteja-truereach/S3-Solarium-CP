import { PerformanceMonitor } from '../../src/utils/PerformanceMonitor';

// Mock performance.now
global.performance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 1024 * 1024, // 1MB
    totalJSHeapSize: 2 * 1024 * 1024, // 2MB
  },
} as any;

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset singleton
    (PerformanceMonitor as any).instance = null;
    monitor = PerformanceMonitor.getInstance();
  });

  afterEach(() => {
    monitor.cleanup();
    jest.useRealTimers();
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = PerformanceMonitor.getInstance();
      const instance2 = PerformanceMonitor.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('timing measurements', () => {
    it('should track timing metrics', () => {
      const mockPerformanceNow = performance.now as jest.Mock;
      mockPerformanceNow.mockReturnValueOnce(1000); // Start time
      mockPerformanceNow.mockReturnValueOnce(1500); // End time

      const metricId = monitor.startTiming('test-operation', { userId: '123' });
      expect(metricId).toMatch(/^test-operation_\d+_\w+$/);

      const result = monitor.endTiming(metricId);
      expect(result).toBeTruthy();
      expect(result!.duration).toBe(500);
      expect(result!.name).toBe('test-operation');
      expect(result!.metadata).toEqual({ userId: '123' });
    });

    it('should handle timing errors', () => {
      const metricId = monitor.startTiming('failing-operation');
      const result = monitor.endTiming(metricId, 'Network timeout');

      expect(result!.error).toBe('Network timeout');
      expect(result!.duration).toBeGreaterThan(0);
    });

    it('should handle invalid metric IDs', () => {
      const result = monitor.endTiming('invalid-id');
      expect(result).toBeNull();
    });
  });

  describe('sync performance tracking', () => {
    it('should track sync performance', () => {
      const syncId = monitor.startSyncTracking('manual', { userId: '123' });
      expect(syncId).toMatch(/^sync_\d+_\w+$/);

      // Fast forward time
      jest.advanceTimersByTime(2000);

      const result = monitor.endSyncTracking(syncId, true, undefined, {
        itemsProcessed: 50,
        apiCallCount: 3,
      });

      expect(result).toBeTruthy();
      expect(result!.success).toBe(true);
      expect(result!.source).toBe('manual');
      expect(result!.itemsProcessed).toBe(50);
      expect(result!.apiCallCount).toBe(3);
      expect(result!.duration).toBeGreaterThanOrEqual(2000);
    });

    it('should track sync failures', () => {
      const syncId = monitor.startSyncTracking('scheduler');
      const result = monitor.endSyncTracking(syncId, false, 'API timeout');

      expect(result!.success).toBe(false);
      expect(result!.error).toBe('API timeout');
    });

    it('should handle invalid sync IDs', () => {
      const result = monitor.endSyncTracking('invalid-sync-id', true);
      expect(result).toBeNull();
    });
  });

  describe('memory monitoring', () => {
    it('should take memory snapshots', () => {
      const snapshot = monitor.takeMemorySnapshot();

      expect(snapshot.timestamp).toBeGreaterThan(0);
      expect(snapshot.platform).toBeDefined();
      expect(snapshot.jsHeapUsed).toBe(1024 * 1024);
      expect(snapshot.jsHeapTotal).toBe(2 * 1024 * 1024);
    });

    it('should detect memory leaks', () => {
      const mockMemory = global.performance.memory as any;

      // Create increasing memory pattern
      mockMemory.usedJSHeapSize = 1024 * 1024; // 1MB
      monitor.takeMemorySnapshot();

      mockMemory.usedJSHeapSize = 1.5 * 1024 * 1024; // 1.5MB
      monitor.takeMemorySnapshot();

      mockMemory.usedJSHeapSize = 2 * 1024 * 1024; // 2MB
      monitor.takeMemorySnapshot();

      const leakCheck = monitor.checkForMemoryLeaks();
      expect(leakCheck.trend).toBe('increasing');
      expect(leakCheck.hasLeak).toBe(true);
    });

    it('should detect stable memory usage', () => {
      const mockMemory = global.performance.memory as any;

      // Create stable memory pattern
      for (let i = 0; i < 5; i++) {
        mockMemory.usedJSHeapSize = 1024 * 1024; // Constant 1MB
        monitor.takeMemorySnapshot();
      }

      const leakCheck = monitor.checkForMemoryLeaks();
      expect(leakCheck.trend).toBe('stable');
      expect(leakCheck.hasLeak).toBe(false);
    });
  });

  describe('performance summary', () => {
    it('should provide performance summary', () => {
      // Add some sync data
      const syncId1 = monitor.startSyncTracking('manual');
      jest.advanceTimersByTime(1000);
      monitor.endSyncTracking(syncId1, true);

      const syncId2 = monitor.startSyncTracking('scheduler');
      jest.advanceTimersByTime(1500);
      monitor.endSyncTracking(syncId2, false, 'Error');

      const summary = monitor.getPerformanceSummary();

      expect(summary.syncHistory).toHaveLength(2);
      expect(summary.averageSyncDuration).toBeGreaterThan(0);
      expect(summary.syncSuccessRate).toBe(50); // 1 success out of 2
      expect(summary.recentMemory).toHaveLength(1); // Initial snapshot
    });
  });

  describe('diagnostic report', () => {
    it('should generate diagnostic report', () => {
      const report = monitor.getDiagnosticReport();

      expect(report).toContain('PERFORMANCE DIAGNOSTIC REPORT');
      expect(report).toContain('Sync Performance');
      expect(report).toContain('Memory Analysis');
      expect(report).toContain('Generated:');
    });
  });

  describe('cleanup', () => {
    it('should clear all data on cleanup', () => {
      monitor.startTiming('test');
      monitor.startSyncTracking('manual');
      monitor.takeMemorySnapshot();

      monitor.clearData();

      const summary = monitor.getPerformanceSummary();
      expect(summary.syncHistory).toHaveLength(0);
      expect(summary.activeTiming).toBe(0);
    });
  });
});
