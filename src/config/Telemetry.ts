import { TelemetryConfig } from '../types/telemetry';
import Config from './Config';

class TelemetryConfiguration {
  private config: TelemetryConfig | null = null;

  /**
   * Initialize telemetry configuration from environment variables
   * Instrumentation key should be injected via CI/CD from Azure Key Vault
   */
  public initialize(): TelemetryConfig {
    if (this.config) {
      return this.config;
    }

    // Read from environment variables (injected by CI/CD)
    const instrumentationKey = Config.AZURE_APPLICATION_INSIGHTS_KEY || '';

    this.config = {
      instrumentationKey,
      enableTelemetry:
        Config.ENABLE_TELEMETRY === 'true' && instrumentationKey.length > 0,
      batchSize: parseInt(Config.TELEMETRY_BATCH_SIZE || '10', 10),
      flushInterval: parseInt(Config.TELEMETRY_FLUSH_INTERVAL || '30000', 10), // 30 seconds
      maxRetries: parseInt(Config.TELEMETRY_MAX_RETRIES || '3', 10),
      retryDelay: parseInt(Config.TELEMETRY_RETRY_DELAY || '1000', 10), // 1 second
      enableUserTracking: Config.ENABLE_USER_TRACKING === 'true',
      enablePerformanceTracking: Config.ENABLE_PERFORMANCE_TRACKING !== 'false', // default true
      enableMemoryTracking: Config.ENABLE_MEMORY_TRACKING !== 'false', // default true
    };

    return this.config;
  }

  /**
   * Get current telemetry configuration
   */
  public getConfig(): TelemetryConfig {
    if (!this.config) {
      return this.initialize();
    }
    return this.config;
  }

  /**
   * Check if telemetry is enabled
   */
  public isEnabled(): boolean {
    const config = this.getConfig();
    return config.enableTelemetry && config.instrumentationKey.length > 0;
  }

  /**
   * Validate configuration
   */
  public validate(): { valid: boolean; errors: string[] } {
    const config = this.getConfig();
    const errors: string[] = [];

    if (!config.instrumentationKey) {
      errors.push('Instrumentation key is required');
    }

    if (config.instrumentationKey && config.instrumentationKey.length !== 36) {
      errors.push('Instrumentation key must be a valid GUID');
    }

    if (config.batchSize < 1 || config.batchSize > 100) {
      errors.push('Batch size must be between 1 and 100');
    }

    if (config.flushInterval < 1000 || config.flushInterval > 300000) {
      errors.push('Flush interval must be between 1 second and 5 minutes');
    }

    if (config.maxRetries < 0 || config.maxRetries > 10) {
      errors.push('Max retries must be between 0 and 10');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default new TelemetryConfiguration();
