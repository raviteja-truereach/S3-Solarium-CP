import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppStateManager } from '../../src/utils/AppStateManager';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock AppState
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

describe('AppStateManager', () => {
  let appStateManager: AppStateManager;
  let mockAsyncStorage: jest.Mocked<typeof AsyncStorage>;
  let mockAppState: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockAppState = AppState as any;

    // Reset singleton
    (AppStateManager as any).instance = null;

    // Mock AsyncStorage.getItem to return null (no persisted state)
    mockAsyncStorage.getItem.mockResolvedValue(null);

    appStateManager = AppStateManager.getInstance();
  });

  afterEach(() => {
    appStateManager.cleanup();
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = AppStateManager.getInstance();
      const instance2 = AppStateManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('state tracking', () => {
    it('should track current state', () => {
      mockAppState.currentState = 'active';
      const manager = AppStateManager.getInstance();

      expect(manager.getCurrentState()).toBe('active');
      expect(manager.isActive()).toBe(true);
    });

    it('should detect when app is not active', () => {
      mockAppState.currentState = 'background';

      // Create new instance to pick up background state
      appStateManager.cleanup();
      appStateManager = AppStateManager.getInstance();

      expect(appStateManager.isActive()).toBe(false);
    });
  });

  describe('listeners', () => {
    it('should add and notify listeners', () => {
      const listener = jest.fn();
      const unsubscribe = appStateManager.addListener(listener);

      // Simulate app state change
      const changeHandler = mockAppState.addEventListener.mock.calls[0][1];
      changeHandler('background');

      expect(listener).toHaveBeenCalledWith('background');

      // Test unsubscribe
      unsubscribe();
      changeHandler('active');

      // Should not be called again after unsubscribe
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();

      appStateManager.addListener(errorListener);
      appStateManager.addListener(goodListener);

      // Should not throw when listener errors
      const changeHandler = mockAppState.addEventListener.mock.calls[0][1];
      expect(() => changeHandler('background')).not.toThrow();

      // Good listener should still be called
      expect(goodListener).toHaveBeenCalledWith('background');
    });
  });

  describe('time tracking', () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should track time since active', () => {
      const startTime = Date.now();

      // Fast forward 30 seconds
      jest.advanceTimersByTime(30_000);

      const timeSinceActive = appStateManager.getTimeSinceActive();
      expect(timeSinceActive).toBeGreaterThanOrEqual(30_000);
    });

    it('should track background time', () => {
      // Simulate app going to background
      const changeHandler = mockAppState.addEventListener.mock.calls[0][1];
      changeHandler('background');

      // Fast forward 60 seconds
      jest.advanceTimersByTime(60_000);

      const timeSinceBackground = appStateManager.getTimeSinceBackground();
      expect(timeSinceBackground).toBeGreaterThanOrEqual(60_000);
    });

    it('should detect long background duration', () => {
      // Simulate app going to background
      const changeHandler = mockAppState.addEventListener.mock.calls[0][1];
      changeHandler('background');

      // Fast forward 60 seconds (longer than default 30s threshold)
      jest.advanceTimersByTime(60_000);

      expect(appStateManager.wasBackgroundedLongEnough()).toBe(true);
      expect(appStateManager.wasBackgroundedLongEnough(90_000)).toBe(false);
    });
  });

  describe('state persistence', () => {
    it('should persist state changes', async () => {
      const changeHandler = mockAppState.addEventListener.mock.calls[0][1];
      changeHandler('background');

      // Wait for async persistence
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@AppState/lifecycle',
        expect.stringContaining('"currentState":"background"')
      );
    });

    it('should restore persisted state', async () => {
      const persistedData = {
        lastActiveTime: Date.now() - 60_000,
        lastBackgroundTime: Date.now() - 30_000,
        currentState: 'background',
        timestamp: Date.now(),
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(persistedData));

      // Create new instance to trigger restoration
      appStateManager.cleanup();
      appStateManager = AppStateManager.getInstance();

      // Wait for async loading
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(
        '@AppState/lifecycle'
      );
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', () => {
      const mockRemove = jest.fn();
      mockAppState.addEventListener.mockReturnValue({ remove: mockRemove });

      const manager = AppStateManager.getInstance();
      manager.cleanup();

      expect(mockRemove).toHaveBeenCalled();
    });
  });
});
