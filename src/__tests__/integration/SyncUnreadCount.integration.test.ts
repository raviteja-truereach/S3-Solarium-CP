import { configureStore } from '@reduxjs/toolkit';
import { SyncManager } from '../../services/SyncManager';
import networkSlice, {
  selectUnreadCount,
  selectLastSyncTs,
} from '../../store/slices/networkSlice';

// Mock fetchWithRetry
jest.mock('../../services/api', () => ({
  fetchWithRetry: jest.fn(),
}));

describe('SyncManager - Unread Count Integration', () => {
  let store: any;
  let syncManager: SyncManager;
  let mockFetchWithRetry: jest.MockedFunction<any>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        network: networkSlice,
      },
    });

    syncManager = new SyncManager(store);
    mockFetchWithRetry = require('../../services/api').fetchWithRetry;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should update unread count after successful sync', async () => {
    // Mock notifications API response
    mockFetchWithRetry.mockResolvedValueOnce({
      success: true,
      data: {
        data: [
          { id: '1', title: 'Test 1', isRead: false },
          { id: '2', title: 'Test 2', isRead: false },
          { id: '3', title: 'Test 3', isRead: false },
        ],
      },
    });

    // Mock other API calls to succeed
    mockFetchWithRetry.mockResolvedValue({ success: true, data: [] });

    await syncManager.manualSync();

    const state = store.getState();
    const unreadCount = selectUnreadCount(state);
    const lastSyncTs = selectLastSyncTs(state);

    expect(unreadCount).toBe(3);
    expect(lastSyncTs).toBeDefined();
    expect(new Date(lastSyncTs!).getTime()).toBeCloseTo(Date.now(), -1000); // Within 1 second
  });

  it('should handle notifications API failure gracefully', async () => {
    // Mock notifications API to fail
    mockFetchWithRetry.mockRejectedValueOnce(
      new Error('Notifications API failed')
    );

    // Mock other API calls to succeed
    mockFetchWithRetry.mockResolvedValue({ success: true, data: [] });

    await syncManager.manualSync();

    const state = store.getState();
    const unreadCount = selectUnreadCount(state);

    // Should not update unread count on API failure, keep previous value (0)
    expect(unreadCount).toBe(0);
  });
});
