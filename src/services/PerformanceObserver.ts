// Temporarily disabled due to iOS compilation issues
// import {
//   performance,
//   PerformanceObserver as RNPerformanceObserver,
// } from 'react-native-performance';

// Mock implementation for now
const performance = {
  now: () => Date.now(),
  mark: (name: string) => {},
  measure: (name: string, startMark?: string, endMark?: string) => {},
  getEntriesByName: (name: string) => [],
  getEntriesByType: (type: string) => [],
  clearMarks: (name?: string) => {},
  clearMeasures: (name?: string) => {},
};

class MockPerformanceObserver {
  constructor(callback: any) {}
  observe(options: any) {}
  disconnect() {}
}

const RNPerformanceObserver = MockPerformanceObserver;
import { Platform, AppState, AppStateStatus } from 'react-native';
import TelemetryService from './TelemetryService';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { Logger } from '../utils/Logger';
import { generateUUID } from '../utils/uuid';
import {
  PerformanceMetric,
  MemoryMetric,
  NavigationMetric,
  ColdStartMetric,
  ScreenRenderMetric,
  PerformanceReport,
  BudgetViolation,
  PerformanceObserverConfig,
  PerformanceMark,
  PerformanceBudget,
} from '../types/performance';

class PerformanceObserverService {
  private observer: RNPerformanceObserver | null = null;
  private config: PerformanceObserverConfig;
  private sessionId: string;
  private isInitialized = false;
  private coldStartTimestamp: number | null = null;
  private appLaunchTimestamp: number;
  private metricsQueue: PerformanceMetric[] = [];
  private memoryTrackingInterval: NodeJS.Timer | null = null;
  private performanceMarks: Map<string, PerformanceMark> = new Map();
  private currentScreenName: string | null = null;
  private lastScreenTransitionTime: number | null = null;

  constructor() {
    this.sessionId = generateUUID();
    this.appLaunchTimestamp = Date.now();
    this.config = this.getDefaultConfig();
    this.setupAppStateListener();
  }

  /**
   * Initialize Performance Observer with configuration
   */
  public initialize(config?: Partial<PerformanceObserverConfig>): void {
    try {
      if (this.isInitialized) {
        Logger.warn('PerformanceObserver already initialized');
        return;
      }

      this.config = { ...this.config, ...config };

      // Initialize react-native-performance observer
      this.observer = new RNPerformanceObserver((list) => {
        this.handlePerformanceEntries(list.getEntries());
      });

      // Observe all performance entry types
      this.observer.observe({
        entryTypes: ['measure', 'navigation', 'paint', 'mark'],
      });

      // Start cold start measurement
      if (this.config.enableColdStartTracking) {
        this.startColdStartMeasurement();
      }

      // Start memory tracking
      if (this.config.enableMemoryTracking) {
        this.startMemoryTracking();
      }

      this.isInitialized = true;
      Logger.info('PerformanceObserver initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize PerformanceObserver:', error);
    }
  }

  /**
   * Start cold start measurement
   */
  public startColdStartMeasurement(): void {
    if (!this.config.enableColdStartTracking) return;

    try {
      this.coldStartTimestamp = performance.now();
      performance.mark('cold-start-begin');

      // Mark native initialization
      performance.mark('native-init-begin');

      Logger.info('Cold start measurement started');
    } catch (error) {
      Logger.error('Failed to start cold start measurement:', error);
    }
  }

