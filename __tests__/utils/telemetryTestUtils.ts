import {
  TelemetryEvent,
  PerformanceMetric,
  MemoryMetric,
} from '../../src/types/telemetry';

export const createMockPerformanceMetric = (
  overrides: Partial<PerformanceMetric> = {}
): PerformanceMetric => ({
  metricName: 'test-metric',
  duration: 100,
  success: true,
  timestamp: new Date(),
  sessionId: 'test-session-123',
  version: '1.0.0',
  platform: 'ios',
  deviceId: 'test-device-123',
  ...overrides,
});

export const createMockMemoryMetric = (
  overrides: Partial<MemoryMetric> = {}
): MemoryMetric => ({
  totalMemory: 2048,
  usedMemory: 1024,
  availableMemory: 1024,
  memoryPressure: 'moderate',
  timestamp: new Date(),
  sessionId: 'test-session-123',
  version: '1.0.0',
  platform: 'ios',
  deviceId: 'test-device-123',
  ...overrides,
});

export const createMockTelemetryEvent = (
  overrides: Partial<TelemetryEvent> = {}
): TelemetryEvent => ({
  id: 'test-event-123',
  type: 'performance',
  data: createMockPerformanceMetric(),
  retryCount: 0,
  createdAt: new Date(),
  ...overrides,
});

export const waitForAsync = (ms: number = 0): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const expectTelemetryEventToMatch = (
  event: TelemetryEvent,
  expected: Partial<TelemetryEvent>
) => {
  expect(event.id).toBeDefined();
  expect(event.type).toBe(expected.type || 'performance');
  expect(event.retryCount).toBe(expected.retryCount || 0);
  expect(event.createdAt).toBeInstanceOf(Date);

  if (expected.data) {
    expect(event.data).toMatchObject(expected.data);
  }
};
