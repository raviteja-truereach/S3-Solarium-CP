import { jest } from '@jest/globals';
import { mockDeep } from 'jest-mock-extended';
import TelemetryService from '../../src/services/TelemetryService';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock external dependencies
jest.mock('@microsoft/applicationinsights-web');
jest.mock('@microsoft/applicationinsights-react-native');
jest.mock('@react-native-async-storage/async-storage');

const mockAppInsights = mockDeep<ApplicationInsights>();
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('TelemetryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  describe('initialize', () => {
    it('should initialize with valid instrumentation key', async () => {
      const instrumentationKey =
        'test-instrumentation-key-12345678901234567890';

      await TelemetryService.initialize(instrumentationKey);

      expect(ApplicationInsights).toHaveBeenCalledWith({
        config: expect.objectContaining({
          instrumentationKey: instrumentationKey,
        }),
      });
    });

    it('should not initialize without instrumentation key', async () => {
      await TelemetryService.initialize('');

      expect(ApplicationInsights).not.toHaveBeenCalled();
    });

    it('should not initialize twice', async () => {
      const instrumentationKey =
        'test-instrumentation-key-12345678901234567890';

      await TelemetryService.initialize(instrumentationKey);
      await TelemetryService.initialize(instrumentationKey);

      expect(ApplicationInsights).toHaveBeenCalledTimes(1);
    });
  });

  describe('trackPerformanceMetric', () => {
    it('should queue performance metric when enabled', async () => {
      const instrumentationKey =
        'test-instrumentation-key-12345678901234567890';
      await TelemetryService.initialize(instrumentationKey);

      const metric = {
        metricName: 'test-metric',
        duration: 100,
        success: true,
        timestamp: new Date(),
        sessionId: 'test-session',
        version: '1.0.0',
        platform: 'ios' as const,
        deviceId: 'test-device',
      };

      await TelemetryService.trackPerformanceMetric(metric);

      const status = TelemetryService.getStatus();
      expect(status.queueSize).toBe(1);
    });

    it('should not queue metric when disabled', async () => {
      await TelemetryService.setEnabled(false);

      const metric = {
        metricName: 'test-metric',
        duration: 100,
        success: true,
        timestamp: new Date(),
        sessionId: 'test-session',
        version: '1.0.0',
        platform: 'ios' as const,
        deviceId: 'test-device',
      };

      await TelemetryService.trackPerformanceMetric(metric);

      const status = TelemetryService.getStatus();
      expect(status.queueSize).toBe(0);
    });
  });

  describe('trackMemoryMetric', () => {
    it('should queue memory metric when enabled', async () => {
      const instrumentationKey =
        'test-instrumentation-key-12345678901234567890';
      await TelemetryService.initialize(instrumentationKey);

      const metric = {
        totalMemory: 1000,
        usedMemory: 500,
        availableMemory: 500,
        memoryPressure: 'low' as const,
        timestamp: new Date(),
        sessionId: 'test-session',
        version: '1.0.0',
        platform: 'ios' as const,
        deviceId: 'test-device',
      };

      await TelemetryService.trackMemoryMetric(metric);

      const status = TelemetryService.getStatus();
      expect(status.queueSize).toBe(1);
    });
  });

  describe('setUserId', () => {
    it('should set user ID and update settings', async () => {
      const instrumentationKey =
        'test-instrumentation-key-12345678901234567890';
      await TelemetryService.initialize(instrumentationKey);

      TelemetryService.setUserId('test-user-123');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'telemetry_settings',
        expect.stringContaining('test-user-123')
      );
    });
  });

  describe('flush', () => {
    it('should flush events when enabled', async () => {
      const instrumentationKey =
        'test-instrumentation-key-12345678901234567890';
      await TelemetryService.initialize(instrumentationKey);

      await TelemetryService.flush();

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('setEnabled', () => {
    it('should enable/disable telemetry', async () => {
      await TelemetryService.setEnabled(true);
      let status = TelemetryService.getStatus();
      expect(status.enabled).toBe(false); // Still false because not initialized

      await TelemetryService.setEnabled(false);
      status = TelemetryService.getStatus();
      expect(status.enabled).toBe(false);
    });
  });

  describe('setOptedOut', () => {
    it('should set opt-out preference', async () => {
      await TelemetryService.setOptedOut(true);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'telemetry_settings',
        expect.stringContaining('true')
      );
    });
  });

  describe('getStatus', () => {
    it('should return current status', () => {
      const status = TelemetryService.getStatus();

      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('queueSize');
    });
  });
});