  /**
   * End cold start measurement
   */
  public endColdStartMeasurement(): ColdStartMetric | null {
    if (!this.config.enableColdStartTracking || !this.coldStartTimestamp)
      return null;

    try {
      const endTime = performance.now();
      performance.mark('cold-start-end');
      performance.measure(
        'cold-start-duration',
        'cold-start-begin',
        'cold-start-end'
      );

      const coldStartMetric: ColdStartMetric = {
        appLaunchTime: this.appLaunchTimestamp,
        bundleLoadTime: this.getBundleLoadTime(),
        nativeInitTime: this.getNativeInitTime(),
        jsInitTime: this.getJsInitTime(),
        firstScreenRenderTime: endTime,
        totalColdStartTime: endTime - this.coldStartTimestamp,
        startupType: this.getStartupType(),
        timestamp: Date.now(),
        deviceInfo: {
          platform: Platform.OS as 'ios' | 'android',
          osVersion: Platform.Version.toString(),
          deviceModel: this.getDeviceModel(),
          memoryTotal: this.getTotalMemory(),
        },
      };

      // Send to telemetry
      this.sendColdStartMetric(coldStartMetric);

      // Check budget violation
      this.checkBudgetViolation(
        'coldStart',
        coldStartMetric.totalColdStartTime
      );

      Logger.info(
        'Cold start measurement completed:',
        coldStartMetric.totalColdStartTime + 'ms'
      );
      return coldStartMetric;
    } catch (error) {
      Logger.error('Failed to end cold start measurement:', error);
      return null;
    }
  }

  /**
   * Measure screen transition
   */
  public measureScreenTransition(fromScreen: string, toScreen: string): void {
    if (!this.config.enableNavigationTracking) return;

    try {
      const startTime = performance.now();
      const markName = `navigation-${fromScreen}-to-${toScreen}`;

      performance.mark(`${markName}-start`);

      // Store transition info
      this.performanceMarks.set(markName, {
        name: markName,
        startTime,
        metadata: { fromScreen, toScreen },
      });

      this.currentScreenName = toScreen;
      this.lastScreenTransitionTime = startTime;

      // Set a timeout to complete the measurement
      setTimeout(() => {
        this.completeScreenTransition(markName, fromScreen, toScreen);
      }, 100); // Allow time for screen to render
    } catch (error) {
      Logger.error('Failed to measure screen transition:', error);
    }
  }

  /**
   * Mark screen render completion
   */
  public markScreenRenderComplete(
    screenName: string,
    componentCount: number = 0
  ): void {
    if (!this.config.enableScreenRenderTracking) return;

    try {
      const endTime = performance.now();
      const startTime = this.lastScreenTransitionTime || endTime;

      performance.mark(`${screenName}-render-complete`);

      const renderMetric: ScreenRenderMetric = {
        screenName,
        renderStartTime: startTime,
        renderEndTime: endTime,
        renderDuration: endTime - startTime,
        componentCount,
        isInitialRender: this.lastScreenTransitionTime === null,
        timestamp: Date.now(),
        success: true,
      };

      // Send to telemetry
      this.sendScreenRenderMetric(renderMetric);

      // Check budget violation
      this.checkBudgetViolation('screenRender', renderMetric.renderDuration);
    } catch (error) {
      Logger.error('Failed to mark screen render complete:', error);
    }
  }

  /**
   * Get current memory usage
   */
  public async getMemoryUsage(): Promise<MemoryMetric> {
    try {
      const memoryInfo = await PerformanceMonitor.getMemorySnapshot();

      const memoryMetric: MemoryMetric = {
        timestamp: Date.now(),
        totalMemory: memoryInfo.totalMemory || 0,
        usedMemory: memoryInfo.usedMemory || 0,
        availableMemory: memoryInfo.availableMemory || 0,
        jsHeapSize: memoryInfo.jsHeapSize || 0,
        jsHeapUsed: memoryInfo.jsHeapUsed || 0,
        nativeHeapSize: memoryInfo.nativeHeapSize || 0,
        nativeHeapUsed: memoryInfo.nativeHeapUsed || 0,
        memoryPressure: this.getMemoryPressure(memoryInfo.usedMemory || 0),
        screenName: this.currentScreenName || 'unknown',
        sessionId: this.sessionId,
        platform: Platform.OS as 'ios' | 'android',
      };

      return memoryMetric;
    } catch (error) {
      Logger.error('Failed to get memory usage:', error);
      throw error;
    }
  }

