import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ReactNativePlugin } from '@microsoft/applicationinsights-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TelemetryConfig,
  TelemetryEvent,
  TelemetryBatch,
  PerformanceMetric,
  MemoryMetric,
  NetworkMetric,
  AppStartMetric,
  UserInteractionMetric,
  TelemetrySettings,
  BaseMetric,
} from '../types/telemetry';
import TelemetryConfiguration from '../config/Telemetry';
import { generateUUID } from '../utils/uuid';
import { Logger } from '../utils/Logger';
import { Platform } from 'react-native';

class TelemetryService {
  private appInsights: ApplicationInsights | null = null;
  private config: TelemetryConfig;
  private eventQueue: TelemetryEvent[] = [];
  private flushTimer: NodeJS.Timer | null = null;
  private initialized = false;
  private userId: string | null = null;
  private sessionId: string;
  private deviceId: string;
  private settings: TelemetrySettings;
  private readonly STORAGE_KEY = 'telemetry_settings';
  private readonly QUEUE_KEY = 'telemetry_queue';

  constructor() {
    this.config = TelemetryConfiguration.getConfig();
    this.sessionId = generateUUID();
    this.deviceId = generateUUID(); // In production, use device-specific ID
    this.settings = {
      enabled: this.config.enableTelemetry,
      optedOut: false,
    };
    this.loadSettings();
  }

  /**
   * Initialize Application Insights with instrumentation key
   */
  public async initialize(instrumentationKey?: string): Promise<void> {
    try {
      if (this.initialized) {
        Logger.warn('TelemetryService already initialized');
        return;
      }

      const key = instrumentationKey || this.config.instrumentationKey;

      if (!key) {
        Logger.warn('No instrumentation key provided, telemetry disabled');
        return;
      }

      const validation = TelemetryConfiguration.validate();
      if (!validation.valid) {
        Logger.error(
          'Telemetry configuration validation failed:',
          validation.errors
        );
        return;
      }

      // Initialize React Native plugin
      const RNPlugin = new ReactNativePlugin();

      // Initialize Application Insights
      this.appInsights = new ApplicationInsights({
        config: {
          instrumentationKey: key,
          enableAutoRouteTracking: false,
          enableCorsCorrelation: true,
          enableRequestHeaderTracking: true,
          enableResponseHeaderTracking: true,
          maxBatchInterval: this.config.flushInterval,
          maxBatchSizeInBytes: 64000, // 64KB
          extensions: [RNPlugin],
          extensionConfig: {
            [RNPlugin.identifier]: {
              // React Native specific configuration
            },
          },
        },
      });

      this.appInsights.loadAppInsights();
      this.appInsights.addTelemetryInitializer(
        this.telemetryInitializer.bind(this)
      );

      // Load persisted events
      await this.loadPersistedEvents();

      // Start flush timer
      this.startFlushTimer();

      this.initialized = true;

      Logger.info('TelemetryService initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize TelemetryService:', error);
      throw error;
    }
  }

  /**
   * Track performance metric
   */
  public async trackPerformanceMetric(
    metric: PerformanceMetric
  ): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const event: TelemetryEvent = {
        id: generateUUID(),
        type: 'performance',
        data: { ...metric, ...this.getBaseMetricData() },
        retryCount: 0,
        createdAt: new Date(),
      };

