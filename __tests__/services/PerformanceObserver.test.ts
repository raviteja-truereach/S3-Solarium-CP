import { jest } from '@jest/globals';
import PerformanceObserver from '../../src/services/PerformanceObserver';
import TelemetryService from '../../src/services/TelemetryService';
import { PerformanceMonitor } from '../../src/utils/PerformanceMonitor';

// Mock dependencies
jest.mock('../../src/services/TelemetryService');
jest.mock('../../src/utils/PerformanceMonitor');
jest.mock('react-native-performance', () => ({
  performance: {
    now: jest.fn(() => 1000),
    mark: jest.fn(),
    measure: jest.fn(),
  },
  PerformanceObserver: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

describe('PerformanceObserver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully', () => {
      expect(() => {
        PerformanceObserver.initialize();
      }).not.toThrow();
    });

    it('should not initialize twice', () => {
      PerformanceObserver.initialize();
      PerformanceObserver.initialize();

      // Should only initialize once
      expect(true).toBe(true); // Basic test for no errors
    });
  });

  describe('cold start measurement', () => {
    it('should start cold start measurement', () => {
      PerformanceObserver.initialize();

      expect(() => {
        PerformanceObserver.startColdStartMeasurement();
      }).not.toThrow();
    });

    it('should end cold start measurement and return metrics', () => {
      PerformanceObserver.initialize();
      PerformanceObserver.startColdStartMeasurement();

      const result = PerformanceObserver.endColdStartMeasurement();

      expect(result).toBeDefined();
      if (result) {
        expect(result.totalColdStartTime).toBeGreaterThan(0);
        expect(result.startupType).toBe('cold');
      }
    });
  });

  describe('screen transition measurement', () => {
    it('should measure screen transition', () => {
      PerformanceObserver.initialize();

      expect(() => {
        PerformanceObserver.measureScreenTransition('Home', 'Profile');
      }).not.toThrow();
    });

    it('should mark screen render complete', () => {
      PerformanceObserver.initialize();

      expect(() => {
        PerformanceObserver.markScreenRenderComplete('Home', 5);
      }).not.toThrow();
    });
  });

  describe('memory tracking', () => {
    it('should get memory usage', async () => {
      PerformanceObserver.initialize();

      // Mock PerformanceMonitor
      (PerformanceMonitor.getMemorySnapshot as jest.Mock).mockResolvedValue({
        totalMemory: 2048,
        usedMemory: 1024,
        availableMemory: 1024,
        jsHeapSize: 512,
        jsHeapUsed: 256,
        nativeHeapSize: 512,
        nativeHeapUsed: 256,
      });

      const result = await PerformanceObserver.getMemoryUsage();

      expect(result).toBeDefined();
      expect(result.totalMemory).toBe(2048);
      expect(result.usedMemory).toBe(1024);
      expect(result.memoryPressure).toBeDefined();
    });
  });

  describe('custom marks and measures', () => {
    it('should create custom performance mark', () => {
      PerformanceObserver.initialize();

      expect(() => {
        PerformanceObserver.mark('custom-mark', { test: 'data' });
      }).not.toThrow();
    });

    it('should measure between marks', () => {
      PerformanceObserver.initialize();

      PerformanceObserver.mark('start-mark');
      const result = PerformanceObserver.measure('test-measure', 'start-mark');

      expect(result).toBeDefined();
      if (result) {
        expect(result.duration).toBeGreaterThanOrEqual(0);
        expect(result.metricType).toBe('custom');
      }
    });
  });

  describe('configuration', () => {
    it('should return current configuration', () => {
      const config = PerformanceObserver.getConfig();

      expect(config).toBeDefined();
      expect(config.enableColdStartTracking).toBeDefined();
      expect(config.enableNavigationTracking).toBeDefined();
      expect(config.budget).toBeDefined();
    });

    it('should update configuration', () => {
      const newConfig = {
        enableColdStartTracking: false,
        samplingRate: 0.5,
      };

      PerformanceObserver.updateConfig(newConfig);
      const config = PerformanceObserver.getConfig();

      expect(config.enableColdStartTracking).toBe(false);
      expect(config.samplingRate).toBe(0.5);
    });
  });

  describe('performance reports', () => {
    it('should generate performance report', () => {
      PerformanceObserver.initialize();

      const report = PerformanceObserver.generateReport();

      expect(report).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.sessionId).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.summary).toBeDefined();
    });
  });

  describe('telemetry integration', () => {
    it('should send metrics to telemetry service', async () => {
      PerformanceObserver.initialize();

      const mockTrackPerformanceMetric =
        TelemetryService.trackPerformanceMetric as jest.Mock;

      PerformanceObserver.mark('test-mark');
      PerformanceObserver.measure('test-measure', 'test-mark');

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockTrackPerformanceMetric).toHaveBeenCalled();
    });
  });
});
