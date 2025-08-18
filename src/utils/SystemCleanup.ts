import { SyncScheduler } from '../sync/SyncScheduler';
import { AppStateManager } from './AppStateManager';
import { PerformanceMonitor } from './PerformanceMonitor';
import { Logger } from './Logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * System cleanup utilities
 * Provides centralized cleanup for all sync system components
 */

export interface CleanupReport {
  timestamp: number;
  componentsCleanedUp: string[];
  errors: string[];
  totalDuration: number;
  memoryBefore?: number;
  memoryAfter?: number;
}

export class SystemCleanup {
  /**
   * Perform complete system cleanup
   * Cleans up all singletons and cached data
   */
  public static async performFullCleanup(): Promise<CleanupReport> {
    const startTime = Date.now();
    const report: CleanupReport = {
      timestamp: startTime,
      componentsCleanedUp: [],
      errors: [],
      totalDuration: 0,
    };

    // Get initial memory if available
    if (global.performance?.memory) {
      report.memoryBefore = global.performance.memory.usedJSHeapSize;
    }

    console.log('SystemCleanup: Starting full system cleanup');

    try {
      // 1. Cleanup SyncScheduler
      await this.cleanupComponent(
        'SyncScheduler',
        () => {
          const scheduler = SyncScheduler.getInstance();
          scheduler.cleanup();
        },
        report
      );

      // 2. Cleanup AppStateManager
      await this.cleanupComponent(
        'AppStateManager',
        () => {
          const appStateManager = AppStateManager.getInstance();
          appStateManager.cleanup();
        },
        report
      );

      // 3. Cleanup PerformanceMonitor
      await this.cleanupComponent(
        'PerformanceMonitor',
        () => {
          const performanceMonitor = PerformanceMonitor.getInstance();
          performanceMonitor.cleanup();
        },
        report
      );

      // 4. Cleanup Logger
      await this.cleanupComponent(
        'Logger',
        () => {
          const logger = Logger.getInstance();
          logger.cleanup();
        },
        report
      );

      // 5. Clear AsyncStorage sync-related data
      await this.cleanupComponent(
        'AsyncStorage',
        async () => {
          await this.clearSyncRelatedStorage();
        },
        report
      );

      // 6. Force garbage collection if available
      await this.cleanupComponent(
        'GarbageCollection',
        () => {
          this.forceGarbageCollection();
        },
        report
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      report.errors.push(`Global cleanup error: ${errorMessage}`);
      console.error('SystemCleanup: Global cleanup error', error);
    }

    // Calculate final metrics
    report.totalDuration = Date.now() - startTime;

    if (global.performance?.memory) {
      report.memoryAfter = global.performance.memory.usedJSHeapSize;
    }

    console.log('SystemCleanup: Full cleanup completed', {
      duration: report.totalDuration,
      components: report.componentsCleanedUp.length,
      errors: report.errors.length,
    });

    return report;
  }

  /**
   * Cleanup only sync-related components (lighter cleanup)
   */
  public static async performSyncCleanup(): Promise<Partial<CleanupReport>> {
    const startTime = Date.now();
    const report: Partial<CleanupReport> = {
      timestamp: startTime,
      componentsCleanedUp: [],
      errors: [],
    };

    console.log('SystemCleanup: Starting sync cleanup');

    try {
      // Cleanup only scheduler and performance monitor
      await this.cleanupComponent(
        'SyncScheduler',
        () => {
          const scheduler = SyncScheduler.getInstance();
          scheduler.stop(); // Stop but don't fully cleanup
        },
        report
      );

      await this.cleanupComponent(
        'PerformanceMonitor',
        () => {
          const performanceMonitor = PerformanceMonitor.getInstance();
          performanceMonitor.clearData(); // Clear data but keep instance
        },
        report
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      report.errors!.push(`Sync cleanup error: ${errorMessage}`);
    }

    report.totalDuration = Date.now() - startTime;
    return report;
  }

  /**
   * Check system health and recommend cleanup
   */
  public static checkSystemHealth(): {
    needsCleanup: boolean;
    reasons: string[];
    recommendations: string[];
  } {
    const reasons: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check performance monitor
      const performanceMonitor = PerformanceMonitor.getInstance();
      const summary = performanceMonitor.getPerformanceSummary();
      const memoryCheck = performanceMonitor.checkForMemoryLeaks();

      if (memoryCheck.hasLeak) {
        reasons.push('Potential memory leak detected');
        recommendations.push('Perform full system cleanup');
      }

      if (summary.syncHistory.length > 40) {
        reasons.push('Large sync history consuming memory');
        recommendations.push('Clear performance data');
      }

      if (summary.syncSuccessRate < 70) {
        reasons.push('Poor sync success rate');
        recommendations.push(
          'Review sync configuration and network connectivity'
        );
      }

      // Check logger
      const logger = Logger.getInstance();
      const recentLogs = logger.getRecentLogs();
      const errorLogs = logger.getLogsByLevel('error');

      if (errorLogs.length > 10) {
        reasons.push('High error count in logs');
        recommendations.push('Clear error logs and investigate issues');
      }

      if (recentLogs.length > 150) {
        reasons.push('Large log history');
        recommendations.push('Clear log history');
      }

      // Check memory usage
      if (global.performance?.memory) {
        const memory = global.performance.memory;
        const usagePercent =
          (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;

        if (usagePercent > 80) {
          reasons.push('High memory usage detected');
          recommendations.push('Perform garbage collection and cleanup');
        }
      }
    } catch (error) {
      reasons.push('Unable to check system health');
      recommendations.push('Perform full system cleanup');
    }

    return {
      needsCleanup: reasons.length > 0,
      reasons,
      recommendations,
    };
  }

  /**
   * Generate system diagnostic report
   */
  public static generateDiagnosticReport(): string {
    const lines: string[] = [];

    lines.push('=== SYSTEM DIAGNOSTIC REPORT ===');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    try {
      // System health check
      const health = this.checkSystemHealth();
      lines.push('--- System Health ---');
      lines.push(`Needs Cleanup: ${health.needsCleanup ? 'YES' : 'NO'}`);

      if (health.reasons.length > 0) {
        lines.push('Reasons:');
        health.reasons.forEach((reason) => lines.push(`  - ${reason}`));
      }

      if (health.recommendations.length > 0) {
        lines.push('Recommendations:');
        health.recommendations.forEach((rec) => lines.push(`  - ${rec}`));
      }
      lines.push('');

      // Component status
      lines.push('--- Component Status ---');

      // Scheduler status
      try {
        const scheduler = SyncScheduler.getInstance();
        const status = scheduler.getStatus();
        lines.push(`Scheduler: ${status.isRunning ? 'RUNNING' : 'STOPPED'}`);
        lines.push(`  - Paused: ${status.isPaused}`);
        lines.push(`  - App Active: ${status.isAppActive}`);
        if (status.performance) {
          lines.push(
            `  - Avg Sync Duration: ${status.performance.averageSyncDuration.toFixed(
              2
            )}ms`
          );
          lines.push(
            `  - Success Rate: ${status.performance.syncSuccessRate.toFixed(
              1
            )}%`
          );
        }
      } catch (error) {
        lines.push('Scheduler: ERROR - ' + (error as Error).message);
      }

      // Performance monitor status
      try {
        const performanceMonitor = PerformanceMonitor.getInstance();
        const summary = performanceMonitor.getPerformanceSummary();
        const memoryCheck = performanceMonitor.checkForMemoryLeaks();

        lines.push(`Performance Monitor: ACTIVE`);
        lines.push(`  - Sync History: ${summary.syncHistory.length} entries`);
        lines.push(`  - Memory Trend: ${memoryCheck.trend}`);
        lines.push(`  - Potential Leak: ${memoryCheck.hasLeak ? 'YES' : 'NO'}`);
      } catch (error) {
        lines.push('Performance Monitor: ERROR - ' + (error as Error).message);
      }

      // Memory status
      if (global.performance?.memory) {
        const memory = global.performance.memory;
        lines.push(`Memory Usage:`);
        lines.push(
          `  - Used: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`
        );
        lines.push(
          `  - Total: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`
        );
        lines.push(
          `  - Usage: ${(
            (memory.usedJSHeapSize / memory.totalJSHeapSize) *
            100
          ).toFixed(1)}%`
        );
      }
    } catch (error) {
      lines.push('ERROR: Unable to generate complete diagnostic report');
      lines.push(`Error: ${(error as Error).message}`);
    }

    lines.push('');
    lines.push('=== END DIAGNOSTIC REPORT ===');

    return lines.join('\n');
  }

  /**
   * Helper method to cleanup individual components
   */
  private static async cleanupComponent(
    componentName: string,
    cleanupFn: () => void | Promise<void>,
    report: Partial<CleanupReport>
  ): Promise<void> {
    try {
      console.log(`SystemCleanup: Cleaning up ${componentName}`);
      await cleanupFn();
      report.componentsCleanedUp!.push(componentName);
      console.log(`SystemCleanup: ${componentName} cleanup completed`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      report.errors!.push(`${componentName}: ${errorMessage}`);
      console.error(`SystemCleanup: ${componentName} cleanup failed`, error);
    }
  }

  /**
   * Clear sync-related AsyncStorage data
   */
  private static async clearSyncRelatedStorage(): Promise<void> {
    const keysToRemove = [
      '@AppState/lifecycle',
      'persist:root', // If we want to clear all persisted data
    ];

    for (const key of keysToRemove) {
      try {
        await AsyncStorage.removeItem(key);
        console.log(`SystemCleanup: Cleared AsyncStorage key: ${key}`);
      } catch (error) {
        console.warn(
          `SystemCleanup: Failed to clear AsyncStorage key ${key}:`,
          error
        );
      }
    }
  }

  /**
   * Force garbage collection if available
   */
  private static forceGarbageCollection(): void {
    // Force garbage collection if available (mainly for debugging)
    if (global.gc) {
      global.gc();
      console.log('SystemCleanup: Forced garbage collection');
    } else {
      console.log('SystemCleanup: Garbage collection not available');
    }
  }
}

export default SystemCleanup;
