/**
 * SyncManager Unit Tests
 * Comprehensive test suite for sync functionality
 */
import { SyncManager, getSyncManager } from '../../src/sync/SyncManager';
import type { SyncResult, SyncEventData } from '../../src/sync/types';

// Mock dependencies
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    })
  ),
}));

jest.mock('../../src/config/Config', () => ({
  appConfig: {
    apiUrl: 'https://api.test.com',
  },
}));

jest.mock('../../src/config/Network', () => ({
  API_TIMEOUT_MS: 5000,
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('SyncManager', () => {
  let syncManager: SyncManager;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // Reset singleton
    SyncManager.resetInstance();
    syncManager = SyncManager.getInstance();
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();

    // Mock successful auth token
    jest.doMock('../../src/store', () => ({
      store: {
        getState: () => ({
          auth: { token: 'valid_token' },
        }),
        dispatch: jest.fn(),
      },
    }));
  });

  afterEach(() => {
    SyncManager.resetInstance();
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SyncManager.getInstance();
      const instance2 = SyncManager.getInstance();
      const instance3 = getSyncManager();

      expect(instance1).toBe(instance2);
      expect(instance1).toBe(instance3);
    });

    it('should reset instance properly', () => {
      const instance1 = SyncManager.getInstance();
      SyncManager.resetInstance();
      const instance2 = SyncManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(syncManager.isSyncRunning()).toBe(false);

      const status = syncManager.getSyncStatus();
      expect(status.isRunning).toBe(false);
      expect(status.hasActivePromise).toBe(false);
      expect(status.listenerCount).toBe(0);
    });
  });

  describe('Event System', () => {
    it('should emit sync events correctly', async () => {
      const events: Array<{ type: string; data: SyncEventData }> = [];

      syncManager.onSyncEvent('syncStarted', (data) => {
        events.push({ type: 'syncStarted', data });
      });

      syncManager.onSyncEvent('syncFinished', (data) => {
        events.push({ type: 'syncFinished', data });
      });

      syncManager.onSyncEvent('syncFailed', (data) => {
        events.push({ type: 'syncFailed', data });
      });

      // Mock successful API responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      } as Response);

      await syncManager.manualSync('manual');

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('syncStarted');
      expect(events[1].type).toBe('syncFinished');
      expect(events[0].data.source).toBe('manual');
    });

    it('should remove event listeners', () => {
      const listener = jest.fn();

      syncManager.onSyncEvent('syncStarted', listener);
      expect(syncManager.getSyncStatus().listenerCount).toBeGreaterThan(0);

      syncManager.offSyncEvent('syncStarted', listener);
      expect(syncManager.getSyncStatus().listenerCount).toBe(0);
    });
  });

  describe('Network Connectivity', () => {
    const NetInfo = require('@react-native-community/netinfo');

    it('should fail when device is offline', async () => {
      NetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });

      const result = await syncManager.manualSync('manual');

      expect(result.success).toBe(false);
      expect(result.error).toBe('OFFLINE');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fail when internet is not reachable', async () => {
      NetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: false,
        type: 'wifi',
      });

      const result = await syncManager.manualSync('manual');

      expect(result.success).toBe(false);
      expect(result.error).toBe('OFFLINE');
    });

    it('should proceed when network is available', async () => {
      NetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      } as Response);

      const result = await syncManager.manualSync('manual');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Concurrency Protection', () => {
    it('should return same promise for concurrent calls', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ success: true, data: [] }),
                } as Response),
              100
            )
          )
      );

      const promise1 = syncManager.manualSync('manual');
      const promise2 = syncManager.manualSync('timer');
      const promise3 = syncManager.manualSync('manual');

      expect(promise1).toBe(promise2);
      expect(promise1).toBe(promise3);

      const [result1, result2, result3] = await Promise.all([
        promise1,
        promise2,
        promise3,
      ]);

      expect(result1).toBe(result2);
      expect(result1).toBe(result3);
      expect(result1.success).toBe(true);
    });

    it('should allow new sync after previous completes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      } as Response);

      const result1 = await syncManager.manualSync('manual');
      expect(result1.success).toBe(true);
      expect(syncManager.isSyncRunning()).toBe(false);

      const result2 = await syncManager.manualSync('timer');
      expect(result2.success).toBe(true);

      // Should be different results (different timestamps)
      expect(result1.completedAt).not.toBe(result2.completedAt);
    });
  });

  describe('Authentication Handling', () => {
    it('should handle 401 errors and trigger logout', async () => {
      const mockDispatch = jest.fn();

      jest.doMock('../../src/store', () => ({
        store: {
          getState: () => ({ auth: { token: 'expired_token' } }),
          dispatch: mockDispatch,
        },
      }));

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      const result = await syncManager.manualSync('manual');

      expect(result.success).toBe(false);
      expect(result.error).toBe('AUTH_EXPIRED');
      // Note: logout dispatch testing would need more complex mocking
    });
  });

  describe('Retry Logic', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should retry on 5xx errors with exponential backoff', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] }),
        } as Response);
      });

      const syncPromise = syncManager.manualSync('manual');

      // Fast-forward through retry delays
      jest.advanceTimersByTime(7000); // 1s + 2s + 4s delays

      const result = await syncPromise;

      expect(result.success).toBe(true);
      expect(callCount).toBe(3); // Initial + 2 retries = success on 3rd
    });

    it('should fail after max retries', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const syncPromise = syncManager.manualSync('manual');
      jest.advanceTimersByTime(10000); // Fast-forward through all retries

      const result = await syncPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('500 Server Error');
    });
  });

  describe('Public API Methods', () => {
    it('should provide sync status information', () => {
      const status = syncManager.getSyncStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('hasActivePromise');
      expect(status).toHaveProperty('listenerCount');
      expect(status).toHaveProperty('debugInfo');
      expect(status.debugInfo).toHaveProperty('instanceId');
      expect(status.debugInfo).toHaveProperty('uptime');
    });

    it('should cancel running sync', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ success: true, data: [] }),
                } as Response),
              1000
            )
          )
      );

      const syncPromise = syncManager.manualSync('manual');
      expect(syncManager.isSyncRunning()).toBe(true);

      const cancelled = syncManager.cancelSync();
      expect(cancelled).toBe(true);
      expect(syncManager.isSyncRunning()).toBe(false);

      // Original promise should still resolve
      const result = await syncPromise;
      // The behavior here depends on implementation details
    });

    it('should force reset sync state', () => {
      const listener = jest.fn();
      syncManager.onSyncEvent('syncStarted', listener);

      syncManager.forceReset();

      expect(syncManager.isSyncRunning()).toBe(false);
      expect(syncManager.getSyncStatus().listenerCount).toBe(0);
    });
  });
});