      await this.queueEvent(event);
    } catch (error) {
      Logger.error('Failed to track performance metric:', error);
    }
  }

  /**
   * Track memory metric
   */
  public async trackMemoryMetric(metric: MemoryMetric): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const event: TelemetryEvent = {
        id: generateUUID(),
        type: 'memory',
        data: { ...metric, ...this.getBaseMetricData() },
        retryCount: 0,
        createdAt: new Date(),
      };

      await this.queueEvent(event);
    } catch (error) {
      Logger.error('Failed to track memory metric:', error);
    }
  }

  /**
   * Track network metric
   */
  public async trackNetworkMetric(metric: NetworkMetric): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const event: TelemetryEvent = {
        id: generateUUID(),
        type: 'network',
        data: { ...metric, ...this.getBaseMetricData() },
        retryCount: 0,
        createdAt: new Date(),
      };

      await this.queueEvent(event);
    } catch (error) {
      Logger.error('Failed to track network metric:', error);
    }
  }

  /**
   * Track app start metric
   */
  public async trackAppStartMetric(metric: AppStartMetric): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const event: TelemetryEvent = {
        id: generateUUID(),
        type: 'appStart',
        data: { ...metric, ...this.getBaseMetricData() },
        retryCount: 0,
        createdAt: new Date(),
      };

      await this.queueEvent(event);
    } catch (error) {
      Logger.error('Failed to track app start metric:', error);
    }
  }

  /**
   * Track user interaction metric
   */
  public async trackUserInteractionMetric(
    metric: UserInteractionMetric
  ): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const event: TelemetryEvent = {
        id: generateUUID(),
        type: 'userInteraction',
        data: { ...metric, ...this.getBaseMetricData() },
        retryCount: 0,
        createdAt: new Date(),
      };

      await this.queueEvent(event);
    } catch (error) {
      Logger.error('Failed to track user interaction metric:', error);
    }
  }

  /**
   * Set user ID for tracking
   */
  public setUserId(userId: string): void {
    this.userId = userId;

    if (this.appInsights && this.config.enableUserTracking) {
      this.appInsights.setAuthenticatedUserContext(userId);
    }

    // Update settings
    this.settings.userId = userId;
    this.saveSettings();
  }

  /**
   * Force flush all batched events
   */
  public async flush(): Promise<void> {
    if (!this.isEnabled() || !this.appInsights) return;

    try {
      await this.processBatch();
      this.appInsights.flush();
      Logger.info('Telemetry events flushed successfully');
    } catch (error) {
      Logger.error('Failed to flush telemetry events:', error);
    }
  }

  /**
   * Enable or disable telemetry
   */
  public async setEnabled(enabled: boolean): Promise<void> {
    this.settings.enabled = enabled;
    await this.saveSettings();

    if (!enabled) {
      // Clear queue when disabled
      this.eventQueue = [];
      await this.clearPersistedEvents();
    }
  }

  /**
   * Set user opt-out preference
   */
  public async setOptedOut(optedOut: boolean): Promise<void> {
    this.settings.optedOut = optedOut;
    await this.saveSettings();

    if (optedOut) {
      // Clear all data when opted out
      this.eventQueue = [];
      await this.clearPersistedEvents();
    }
  }

  /**
   * Get current telemetry status
   */
  public getStatus(): {
    enabled: boolean;
    initialized: boolean;
    queueSize: number;
  } {
    return {
      enabled: this.isEnabled(),
      initialized: this.initialized,
      queueSize: this.eventQueue.length,
    };
  }

  // Private methods

  private isEnabled(): boolean {
    return (
      this.initialized &&
      this.settings.enabled &&
      !this.settings.optedOut &&
      this.config.enableTelemetry
    );
  }

  private async queueEvent(event: TelemetryEvent): Promise<void> {
    this.eventQueue.push(event);

    // Persist to storage
    await this.persistEvents();

    // Process batch if queue is full
    if (this.eventQueue.length >= this.config.batchSize) {
      await this.processBatch();
    }
  }

  private async processBatch(): Promise<void> {
    if (!this.appInsights || this.eventQueue.length === 0) return;

    const batch: TelemetryBatch = {
      events: this.eventQueue.splice(0, this.config.batchSize),
      batchId: generateUUID(),
      createdAt: new Date(),
    };

    try {
      await this.sendBatch(batch);
      await this.persistEvents(); // Update persisted queue
    } catch (error) {
      // Re-queue failed events with retry count
      const retriableEvents = batch.events.filter(
        (e) => e.retryCount < this.config.maxRetries
      );
      retriableEvents.forEach((event) => {
        event.retryCount++;
        this.eventQueue.unshift(event);
      });

      Logger.error('Failed to send telemetry batch:', error);
      throw error;
    }
  }

  private async sendBatch(batch: TelemetryBatch): Promise<void> {
    if (!this.appInsights) return;

    for (const event of batch.events) {
      try {
        switch (event.type) {
          case 'performance':
            this.appInsights.trackEvent({
              name: 'Performance',
              properties: event.data,
            });
            break;
          case 'memory':
            this.appInsights.trackEvent({
              name: 'Memory',
              properties: event.data,
            });
            break;
          case 'network':
            this.appInsights.trackDependency({
              name: (event.data as NetworkMetric).url,
              duration: (event.data as NetworkMetric).duration,
              success: (event.data as NetworkMetric).success,
              resultCode: (event.data as NetworkMetric).statusCode,
              properties: event.data,
            });
            break;
          case 'appStart':
            this.appInsights.trackEvent({
              name: 'AppStart',
              properties: event.data,
            });
            break;
          case 'userInteraction':
            this.appInsights.trackEvent({
              name: 'UserInteraction',
              properties: event.data,
            });
            break;
        }
      } catch (error) {
        Logger.error(`Failed to send event ${event.id}:`, error);
        throw error;
      }
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(async () => {
      try {
        await this.processBatch();
      } catch (error) {
        Logger.error('Error in flush timer:', error);
      }
    }, this.config.flushInterval);
  }

  private getBaseMetricData(): BaseMetric {
    return {
      timestamp: new Date(),
      userId: this.userId,
      sessionId: this.sessionId,
      version: '1.0.0', // Should come from app config
      platform: Platform.OS as 'ios' | 'android',
      deviceId: this.deviceId,
    };
  }

  private telemetryInitializer(envelope: any): boolean {
    // Add custom properties to all telemetry
    envelope.tags = envelope.tags || {};
    envelope.tags['ai.application.ver'] = '1.0.0';
    envelope.tags['ai.session.id'] = this.sessionId;

    if (this.userId) {
      envelope.tags['ai.user.id'] = this.userId;
    }

    return true;
  }

  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      Logger.error('Failed to load telemetry settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(this.settings)
      );
    } catch (error) {
      Logger.error('Failed to save telemetry settings:', error);
    }
  }

  private async persistEvents(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.QUEUE_KEY,
        JSON.stringify(this.eventQueue)
      );
    } catch (error) {
      Logger.error('Failed to persist telemetry events:', error);
    }
  }

  private async loadPersistedEvents(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.QUEUE_KEY);
      if (stored) {
        this.eventQueue = JSON.parse(stored);
      }
    } catch (error) {
      Logger.error('Failed to load persisted telemetry events:', error);
    }
  }

  private async clearPersistedEvents(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.QUEUE_KEY);
    } catch (error) {
      Logger.error('Failed to clear persisted telemetry events:', error);
    }
  }
}

export default new TelemetryService();
