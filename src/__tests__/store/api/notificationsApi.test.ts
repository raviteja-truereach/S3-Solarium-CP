import { setupApiStore } from '../../utils/test-utils';
import { notificationsApi } from '../../../store/api/notificationsApi';

describe('notificationsApi', () => {
  let store: any;

  beforeEach(() => {
    store = setupApiStore(notificationsApi);
  });

  afterEach(() => {
    store.store.dispatch(notificationsApi.util.resetApiState());
  });

  describe('getUnreadNotifications', () => {
    it('should fetch unread notifications successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            title: 'Test',
            message: 'Test message',
            isRead: false,
            createdAt: '2024-01-01',
          },
          {
            id: '2',
            title: 'Test 2',
            message: 'Test message 2',
            isRead: false,
            createdAt: '2024-01-02',
          },
        ],
        total: 2,
        unreadCount: 2,
      };

      // Mock successful API response
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await store.store.dispatch(
        notificationsApi.endpoints.getUnreadNotifications.initiate({
          unreadOnly: true,
        })
      );

      expect(result.data).toEqual(mockResponse);
      expect(result.data?.data).toHaveLength(2);
      expect(result.data?.unreadCount).toBe(2);
    });

    it('should handle API error gracefully', async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await store.store.dispatch(
        notificationsApi.endpoints.getUnreadNotifications.initiate({
          unreadOnly: true,
        })
      );

      expect(result.error).toBeDefined();
    });
  });
});
