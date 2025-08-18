import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import { SyncScheduler } from '../../src/sync/SyncScheduler';
import { SyncManager } from '../../src/sync/SyncManager';
import { AppStateManager } from '../../src/utils/AppStateManager';
import networkSlice, {
  selectSyncInProgress,
  setSyncPaused,
  setSyncResumed,
} from '../../src/store/slices/networkSlice';
import authSlice from '../../src/store/slices/authSlice';

// Mock dependencies
jest.mock('../../src/sync/SyncManager', () => ({
  SyncManager: {
    getInstance: jest.fn(() => ({
      manualSync: jest.fn().mockResolvedValue({ success: true }),
    })),
  },
}));

jest.mock('../../src/utils/AppStateManager', () => ({
  AppStateManager: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../../src/store/api/dashboardApi', () => ({
  dashboardApi: {
    endpoints: {
      getSummary: {
        initiate: jest.fn(),
      },
    },
  },
}));

// Create test store
const createTestStore = () => {
  const rootReducer = combineReducers({
    auth: authSlice,
    network: networkSlice,
  });

  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }),
  });
};

describe('SyncScheduler Lifecycle', () => {
  let mockAppStateManager: any;
  let testStore: ReturnType<typeof createTestStore>;
  let scheduler: SyncScheduler;
  let mockAppStateListener: (state: string) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock AppStateManager
    mockAppStateManager = {
      getCurrentState: jest.fn().mockReturnValue('active'),
      isActive: jest.fn().mockReturnValue(true),
      addListener: jest.fn(),
      cleanup: jest.fn(),
      getTimeSinceActive: jest.fn().mockReturnValue(1000),
      getTimeSinceBackground: jest.fn().mockReturnValue(null),
      wasBackgroundedLongEnough: jest.fn().mockReturnValue(false),
    };

    (AppStateManager.getInstance as jest.Mock).mockReturnValue(
      mockAppStateManager
    );

    // Capture the listener function
    mockAppStateManager.addListener.mockImplementation((listener: any) => {
      mockAppStateListener = listener;
      return jest.fn(); // Return unsubscribe function
    });

    testStore = createTestStore();
    scheduler = SyncScheduler.getInstance();
    scheduler.cleanup(); // Clean any existing state
    scheduler = SyncScheduler.getInstance();
  });

  afterEach(() => {
    scheduler.cleanup();
    jest.useRealTimers();
  });

  describe('app state transitions', () => {
    it('should start scheduler when app is active', () => {
      mockAppStateManager.isActive.mockReturnValue(true);

      scheduler.start(testStore);

      const status = scheduler.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.isPaused).toBe(false);
    });

    it('should not start scheduler when app is not active', () => {
      mockAppStateManager.isActive.mockReturnValue(false);

      scheduler.start(testStore);

      const status = scheduler.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should pause scheduler when app goes to background', () => {
      // Start scheduler in active state
      scheduler.start(testStore);
      expect(scheduler.getStatus().isRunning).toBe(true);

      // Simulate app going to background
      mockAppStateManager.isActive.mockReturnValue(false);
      mockAppStateListener('background');

      const status = scheduler.getStatus();
      expect(status.isPaused).toBe(true);
    });

    it('should resume scheduler when app becomes active', () => {
      // Start and then pause scheduler
      scheduler.start(testStore);
      mockAppStateManager.isActive.mockReturnValue(false);
      mockAppStateListener('background');

      expect(scheduler.getStatus().isPaused).toBe(true);

      // Simulate app becoming active
      mockAppStateManager.isActive.mockReturnValue(true);
      mockAppStateListener('active');

      const status = scheduler.getStatus();
      expect(status.isPaused).toBe(false);
      expect(status.isRunning).toBe(true);
    });
  });

  describe('long background handling', () => {
    it('should trigger immediate sync after long background', async () => {
      const mockSyncManager = {
        manualSync: jest.fn().mockResolvedValue({ success: true }),
      };
      (SyncManager.getInstance as jest.Mock).mockReturnValue(mockSyncManager);

      // Start scheduler
      scheduler.start(testStore);

      // Simulate long background
      mockAppStateManager.wasBackgroundedLongEnough.mockReturnValue(true);
      mockAppStateManager.isActive.mockReturnValue(true);
      mockAppStateListener('active');

      // Fast forward to trigger immediate sync
      jest.advanceTimersByTime(3000);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockSyncManager.manualSync).toHaveBeenCalledWith('scheduler');
    });

    it('should not trigger immediate sync after short background', async () => {
      const mockSyncManager = {
        manualSync: jest.fn().mockResolvedValue({ success: true }),
      };
      (SyncManager.getInstance as jest.Mock).mockReturnValue(mockSyncManager);

      scheduler.start(testStore);

      // Simulate short background
      mockAppStateManager.wasBackgroundedLongEnough.mockReturnValue(false);
      mockAppStateManager.isActive.mockReturnValue(true);
      mockAppStateListener('active');

      jest.advanceTimersByTime(3000);
      await new Promise((resolve) => setImmediate(resolve));

      // Should not have extra sync calls beyond normal interval
      expect(mockSyncManager.manualSync).toHaveBeenCalledTimes(1); // Only the initial sync
    });
  });

  describe('state management integration', () => {
    it('should dispatch pause action when backgrounded', () => {
      scheduler.start(testStore);

      // Mock dispatch spy
      const dispatchSpy = jest.spyOn(testStore, 'dispatch');

      // Simulate background
      mockAppStateManager.isActive.mockReturnValue(false);
      mockAppStateListener('background');

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'network/setSyncPaused',
          payload: expect.objectContaining({
            reason: 'app_backgrounded',
          }),
        })
      );
    });

    it('should dispatch resume action when activated', () => {
      scheduler.start(testStore);

      // First background
      mockAppStateManager.isActive.mockReturnValue(false);
      mockAppStateListener('background');

      // Mock dispatch spy
      const dispatchSpy = jest.spyOn(testStore, 'dispatch');
      dispatchSpy.mockClear(); // Clear previous calls

      // Then active
      mockAppStateManager.isActive.mockReturnValue(true);
      mockAppStateListener('active');

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'network/setSyncResumed',
        })
      );
    });
  });

  describe('status reporting', () => {
    it('should report correct lifecycle status', () => {
      mockAppStateManager.getTimeSinceActive.mockReturnValue(5000);
      mockAppStateManager.getTimeSinceBackground.mockReturnValue(10000);

      scheduler.start(testStore);

      const status = scheduler.getStatus();
      expect(status.timeSinceActive).toBe(5000);
      expect(status.timeSinceBackground).toBe(10000);
      expect(status.isAppActive).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should cleanup app state manager', () => {
      scheduler.start(testStore);
      scheduler.cleanup();

      expect(mockAppStateManager.cleanup).toHaveBeenCalled();
    });
  });
});
