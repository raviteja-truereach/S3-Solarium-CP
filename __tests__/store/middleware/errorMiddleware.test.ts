/**
 * Error Middleware Tests
 */
import { errorMiddleware } from '@store/middleware/errorMiddleware';
import { logout } from '@store/slices/authSlice';
import Toast from 'react-native-toast-message';
import * as navigationRef from '@navigation/navigationRef';

// Mock dependencies
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

jest.mock('@navigation/navigationRef', () => ({
  resetToRoute: jest.fn(),
}));

jest.mock('@store/slices/authSlice', () => ({
  logout: jest.fn(() => ({ type: 'auth/logout' })),
}));

// Mock console.warn to avoid noise in tests
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('errorMiddleware', () => {
  let store: any;
  let next: jest.Mock;

  beforeEach(() => {
    store = {
      dispatch: jest.fn(),
      getState: jest.fn(() => ({
        auth: { token: 'test-token' },
      })),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleWarn.mockRestore();
    mockConsoleLog.mockRestore();
  });

  const createRejectedAction = (status: number | string) => ({
    type: 'baseApi/executeQuery/rejected',
    payload: {
      error: {
        status,
        data: { message: 'Test error' },
      },
    },
    meta: {
      arg: {
        endpointName: 'testEndpoint',
      },
    },
  });

  it('should pass through non-error actions unchanged', () => {
    const action = { type: 'some/action', payload: {} };
    const middleware = errorMiddleware(store)(next);

    middleware(action);

    expect(next).toHaveBeenCalledWith(action);
    expect(Toast.show).not.toHaveBeenCalled();
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('should handle 401 errors with auto-logout', async () => {
    const action = createRejectedAction(401);
    const middleware = errorMiddleware(store)(next);

    middleware(action);

    expect(next).toHaveBeenCalledWith(action);
    expect(store.dispatch).toHaveBeenCalledWith(logout());
    expect(Toast.show).toHaveBeenCalledWith({
      type: 'error',
      text1: 'Session Expired',
      text2: 'You have been logged out. Please sign in again.',
      visibilityTime: 4000,
      autoHide: true,
      position: 'top',
    });

    // Wait for setTimeout to execute
    await new Promise<void>((resolve) => setTimeout(resolve, 150));
    expect(navigationRef.resetToRoute).toHaveBeenCalledWith('Auth');
  });

  it('should handle 403 errors with auto-logout', async () => {
    const action = createRejectedAction(403);
    const middleware = errorMiddleware(store)(next);

    middleware(action);

    expect(store.dispatch).toHaveBeenCalledWith(logout());
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        text1: 'Session Expired',
      })
    );
  });

  it('should handle other errors with toast only', () => {
    const action = createRejectedAction(500);
    const middleware = errorMiddleware(store)(next);

    middleware(action);

    expect(next).toHaveBeenCalledWith(action);
    expect(store.dispatch).not.toHaveBeenCalledWith(logout());
    expect(Toast.show).toHaveBeenCalledWith({
      type: 'error',
      text1: 'Error',
      text2: 'Something went wrong on our end. Please try again later.',
      visibilityTime: 3000,
      autoHide: true,
      position: 'top',
    });
  });

  it('should handle network errors with toast', () => {
    const action = createRejectedAction('FETCH_ERROR');
    const middleware = errorMiddleware(store)(next);

    middleware(action);

    expect(Toast.show).toHaveBeenCalledWith({
      type: 'error',
      text1: 'Error',
      text2: 'Network error. Please check your internet connection.',
      visibilityTime: 3000,
      autoHide: true,
      position: 'top',
    });
  });

  it('should log error details for debugging', () => {
    const action = createRejectedAction(500);
    const middleware = errorMiddleware(store)(next);

    middleware(action);

    expect(mockConsoleWarn).toHaveBeenCalledWith(
      'RTK Query Error:',
      expect.objectContaining({
        endpoint: 'testEndpoint',
        status: 500,
        error: { message: 'Test error' },
        timestamp: expect.any(String),
      })
    );
  });

  it('should handle missing meta information gracefully', () => {
    const actionWithoutMeta = {
      type: 'baseApi/executeQuery/rejected',
      payload: {
        error: {
          status: 400,
          data: { message: 'Test error' },
        },
      },
    };

    const middleware = errorMiddleware(store)(next);

    expect(() => middleware(actionWithoutMeta)).not.toThrow();
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      'RTK Query Error:',
      expect.objectContaining({
        endpoint: 'unknown',
      })
    );
  });
});
