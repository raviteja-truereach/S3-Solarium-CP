/**
 * Instrumented Performance Test (With Monitoring)
 * Used for overhead calculation
 */

import PerformanceObserver from '../../src/services/PerformanceObserver';
import TelemetryService from '../../src/services/TelemetryService';

describe('Instrumented Performance Test', () => {
  let startTime: number;
  let peakMemory = 0;

  beforeAll(async () => {
    startTime = Date.now();

    // Initialize monitoring (this is the overhead we're measuring)
    await TelemetryService.initialize();
    PerformanceObserver.initialize({
      enableColdStartTracking: true,
      enableNavigationTracking: true,
      enableMemoryTracking: true,
      samplingRate: 1.0,
    });
  });

  it('should perform standard app operations with monitoring enabled', async () => {
    // Start performance measurement
    PerformanceObserver.mark('test-operation-start');

    // Simulate typical app operations (same as baseline)
    const operations = [];

    for (let i = 0; i < 1000; i++) {
      operations.push({
        id: i,
        data: new Array(100).fill(Math.random()),
        timestamp: Date.now(),
      });
    }

    // Process operations
    const processed = operations.map((op) => ({
      ...op,
      processed: op.data.reduce((a, b) => a + b, 0),
    }));

    // Memory usage simulation with monitoring
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      peakMemory = Math.max(peakMemory, memUsage.heapUsed);

      // Track memory with our monitoring system
      try {
        await PerformanceObserver.getMemoryUsage();
      } catch (error) {
        // Ignore monitoring errors in overhead test
      }
    }

    // End performance measurement
    PerformanceObserver.measure('test-operation', 'test-operation-start');

    expect(processed.length).toBe(1000);

    // Small delay to simulate async operations
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    const duration = Date.now() - startTime;
    const memoryMB = Math.round(peakMemory / 1024 / 1024);

    console.log(`Test Duration: ${duration}ms`);
    console.log(`Peak Memory: ${memoryMB}MB`);

    // Flush monitoring data
    try {
      await PerformanceObserver.flush();
      await TelemetryService.flush();
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});
