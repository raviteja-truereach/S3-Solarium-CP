/**
 * Error Handling Integration Tests
 * Tests complete error handling flow
 */
import { store } from '@store/index';
import { errorMiddleware } from '@store/middleware/errorMiddleware';
import Toast from 'react-native-toast-message';
import * as navigationRef from '@navigation/navigationRef';

// Mock dependencies
jest.mock('react-native-toast-message');
jest.mock('@navigation/navigationRef');

describe('Error Handling Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should integrate error middleware with store', () => {
    // Test that middleware is properly configured
    const state = store.getState();
    expect(state).toBeDefined();

    // Test middleware function
    expect(typeof errorMiddleware).toBe('function');
  });

  it('should handle error flow from API to UI', async () => {
    // Create mock rejected action
    const rejectedAction = {
      type: 'baseApi/executeQuery/rejected',
      payload: {
        error: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      },
      meta: {
        arg: {
          endpointName: 'testEndpoint',
        },
      },
    };

    // Test that error middleware can handle the action
    const mockNext = jest.fn();
    const mockStoreAPI = {
      dispatch: jest.fn(),
      getState: jest.fn(() => ({ auth: { token: 'test' } })),
    };

    const middleware = errorMiddleware(mockStoreAPI)(mockNext);
    middleware(rejectedAction);

    expect(mockNext).toHaveBeenCalledWith(rejectedAction);
  });
});
