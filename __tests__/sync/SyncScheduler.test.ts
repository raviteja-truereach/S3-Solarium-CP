import { SyncScheduler } from '../../src/sync/SyncScheduler';
import { AUTO_SYNC_INTERVAL_MS } from '../../src/constants/sync';

// Mock dependencies
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
  },
}));

jest.mock('@react-native-netinfo/lib/commonjs', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() =>
    Promise.resolve({ isConnected: true, isInternetReachable: true })
  ),
}));

jest.mock('../../src/services/SyncManager');

describe('SyncScheduler', () => {
  let scheduler: SyncScheduler;

  beforeEach(() => {
    jest.useFakeTimers();
    scheduler = new SyncScheduler();
  });

  afterEach(() => {
    scheduler.destroy();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should schedule auto-sync when started', () => {
    scheduler.start();

    expect(setInterval).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Number)
    );
  });

  it('should execute auto-sync at scheduled intervals', async () => {
    const syncManager =
      require('../../src/services/SyncManager').getSyncManager();
    const autoSyncSpy = jest
      .spyOn(syncManager, 'autoSync')
      .mockResolvedValue(undefined);

    scheduler.start();

    // Fast-forward time to trigger auto-sync
    jest.advanceTimersByTime(AUTO_SYNC_INTERVAL_MS + 10000);

    expect(autoSyncSpy).toHaveBeenCalled();
  });

  it('should pause auto-sync when app goes to background', () => {
    scheduler.start();

    // Simulate app state change to background
    const appStateCallback =
      require('react-native').AppState.addEventListener.mock.calls[0][1];
    appStateCallback('background');

    expect(clearInterval).toHaveBeenCalled();
  });

  it('should resume auto-sync when app becomes active', () => {
    scheduler.start();

    // Go to background first
    const appStateCallback =
      require('react-native').AppState.addEventListener.mock.calls[0][1];
    appStateCallback('background');

    // Come back to foreground
    appStateCallback('active');

    expect(setInterval).toHaveBeenCalledTimes(2); // Initial + resume
  });
});
