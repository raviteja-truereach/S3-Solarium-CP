import TelemetryConfiguration from '../../src/config/Telemetry';
import Config from '../../src/config/Config';

// Mock the Config module
jest.mock('../../src/config/Config', () => ({
  AZURE_APPLICATION_INSIGHTS_KEY:
    'mock-instrumentation-key-12345678901234567890',
  ENABLE_TELEMETRY: 'true',
  TELEMETRY_BATCH_SIZE: '15',
  TELEMETRY_FLUSH_INTERVAL: '25000',
  TELEMETRY_MAX_RETRIES: '5',
  TELEMETRY_RETRY_DELAY: '2000',
  ENABLE_USER_TRACKING: 'true',
  ENABLE_PERFORMANCE_TRACKING: 'true',
  ENABLE_MEMORY_TRACKING: 'false',
}));

describe('TelemetryConfiguration', () => {
  beforeEach(() => {
    // Reset configuration instance
    (TelemetryConfiguration as any).config = null;
  });

  describe('initialize', () => {
    it('should initialize configuration with default values', () => {
      const config = TelemetryConfiguration.initialize();

      expect(config).toEqual({
        instrumentationKey: 'mock-instrumentation-key-12345678901234567890',
        enableTelemetry: true,
        batchSize: 15,
        flushInterval: 25000,
        maxRetries: 5,
        retryDelay: 2000,
        enableUserTracking: true,
        enablePerformanceTracking: true,
        enableMemoryTracking: false,
      });
    });

    it('should return same config on subsequent calls', () => {
      const config1 = TelemetryConfiguration.initialize();
      const config2 = TelemetryConfiguration.initialize();

      expect(config1).toBe(config2);
    });
  });

  describe('getConfig', () => {
    it('should return initialized config', () => {
      const config = TelemetryConfiguration.getConfig();

      expect(config).toBeDefined();
      expect(config.instrumentationKey).toBe(
        'mock-instrumentation-key-12345678901234567890'
      );
    });
  });

  describe('isEnabled', () => {
    it('should return true when telemetry is enabled and key is provided', () => {
      const enabled = TelemetryConfiguration.isEnabled();

      expect(enabled).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate configuration successfully', () => {
      const validation = TelemetryConfiguration.validate();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should return errors for invalid configuration', () => {
      // Mock invalid config
      jest.doMock('../../src/config/Config', () => ({
        AZURE_APPLICATION_INSIGHTS_KEY: '', // Invalid empty key
        ENABLE_TELEMETRY: 'true',
        TELEMETRY_BATCH_SIZE: '150', // Invalid batch size
        TELEMETRY_FLUSH_INTERVAL: '25000',
        TELEMETRY_MAX_RETRIES: '15', // Invalid max retries
        TELEMETRY_RETRY_DELAY: '2000',
      }));

      // Reset to get new config
      (TelemetryConfiguration as any).config = null;

      const validation = TelemetryConfiguration.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});
