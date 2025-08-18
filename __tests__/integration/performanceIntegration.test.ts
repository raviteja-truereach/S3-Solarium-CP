import { jest } from '@jest/globals';
import PerformanceObserver from '../../src/services/PerformanceObserver';
import TelemetryService from '../../src/services/TelemetryService';

jest.mock('../../src/services/TelemetryService');

describe('Performance Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full cold start flow', async () => {
    // Initialize
    PerformanceObserver.initialize();

    // Start cold start
    PerformanceObserver.startColdStartMeasurement();

    // Simulate app startup time
    await new Promise((resolve) => setTimeout(resolve, 100));

    // End cold start
    const result = PerformanceObserver.endColdStartMeasurement();

    expect(result).toBeDefined();
    expect(result?.totalColdStartTime).toBeGreaterThan(0);
    expect(TelemetryService.trackAppStartMetric).toHaveBeenCalled();
  });

  it('should track navigation flow', async () => {
    PerformanceObserver.initialize();

    // Start navigation
    PerformanceObserver.measureScreenTransition('Home', 'Profile');

    // Simulate navigation time
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Complete render
    PerformanceObserver.markScreenRenderComplete('Profile', 10);

    expect(TelemetryService.trackUserInteractionMetric).toHaveBeenCalled();
    expect(TelemetryService.trackPerformanceMetric).toHaveBeenCalled();
  });

  it('should track memory usage over time', async () => {
    PerformanceObserver.initialize({
      memoryTrackingInterval: 100, // Fast for testing
    });

    // Wait for memory tracking
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(TelemetryService.trackMemoryMetric).toHaveBeenCalled();
  });
});