  /**
   * Create custom performance mark
   */
  public mark(name: string, metadata?: Record<string, any>): void {
    try {
      const startTime = performance.now();
      performance.mark(name);

      this.performanceMarks.set(name, {
        name,
        startTime,
        metadata,
      });
    } catch (error) {
      Logger.error('Failed to create performance mark:', error);
    }
  }

  /**
   * Measure duration between two marks
   */
  public measure(
    name: string,
    startMark: string,
    endMark?: string
  ): PerformanceMetric | null {
    try {
      const endTime = performance.now();
      const startMarkData = this.performanceMarks.get(startMark);

      if (!startMarkData) {
        Logger.warn(`Start mark ${startMark} not found`);
        return null;
      }

      const duration = endTime - startMarkData.startTime;

      performance.mark(endMark || `${name}-end`);
      performance.measure(name, startMark, endMark || `${name}-end`);

      const metric: PerformanceMetric = {
        name,
        startTime: startMarkData.startTime,
        endTime,
        duration,
        metricType: 'custom',
        additionalData: startMarkData.metadata,
        timestamp: Date.now(),
        sessionId: this.sessionId,
      };

      // Send to telemetry
      this.sendPerformanceMetric(metric);

      return metric;
    } catch (error) {
      Logger.error('Failed to measure performance:', error);
      return null;
    }
  }

  /**
   * Generate performance report
   */
  public generateReport(): PerformanceReport {
    const report: PerformanceReport = {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      metrics: {
        navigation: [],
        screenRender: [],
        memory: [],
        custom: this.metricsQueue,
      },
      budgetViolations: [],
      summary: {
        totalViolations: 0,
        averageNavigationTime: 0,
        averageRenderTime: 0,
        peakMemoryUsage: 0,
      },
    };

    return report;
  }

  /**
   * Flush all metrics to telemetry
   */
  public async flush(): Promise<void> {
    try {
      await TelemetryService.flush();
      this.metricsQueue = [];
      Logger.info('Performance metrics flushed');
    } catch (error) {
      Logger.error('Failed to flush performance metrics:', error);
    }
  }

  /**
   * Enable or disable performance tracking
   */
  public setEnabled(enabled: boolean): void {
    if (enabled && !this.isInitialized) {
      this.initialize();
    } else if (!enabled && this.isInitialized) {
      this.cleanup();
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): PerformanceObserverConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<PerformanceObserverConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart memory tracking if interval changed
    if (newConfig.memoryTrackingInterval && this.memoryTrackingInterval) {
      this.stopMemoryTracking();
      this.startMemoryTracking();
    }
  }

  // Private methods

  private getDefaultConfig(): PerformanceObserverConfig {
    return {
      enableColdStartTracking: true,
      enableNavigationTracking: true,
      enableMemoryTracking: true,
      enableScreenRenderTracking: true,
      samplingRate: 1.0, // 100% sampling in development
      memoryTrackingInterval: 10000, // 10 seconds
      maxMetricsQueueSize: 100,
      budget: {
        coldStart: { maxDuration: 3000, target: 2000 },
        navigation: { maxDuration: 300, target: 200 },
        screenRender: { maxDuration: 500, target: 300 },
        memory: { maxUsage: 157286400, target: 104857600 }, // 150MB max, 100MB target
        apiCall: { maxDuration: 5000, target: 3000 },
      },
    };
  }

  private handlePerformanceEntries(entries: any[]): void {
    entries.forEach((entry) => {
      try {
        const metric: PerformanceMetric = {
          name: entry.name,
          startTime: entry.startTime,
          endTime: entry.startTime + entry.duration,
          duration: entry.duration,
          metricType: this.getMetricType(entry.name),
          timestamp: Date.now(),
          sessionId: this.sessionId,
        };

        this.addToQueue(metric);
      } catch (error) {
        Logger.error('Failed to handle performance entry:', error);
      }
    });
  }

