import {
  PerformanceMetric,
  MemoryMetric,
  ColdStartMetric,
} from '../../src/types/performance';

export const createMockColdStartMetric = (
  overrides: Partial<ColdStartMetric> = {}
): ColdStartMetric => ({
  appLaunchTime: 1000,
  bundleLoadTime: 300,
  nativeInitTime: 200,
  jsInitTime: 500,
  firstScreenRenderTime: 1000,
  totalColdStartTime: 2000,
  startupType: 'cold',
  timestamp: Date.now(),
  deviceInfo: {
    platform: 'ios',
    osVersion: '15.0',
    deviceModel: 'iPhone 13',
    memoryTotal: 4096,
  },
  ...overrides,
});

export const createMockPerformanceMetric = (
  overrides: Partial<PerformanceMetric> = {}
): PerformanceMetric => ({
  name: 'test-metric',
  startTime: 1000,
  endTime: 1200,
  duration: 200,
  metricType: 'custom',
  timestamp: Date.now(),
  sessionId: 'test-session-123',
  ...overrides,
});

export const createMockMemoryMetric = (
  overrides: Partial<MemoryMetric> = {}
): MemoryMetric => ({
  timestamp: Date.now(),
  totalMemory: 2048,
  usedMemory: 1024,
  availableMemory: 1024,
  jsHeapSize: 512,
  jsHeapUsed: 256,
  nativeHeapSize: 512,
  nativeHeapUsed: 256,
  memoryPressure: 'moderate',
  screenName: 'Home',
  sessionId: 'test-session-123',
  platform: 'ios',
  ...overrides,
});

export const waitForPerformanceMetrics = (ms: number = 100): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const expectPerformanceMetricToBeValid = (metric: PerformanceMetric) => {
  expect(metric.name).toBeDefined();
  expect(metric.startTime).toBeGreaterThanOrEqual(0);
  expect(metric.endTime).toBeGreaterThanOrEqual(metric.startTime);
  expect(metric.duration).toBeGreaterThanOrEqual(0);
  expect(metric.metricType).toBeDefined();
  expect(metric.timestamp).toBeDefined();
  expect(metric.sessionId).toBeDefined();
};
