import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import networkSlice from '../../src/store/slices/networkSlice';
import authSlice from '../../src/store/slices/authSlice';
import { dashboardApi } from '../../src/store/api/dashboardApi';

/**
 * Test utilities for sync system integration tests
 */

export interface TestEnvironment {
  store: ReturnType<typeof createTestStore>;
  mockSyncManager: any;
  mockBaseQuery: any;
  mockAsyncStorage: any;
  cleanup: () => Promise<void>;
}

/**
 * Create test store with all necessary slices
 */
export function createTestStore() {
  const rootReducer = combineReducers({
    auth: authSlice,
    network: networkSlice,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
  });

  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }).concat(
        dashboardApi.middleware
      ),
  });
}

/**
 * Setup complete test environment with mocks
 */
export function setupTestEnvironment(): TestEnvironment {
  // Mock AsyncStorage
  const mockAsyncStorage = AsyncStorage as jest.MockedFunction<any>;
  mockAsyncStorage.getItem.mockResolvedValue(null);
  mockAsyncStorage.setItem.mockResolvedValue(undefined);
  mockAsyncStorage.removeItem.mockResolvedValue(undefined);

  // Mock base query
  const mockBaseQuery = jest.fn();
  mockBaseQuery.mockResolvedValue({
    data: {
      success: true,
      data: {
        totalLeads: 100,
        leadsWon: 25,
        customerAccepted: 5,
        followUpPending: 30,
        activeQuotations: 15,
        totalCommission: 50000,
        pendingCommission: 10000,
        lastUpdatedAt: '2024-01-15T10:30:00Z',
      },
      timestamp: '2024-01-15T10:30:00Z',
    },
  });

  // Mock SyncManager
  const mockSyncManager = {
    manualSync: jest.fn().mockResolvedValue({
      success: true,
      itemsProcessed: 10,
      message: 'Sync completed successfully',
    }),
    getLastSyncResult: jest.fn(),
    cleanup: jest.fn(),
  };

  // Apply mocks
  require('../../src/store/api/baseQuery').baseQuery = mockBaseQuery;
  require('../../src/sync/SyncManager').SyncManager = {
    getInstance: jest.fn(() => mockSyncManager),
  };

  // Mock React Native components
  require('react-native').AppState = {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  };

  // Create store
  const store = createTestStore();

  return {
    store,
    mockSyncManager,
    mockBaseQuery,
    mockAsyncStorage,
    cleanup: async () => {
      // Cleanup mocks
      jest.clearAllMocks();

      // Reset singletons
      const { SystemCleanup } = require('../../src/utils/SystemCleanup');
      await SystemCleanup.performFullCleanup();
    },
  };
}

/**
 * Wait for async operations to complete
 */
export function waitForAsync(ms = 0): Promise<void> {
  return new Promise((resolve) => {
    if (ms > 0) {
      setTimeout(resolve, ms);
    } else {
      setImmediate(resolve);
    }
  });
}

/**
 * Create mock dashboard data
 */
export function createMockDashboardData() {
  return {
    totalLeads: 150,
    leadsWon: 30,
    customerAccepted: 8,
    followUpPending: 45,
    activeQuotations: 22,
    totalCommission: 75000,
    pendingCommission: 18000,
    lastUpdatedAt: new Date().toISOString(),
  };
}

/**
 * Create mock sync result
 */
export function createMockSyncResult(success = true, itemsProcessed = 10) {
  return success
    ? {
        success: true,
        itemsProcessed,
        message: 'Sync completed successfully',
        duration: 1500,
      }
    : {
        success: false,
        error: 'Network timeout',
        itemsProcessed: 0,
      };
}

/**
 * Simulate app state changes
 */
export function simulateAppStateChange(
  newState: 'active' | 'background' | 'inactive'
) {
  const appStateListeners = jest.mocked(
    require('react-native').AppState.addEventListener
  ).mock.calls;

  appStateListeners.forEach(([eventName, listener]) => {
    if (eventName === 'change') {
      listener(newState);
    }
  });
}

/**
 * Create performance test scenario
 */
export async function runPerformanceTest(
  testFn: () => Promise<void>,
  maxDuration = 5000
): Promise<{ duration: number; success: boolean; error?: string }> {
  const startTime = Date.now();

  try {
    await testFn();
    const duration = Date.now() - startTime;

    return {
      duration,
      success: duration <= maxDuration,
      ...(duration > maxDuration && {
        error: `Test exceeded ${maxDuration}ms (took ${duration}ms)`,
      }),
    };
  } catch (error) {
    return {
      duration: Date.now() - startTime,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Memory usage tracker for tests
 */
export class MemoryTracker {
  private snapshots: Array<{ timestamp: number; usage: number }> = [];

  public takeSnapshot(): number {
    const usage = global.performance?.memory?.usedJSHeapSize || 0;
    this.snapshots.push({ timestamp: Date.now(), usage });
    return usage;
  }

  public getGrowth(): number {
    if (this.snapshots.length < 2) return 0;

    const first = this.snapshots[0].usage;
    const last = this.snapshots[this.snapshots.length - 1].usage;

    return ((last - first) / first) * 100; // Percentage growth
  }

  public hasMemoryLeak(threshold = 20): boolean {
    return this.getGrowth() > threshold;
  }

  public clear(): void {
    this.snapshots = [];
  }
}