  private completeScreenTransition(
    markName: string,
    fromScreen: string,
    toScreen: string
  ): void {
    try {
      const endTime = performance.now();
      const startData = this.performanceMarks.get(markName);

      if (!startData) return;

      performance.mark(`${markName}-end`);
      performance.measure(
        `${markName}-duration`,
        `${markName}-start`,
        `${markName}-end`
      );

      const navigationMetric: NavigationMetric = {
        fromScreen,
        toScreen,
        navigationDuration: endTime - startData.startTime,
        renderDuration: 0, // Will be updated when render completes
        totalDuration: endTime - startData.startTime,
        timestamp: Date.now(),
        success: true,
      };

      // Send to telemetry
      this.sendNavigationMetric(navigationMetric);

      // Check budget violation
      this.checkBudgetViolation('navigation', navigationMetric.totalDuration);
    } catch (error) {
      Logger.error('Failed to complete screen transition:', error);
    }
  }

  private startMemoryTracking(): void {
    if (this.memoryTrackingInterval) return;

    this.memoryTrackingInterval = setInterval(async () => {
      try {
        const memoryMetric = await this.getMemoryUsage();
        await TelemetryService.trackMemoryMetric(memoryMetric);

        // Check memory budget
        this.checkBudgetViolation('memory', memoryMetric.usedMemory);
      } catch (error) {
        Logger.error('Error in memory tracking:', error);
      }
    }, this.config.memoryTrackingInterval);
  }

  private stopMemoryTracking(): void {
    if (this.memoryTrackingInterval) {
      clearInterval(this.memoryTrackingInterval);
      this.memoryTrackingInterval = null;
    }
  }

  private checkBudgetViolation(metricType: string, value: number): void {
    const budget = this.config.budget;
    let budgetValue: number;
    let targetValue: number;

    switch (metricType) {
      case 'coldStart':
        budgetValue = budget.coldStart.maxDuration;
        targetValue = budget.coldStart.target;
        break;
      case 'navigation':
        budgetValue = budget.navigation.maxDuration;
        targetValue = budget.navigation.target;
        break;
      case 'screenRender':
        budgetValue = budget.screenRender.maxDuration;
        targetValue = budget.screenRender.target;
        break;
      case 'memory':
        budgetValue = budget.memory.maxUsage;
        targetValue = budget.memory.target;
        break;
      default:
        return;
    }

    if (value > budgetValue) {
      const violation: BudgetViolation = {
        metricType,
        metricName: metricType,
        actualValue: value,
        budgetValue,
        severity: 'error',
        timestamp: Date.now(),
        screenName: this.currentScreenName || undefined,
      };

      this.handleBudgetViolation(violation);
    } else if (value > targetValue) {
      const violation: BudgetViolation = {
        metricType,
        metricName: metricType,
        actualValue: value,
        budgetValue: targetValue,
        severity: 'warning',
        timestamp: Date.now(),
        screenName: this.currentScreenName || undefined,
      };

      this.handleBudgetViolation(violation);
    }
  }

  private handleBudgetViolation(violation: BudgetViolation): void {
    Logger.warn(`Performance budget ${violation.severity}:`, violation);

    // Send violation to telemetry
    TelemetryService.trackPerformanceMetric({
      name: 'budget_violation',
      startTime: violation.timestamp,
      endTime: violation.timestamp,
      duration: violation.actualValue,
      metricType: 'custom',
      timestamp: violation.timestamp,
      sessionId: this.sessionId,
      additionalData: violation,
    });
  }

  private addToQueue(metric: PerformanceMetric): void {
    this.metricsQueue.push(metric);

    if (this.metricsQueue.length >= this.config.maxMetricsQueueSize) {
      // Send oldest metrics
      const metricsToSend = this.metricsQueue.splice(
        0,
        this.config.maxMetricsQueueSize / 2
      );
      metricsToSend.forEach((m) => this.sendPerformanceMetric(m));
    }
  }

