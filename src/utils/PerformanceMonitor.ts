import { Platform } from 'react-native';

/**
 * Performance monitoring utilities
 * Tracks sync performance, memory usage, and errors
 */

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
  error?: string;
}

export interface MemorySnapshot {
  timestamp: number;
  jsHeapUsed?: number;
  jsHeapTotal?: number;
  nativeHeapAllocated?: number;
  platform: string;
}

export interface SyncPerformanceData {
  syncId: string;
  source: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  itemsProcessed?: number;
  apiCallCount?: number;
  memoryBefore?: MemorySnapshot;
  memoryAfter?: MemorySnapshot;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private syncPerformanceData: SyncPerformanceData[] = [];
  private memorySnapshots: MemorySnapshot[] = [];
  private maxMetricsHistory = 100;
  private maxSyncHistory = 50;
  private maxMemorySnapshots = 20;

  private constructor() {
    console.log('PerformanceMonitor: Instance created');

    // Take initial memory snapshot
    this.takeMemorySnapshot();

    // Setup periodic memory monitoring
    this.startMemoryMonitoring();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start timing a performance metric
   */
  public startTiming(name: string, metadata?: Record<string, any>): string {
    const metricId = `${name}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata,
    };

    this.metrics.set(metricId, metric);

    console.log(`PerformanceMonitor: Started timing "${name}"`, {
      metricId,
      metadata,
    });

    return metricId;
  }

  /**
   * End timing a performance metric
   */
  public endTiming(metricId: string, error?: string): PerformanceMetric | null {
    const metric = this.metrics.get(metricId);

    if (!metric) {
      console.warn(`PerformanceMonitor: Metric ${metricId} not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;
    metric.error = error;

    console.log(`PerformanceMonitor: Finished timing "${metric.name}"`, {
      duration: `${duration.toFixed(2)}ms`,
      success: !error,
      error,
    });

    // Remove from active metrics and add to history
    this.metrics.delete(metricId);
    this.addToHistory(metric);

    return metric;
  }

  /**
   * Start sync performance tracking
   */
  public startSyncTracking(
    source: string,
    metadata?: Record<string, any>
  ): string {
    const syncId = `sync_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const syncData: SyncPerformanceData = {
      syncId,
      source,
      startTime: Date.now(),
      success: false,
      memoryBefore: this.getCurrentMemorySnapshot(),
      ...metadata,
    };

    this.syncPerformanceData.push(syncData);

    console.log(`PerformanceMonitor: Started sync tracking`, {
      syncId,
      source,
      memoryBefore: syncData.memoryBefore,
    });

    return syncId;
  }

  /**
   * End sync performance tracking
   */
  public endSyncTracking(
    syncId: string,
    success: boolean,
    error?: string,
    additionalData?: Partial<SyncPerformanceData>
  ): SyncPerformanceData | null {
    const syncData = this.syncPerformanceData.find((s) => s.syncId === syncId);

    if (!syncData) {
      console.warn(`PerformanceMonitor: Sync ${syncId} not found`);
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - syncData.startTime;

    // Update sync data
    syncData.endTime = endTime;
    syncData.duration = duration;
    syncData.success = success;
    syncData.error = error;
    syncData.memoryAfter = this.getCurrentMemorySnapshot();

    // Merge additional data
    if (additionalData) {
      Object.assign(syncData, additionalData);
    }

    console.log(`PerformanceMonitor: Finished sync tracking`, {
      syncId,
      duration: `${duration}ms`,
      success,
      error,
      memoryDelta: this.calculateMemoryDelta(
        syncData.memoryBefore,
        syncData.memoryAfter
      ),
    });

    // Keep only recent sync data
    this.trimSyncHistory();

    return syncData;
  }

  /**
   * Take memory snapshot
   */
  public takeMemorySnapshot(): MemorySnapshot {
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      platform: Platform.OS,
    };

    // Get memory info if available
    if (global.performance && global.performance.memory) {
      const memory = global.performance.memory;
      snapshot.jsHeapUsed = memory.usedJSHeapSize;
      snapshot.jsHeapTotal = memory.totalJSHeapSize;
    }

    // Add to snapshots history
    this.memorySnapshots.push(snapshot);
    this.trimMemorySnapshots();

    return snapshot;
  }

  /**
   * Get current memory snapshot
   */
  public getCurrentMemorySnapshot(): MemorySnapshot {
    return this.takeMemorySnapshot();
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    activeTiming: number;
    syncHistory: SyncPerformanceData[];
    recentMemory: MemorySnapshot[];
    averageSyncDuration: number;
    syncSuccessRate: number;
  } {
    const recentSyncs = this.syncPerformanceData.slice(-10);
    const completedSyncs = recentSyncs.filter((s) => s.duration !== undefined);

    const averageSyncDuration =
      completedSyncs.length > 0
        ? completedSyncs.reduce((sum, s) => sum + (s.duration || 0), 0) /
          completedSyncs.length
        : 0;

    const successfulSyncs = completedSyncs.filter((s) => s.success);
    const syncSuccessRate =
      completedSyncs.length > 0
        ? (successfulSyncs.length / completedSyncs.length) * 100
        : 0;

    return {
      activeTiming: this.metrics.size,
      syncHistory: recentSyncs,
      recentMemory: this.memorySnapshots.slice(-5),
      averageSyncDuration,
      syncSuccessRate,
    };
  }

  /**
   * Detect potential memory leaks
   */
  public checkForMemoryLeaks(): {
    hasLeak: boolean;
    trend: 'increasing' | 'stable' | 'decreasing';
    details: string;
  } {
    const recentSnapshots = this.memorySnapshots.slice(-5);

    if (recentSnapshots.length < 3) {
      return {
        hasLeak: false,
        trend: 'stable',
        details: 'Insufficient data for leak detection',
      };
    }

    // Check JS heap trend
    const heapValues = recentSnapshots
      .map((s) => s.jsHeapUsed)
      .filter((v) => v !== undefined) as number[];

    if (heapValues.length < 3) {
      return {
        hasLeak: false,
        trend: 'stable',
        details: 'No JS heap data available',
      };
    }

    // Calculate trend
    const firstThird = heapValues.slice(0, Math.floor(heapValues.length / 3));
    const lastThird = heapValues.slice(-Math.floor(heapValues.length / 3));

    const avgFirst = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
    const avgLast = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;

    const growthRate = (avgLast - avgFirst) / avgFirst;
    const threshold = 0.1; // 10% growth threshold

    let trend: 'increasing' | 'stable' | 'decreasing';
    if (growthRate > threshold) {
      trend = 'increasing';
    } else if (growthRate < -threshold) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    const hasLeak = trend === 'increasing' && growthRate > 0.2; // 20% increase

    return {
      hasLeak,
      trend,
      details: `Memory ${trend} by ${(growthRate * 100).toFixed(1)}%`,
    };
  }

  /**
   * Get diagnostic report
   */
  public getDiagnosticReport(): string {
    const summary = this.getPerformanceSummary();
    const memoryCheck = this.checkForMemoryLeaks();

    const report = [
      '=== PERFORMANCE DIAGNOSTIC REPORT ===',
      `Generated: ${new Date().toISOString()}`,
      `Platform: ${Platform.OS}`,
      '',
      '--- Sync Performance ---',
      `Recent syncs: ${summary.syncHistory.length}`,
      `Average duration: ${summary.averageSyncDuration.toFixed(2)}ms`,
      `Success rate: ${summary.syncSuccessRate.toFixed(1)}%`,
      '',
      '--- Memory Analysis ---',
      `Memory trend: ${memoryCheck.trend}`,
      `Potential leak: ${memoryCheck.hasLeak ? 'YES' : 'NO'}`,
      `Details: ${memoryCheck.details}`,
      '',
      '--- Active Timers ---',
      `Active measurements: ${summary.activeTiming}`,
      '',
      '--- Recent Sync Details ---',
      ...summary.syncHistory
        .slice(-3)
        .map(
          (sync) =>
            `${sync.source}: ${sync.duration}ms (${
              sync.success ? 'SUCCESS' : 'FAILED'
            })`
        ),
    ].join('\n');

    return report;
  }

  /**
   * Clear all performance data
   */
  public clearData(): void {
    this.metrics.clear();
    this.syncPerformanceData = [];
    this.memorySnapshots = [];

    // Take fresh memory snapshot
    this.takeMemorySnapshot();

    console.log('PerformanceMonitor: All data cleared');
  }

  /**
   * Cleanup monitor (for testing and shutdown)
   */
  public cleanup(): void {
    this.stopMemoryMonitoring();
    this.clearData();
    PerformanceMonitor.instance = null;

    console.log('PerformanceMonitor: Cleanup completed');
  }

  /**
   * Start periodic memory monitoring
   */
  private startMemoryMonitoring(): void {
    // Take snapshot every 2 minutes
    setInterval(() => {
      this.takeMemorySnapshot();
    }, 120_000);
  }

  /**
   * Stop memory monitoring
   */
  private stopMemoryMonitoring(): void {
    // Note: In a real implementation, you'd store the interval ID
    // For now, intervals will be cleared on app restart
  }

  /**
   * Add metric to history and trim if needed
   */
  private addToHistory(metric: PerformanceMetric): void {
    // In a real app, you might want to persist this data
    // For now, we just track in memory with limits

    if (this.syncPerformanceData.length >= this.maxMetricsHistory) {
      // Could implement metric history if needed
    }
  }

  /**
   * Trim sync history to prevent memory growth
   */
  private trimSyncHistory(): void {
    if (this.syncPerformanceData.length > this.maxSyncHistory) {
      this.syncPerformanceData = this.syncPerformanceData.slice(
        -this.maxSyncHistory
      );
    }
  }

  /**
   * Trim memory snapshots to prevent memory growth
   */
  private trimMemorySnapshots(): void {
    if (this.memorySnapshots.length > this.maxMemorySnapshots) {
      this.memorySnapshots = this.memorySnapshots.slice(
        -this.maxMemorySnapshots
      );
    }
  }

  /**
   * Calculate memory delta between snapshots
   */
  private calculateMemoryDelta(
    before?: MemorySnapshot,
    after?: MemorySnapshot
  ): string {
    if (!before || !after || !before.jsHeapUsed || !after.jsHeapUsed) {
      return 'N/A';
    }

    const delta = after.jsHeapUsed - before.jsHeapUsed;
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${(delta / 1024).toFixed(1)}KB`;
  }
}

export default PerformanceMonitor;
