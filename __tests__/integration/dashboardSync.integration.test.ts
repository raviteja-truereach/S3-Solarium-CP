import { configureStore } from '@reduxjs/toolkit';
import { SyncManager } from '../../src/services/SyncManager';
import { SyncScheduler } from '../../src/sync/SyncScheduler';
import networkSlice, {
  selectUnreadCount,
  selectLastSyncTs,
  selectSyncInProgress,
} from '../../src/store/slices/networkSlice';
import { MIN_SYNC_GAP_MS } from '../../src/constants/sync';
import Toast from 'react-native-toast-message';

// Mock dependencies
jest.mock('react-native-toast-message');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');

describe('Dashboard Sync Integration', () => {
  let store: any;
  let syncManager: SyncManager;
  let syncScheduler: SyncScheduler;

  beforeEach(() => {
    jest.useFakeTimers();

    store = configureStore({
      reducer: {
        network: networkSlice,
      },
    });

    // Mock successful API responses
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            notifications: [{ id: '1' }, { id: '2' }],
            unreadCount: 2,
          },
        }),
    });

    syncManager = new SyncManager(store);
    syncScheduler = new SyncScheduler();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    syncScheduler.destroy();
  });

  describe('State Hydration', () => {
    it('should hydrate unreadCount and lastSyncTs after successful sync', async () => {
      // Initial state
      let state = store.getState();
      expect(selectUnreadCount(state)).toBe(0);
      expect(selectLastSyncTs(state)).toBeUndefined();

      // Perform sync
      await syncManager.manualSync('manual');

      // Check updated state
      state = store.getState();
      expect(selectUnreadCount(state)).toBe(2);
      expect(selectLastSyncTs(state)).toBeDefined();
      expect(new Date(selectLastSyncTs(state)!).getTime()).toBeCloseTo(
        Date.now(),
        -5000
      );
    });

    it('should maintain state consistency across multiple syncs', async () => {
      // First sync
      await syncManager.manualSync('manual');
      const firstState = store.getState();
      const firstSyncTs = selectLastSyncTs(firstState);

      // Wait and sync again
      jest.advanceTimersByTime(MIN_SYNC_GAP_MS + 1000);

      // Mock different response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              notifications: [{ id: '1' }, { id: '2' }, { id: '3' }],
              unreadCount: 3,
            },
          }),
      });

      await syncManager.manualSync('manual');

      const secondState = store.getState();
      const secondSyncTs = selectLastSyncTs(secondState);

      expect(selectUnreadCount(secondState)).toBe(3);
      expect(new Date(secondSyncTs!).getTime()).toBeGreaterThan(
        new Date(firstSyncTs!).getTime()
      );
    });
  });

  describe('Throttle Edge Cases', () => {
    it('should throttle manual sync within minimum gap', async () => {
      const toastSpy = jest.spyOn(Toast, 'show');

      // First sync
      await syncManager.manualSync('manual');

      // Immediate second sync should be throttled
      await syncManager.manualSync('manual');

      expect(toastSpy).toHaveBeenCalledWith({
        type: 'info',
        text1: 'Sync Throttled',
        text2: 'Please wait before refreshing',
        position: 'bottom',
      });
    });

    it('should allow auto sync after manual sync within throttle window', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch');

      // Manual sync
      await syncManager.manualSync('manual');
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Auto sync immediately after should be silently skipped
      await syncManager.autoSync();
      expect(fetchSpy).toHaveBeenCalledTimes(1); // No additional calls

      // No toast should be shown for auto sync
      expect(Toast.show).not.toHaveBeenCalled();
    });

    it('should allow sync after throttle period expires', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch');

      // First sync
      await syncManager.manualSync('manual');
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Advance time beyond throttle period
      jest.advanceTimersByTime(MIN_SYNC_GAP_MS + 1000);

      // Second sync should be allowed
      await syncManager.manualSync('manual');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent sync attempts', async () => {
      const toastSpy = jest.spyOn(Toast, 'show');

      // Start multiple syncs concurrently
      const sync1Promise = syncManager.manualSync('manual');
      const sync2Promise = syncManager.manualSync('manual');

      await Promise.all([sync1Promise, sync2Promise]);

      // Second sync should be blocked due to mutex
      expect(toastSpy).toHaveBeenCalledWith({
        type: 'info',
        text1: 'Sync Throttled',
        text2: 'Please wait before refreshing',
        position: 'bottom',
      });
    });
  });

  describe('Scheduler Integration', () => {
    it('should trigger auto sync at scheduled intervals', async () => {
      const autoSyncSpy = jest.spyOn(syncManager, 'autoSync');

      syncScheduler.start();

      // Fast forward to trigger auto sync
      jest.advanceTimersByTime(180000 + 10000); // AUTO_SYNC_INTERVAL_MS + buffer

      expect(autoSyncSpy).toHaveBeenCalled();
    });

    it('should pause scheduler when app goes to background', () => {
      syncScheduler.start();

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      // Simulate app state change
      const appStateCallback =
        require('react-native').AppState.addEventListener.mock.calls[0][1];
      appStateCallback('background');

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should resume scheduler when app becomes active', () => {
      syncScheduler.start();

      // Go to background
      const appStateCallback =
        require('react-native').AppState.addEventListener.mock.calls[0][1];
      appStateCallback('background');

      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      // Return to foreground
      appStateCallback('active');

      expect(setIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));

      const initialState = store.getState();

      await expect(syncManager.manualSync('manual')).rejects.toThrow(
        'API Error'
      );

      const finalState = store.getState();
      expect(selectUnreadCount(finalState)).toBe(
        selectUnreadCount(initialState)
      );
      expect(selectSyncInProgress(finalState)).toBe(false);
    });

    it('should update error state on sync failure', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network timeout'));

      await expect(syncManager.manualSync('manual')).rejects.toThrow();

      const state = store.getState();
      expect(state.network.lastError).toContain('Network timeout');
    });
  });

  describe('Performance', () => {
    it('should complete sync within reasonable time', async () => {
      const startTime = Date.now();

      await syncManager.manualSync('manual');

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should not exceed memory limits during sync', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform multiple syncs
      for (let i = 0; i < 5; i++) {
        await syncManager.manualSync('manual');
        jest.advanceTimersByTime(MIN_SYNC_GAP_MS + 1000);
      }

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncreaseMB = (finalMemory - initialMemory) / 1024 / 1024;

      expect(memoryIncreaseMB).toBeLessThan(10); // Should not increase by more than 10MB
    });
  });
});
