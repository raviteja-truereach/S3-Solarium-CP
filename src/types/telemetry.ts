// Telemetry Types for Azure Application Insights Integration
export interface TelemetryConfig {
  instrumentationKey: string;
  enableTelemetry: boolean;
  batchSize: number;
  flushInterval: number;
  maxRetries: number;
  retryDelay: number;
  enableUserTracking: boolean;
  enablePerformanceTracking: boolean;
  enableMemoryTracking: boolean;
}

export interface BaseMetric {
  timestamp: Date;
  userId?: string;
  sessionId: string;
  version: string;
  platform: 'ios' | 'android';
  deviceId: string;
}

export interface PerformanceMetric extends BaseMetric {
  metricName: string;
  duration: number;
  success: boolean;
  errorMessage?: string;
  additionalProperties?: Record<string, any>;
}

export interface MemoryMetric extends BaseMetric {
  totalMemory: number;
  usedMemory: number;
  availableMemory: number;
  memoryPressure: 'low' | 'moderate' | 'high';
  jsHeapSize?: number;
  jsHeapUsed?: number;
}

export interface NetworkMetric extends BaseMetric {
  url: string;
  method: string;
  statusCode: number;
  duration: number;
  requestSize: number;
  responseSize: number;
  success: boolean;
  errorMessage?: string;
}

export interface AppStartMetric extends BaseMetric {
  startupDuration: number;
  startupType: 'cold' | 'warm' | 'hot';
  bundleLoadTime: number;
  jsLoadTime: number;
  nativeInitTime: number;
}

export interface UserInteractionMetric extends BaseMetric {
  action: string;
  screenName: string;
  componentName?: string;
  duration?: number;
  success: boolean;
  errorMessage?: string;
}

export interface TelemetryEvent {
  id: string;
  type: 'performance' | 'memory' | 'network' | 'appStart' | 'userInteraction';
  data:
    | PerformanceMetric
    | MemoryMetric
    | NetworkMetric
    | AppStartMetric
    | UserInteractionMetric;
  retryCount: number;
  createdAt: Date;
}

export interface TelemetryBatch {
  events: TelemetryEvent[];
  batchId: string;
  createdAt: Date;
}

export interface TelemetryError {
  message: string;
  stack?: string;
  code?: string;
  timestamp: Date;
}

export interface TelemetrySettings {
  enabled: boolean;
  userId?: string;
  optedOut: boolean;
  lastFlushTime?: Date;
}
