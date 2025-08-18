import { SyncManager } from '../../src/services/SyncManager';
import { MIN_SYNC_GAP_MS } from '../../src/constants/sync';
import Toast from 'react-native-toast-message';

// Mock Toast
jest.mock('react-native-toast-message');

describe('Sync Throttling', () => {
  let syncManager: SyncManager;
  let mockStore: any;

  beforeEach(() => {
    jest.useFakeTimers();
    mockStore = {
      dispatch: jest.fn(),
      getState: jest.fn(() => ({})),
    };
    syncManager = new SyncManager(mockStore);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should throttle manual sync when called within minimum gap', async () => {
    // First sync
    await syncManager.manualSync('manual');

    // Immediate second sync should be throttled
    await syncManager.manualSync('manual');

    expect(Toast.show).toHaveBeenCalledWith({
      type: 'info',
      text1: 'Sync Throttled',
      text2: 'Please wait before refreshing',
      position: 'bottom',
    });
  });

  it('should allow sync after minimum gap has passed', async () => {
    // First sync
    await syncManager.manualSync('manual');

    // Fast-forward time beyond minimum gap
    jest.advanceTimersByTime(MIN_SYNC_GAP_MS + 1000);

    // Second sync should be allowed
    const syncSpy = jest
      .spyOn(syncManager as any, 'syncAllEntities')
      .mockResolvedValue(undefined);
    await syncManager.manualSync('manual');

    expect(syncSpy).toHaveBeenCalled();
  });

  it('should silently skip auto-sync when throttled', async () => {
    // First sync
    await syncManager.manualSync('manual');

    // Auto-sync should be silently skipped
    await syncManager.autoSync();

    expect(Toast.show).not.toHaveBeenCalled();
  });

  it('should prevent concurrent syncs', async () => {
    const longRunningSyncPromise = syncManager.manualSync('manual');

    // Try to start another sync while first is running
    await syncManager.manualSync('manual');

    expect(Toast.show).toHaveBeenCalledWith({
      type: 'info',
      text1: 'Sync Throttled',
      text2: 'Please wait before refreshing',
      position: 'bottom',
    });

    await longRunningSyncPromise;
  });
});