  private async sendPerformanceMetric(
    metric: PerformanceMetric
  ): Promise<void> {
    try {
      await TelemetryService.trackPerformanceMetric(metric);
    } catch (error) {
      Logger.error('Failed to send performance metric:', error);
    }
  }

  private async sendNavigationMetric(metric: NavigationMetric): Promise<void> {
    try {
      await TelemetryService.trackUserInteractionMetric({
        action: 'navigation',
        screenName: metric.toScreen,
        duration: metric.totalDuration,
        success: metric.success,
        errorMessage: metric.error,
        timestamp: new Date(),
        sessionId: this.sessionId,
        version: '1.0.0',
        platform: Platform.OS as 'ios' | 'android',
        deviceId: 'device-id',
        additionalData: metric,
      });
    } catch (error) {
      Logger.error('Failed to send navigation metric:', error);
    }
  }

  private async sendColdStartMetric(metric: ColdStartMetric): Promise<void> {
    try {
      await TelemetryService.trackAppStartMetric({
        startupDuration: metric.totalColdStartTime,
        startupType: metric.startupType,
        bundleLoadTime: metric.bundleLoadTime,
        jsLoadTime: metric.jsInitTime,
        nativeInitTime: metric.nativeInitTime,
        timestamp: new Date(),
        sessionId: this.sessionId,
        version: '1.0.0',
        platform: Platform.OS as 'ios' | 'android',
        deviceId: 'device-id',
        additionalData: metric,
      });
    } catch (error) {
      Logger.error('Failed to send cold start metric:', error);
    }
  }

  private async sendScreenRenderMetric(
    metric: ScreenRenderMetric
  ): Promise<void> {
    try {
      await TelemetryService.trackPerformanceMetric({
        name: 'screen_render',
        startTime: metric.renderStartTime,
        endTime: metric.renderEndTime,
        duration: metric.renderDuration,
        metricType: 'screen_render',
        screenName: metric.screenName,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        additionalData: metric,
      });
    } catch (error) {
      Logger.error('Failed to send screen render metric:', error);
    }
  }

  private getMetricType(entryName: string): PerformanceMetric['metricType'] {
    if (entryName.includes('cold-start')) return 'cold_start';
    if (entryName.includes('navigation')) return 'navigation';
    if (entryName.includes('render')) return 'screen_render';
    return 'custom';
  }

  private getMemoryPressure(
    usedMemory: number
  ): MemoryMetric['memoryPressure'] {
    const budget = this.config.budget.memory;

    if (usedMemory > budget.maxUsage) return 'critical';
    if (usedMemory > budget.target) return 'high';
    if (usedMemory > budget.target * 0.8) return 'moderate';
    return 'low';
  }

  private getBundleLoadTime(): number {
    // Estimate bundle load time - in production, this would be more sophisticated
    return performance.now() * 0.3; // Rough estimate
  }

  private getNativeInitTime(): number {
    // Estimate native init time
    return performance.now() * 0.2; // Rough estimate
  }

  private getJsInitTime(): number {
    // Estimate JS init time
    return performance.now() * 0.5; // Rough estimate
  }

  private getStartupType(): ColdStartMetric['startupType'] {
    // In production, this would detect actual startup type
    return 'cold';
  }

  private getDeviceModel(): string {
    // Get device model - simplified for this implementation
    return Platform.OS === 'ios' ? 'iPhone' : 'Android Device';
  }

  private getTotalMemory(): number {
    // Get total device memory - simplified for this implementation
    return Platform.OS === 'ios' ? 4096 : 3072; // MB
  }

  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && this.coldStartTimestamp === null) {
        // App came back from background, start warm start measurement
        this.startColdStartMeasurement();
      }
    });
  }

  private cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.stopMemoryTracking();
    this.isInitialized = false;
    this.metricsQueue = [];
    this.performanceMarks.clear();
  }
}

export default new PerformanceObserverService();
