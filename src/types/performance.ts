// Enhanced Performance Types for react-native-performance + Azure Integration
import { PerformanceMetric as ExistingPerformanceMetric } from '../utils/PerformanceMonitor';

export interface PerformanceMetric extends ExistingPerformanceMetric {
  // Extend existing PerformanceMetric with new fields
  startTime: number;
  endTime: number;
  duration: number;
  metricType:
    | 'cold_start'
    | 'navigation'
    | 'screen_render'
    | 'api_call'
    | 'memory'
    | 'custom';
  screenName?: string;
  fromScreen?: string;
  toScreen?: string;
  additionalData?: Record<string, any>;
}

export interface MemoryMetric {
  timestamp: number;
  totalMemory: number;
  usedMemory: number;
  availableMemory: number;
  jsHeapSize: number;
  jsHeapUsed: number;
  nativeHeapSize: number;
  nativeHeapUsed: number;
  memoryPressure: 'low' | 'moderate' | 'high' | 'critical';
  screenName?: string;
  sessionId: string;
  platform: 'ios' | 'android';
}

export interface NavigationMetric {
  fromScreen: string;
  toScreen: string;
  navigationDuration: number;
  renderDuration: number;
  totalDuration: number;
  timestamp: number;
  success: boolean;
  error?: string;
  additionalData?: Record<string, any>;
}

export interface ColdStartMetric {
  appLaunchTime: number;
  bundleLoadTime: number;
  nativeInitTime: number;
  jsInitTime: number;
  firstScreenRenderTime: number;
  totalColdStartTime: number;
  startupType: 'cold' | 'warm' | 'hot';
  timestamp: number;
  deviceInfo: {
    platform: 'ios' | 'android';
    osVersion: string;
    deviceModel: string;
    memoryTotal: number;
  };
}

export interface ScreenRenderMetric {
  screenName: string;
  renderStartTime: number;
  renderEndTime: number;
  renderDuration: number;
  componentCount: number;
  isInitialRender: boolean;
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface PerformanceBudget {
  coldStart: {
    maxDuration: number; // 3000ms
    target: number; // 2000ms
  };
  navigation: {
    maxDuration: number; // 300ms
    target: number; // 200ms
  };
  screenRender: {
    maxDuration: number; // 500ms
    target: number; // 300ms
  };
  memory: {
    maxUsage: number; // 150MB
    target: number; // 100MB
  };
  apiCall: {
    maxDuration: number; // 5000ms
    target: number; // 3000ms
  };
}

export interface PerformanceReport {
  timestamp: number;
  sessionId: string;
  metrics: {
    coldStart?: ColdStartMetric;
    navigation: NavigationMetric[];
    screenRender: ScreenRenderMetric[];
    memory: MemoryMetric[];
    custom: PerformanceMetric[];
  };
  budgetViolations: BudgetViolation[];
  summary: {
    totalViolations: number;
    averageNavigationTime: number;
    averageRenderTime: number;
    peakMemoryUsage: number;
  };
}

export interface BudgetViolation {
  metricType: string;
  metricName: string;
  actualValue: number;
  budgetValue: number;
  severity: 'warning' | 'error';
  timestamp: number;
  screenName?: string;
}

export interface PerformanceObserverConfig {
  enableColdStartTracking: boolean;
  enableNavigationTracking: boolean;
  enableMemoryTracking: boolean;
  enableScreenRenderTracking: boolean;
  samplingRate: number; // 0-1, for reducing overhead
  memoryTrackingInterval: number; // milliseconds
  maxMetricsQueueSize: number;
  budget: PerformanceBudget;
}

export interface PerformanceMark {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}
