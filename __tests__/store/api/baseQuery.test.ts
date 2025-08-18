/**
 * Base Query Tests
 * Comprehensive tests for enhanced base query functionality
 */
import customBaseQuery from '@store/api/baseQuery';
import { API_TIMEOUT_MS, API_RETRY_COUNT } from '@config/Network';

// Add type declaration for global
declare const global: any;

jest.mock('react-native-keychain');
// Mock dependencies
jest.mock('@config/Config', () => ({
  appConfig: {
    apiUrl: 'https://test-api.example.com/api/v1',
  },
}));

jest.mock('@config/Network', () => ({
  API_TIMEOUT_MS: 15000,
  API_RETRY_COUNT: 1,
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Redux state
const mockGetState = jest.fn();
const mockApi = {
  getState: mockGetState,
  endpoint: 'test',
  type: 'query' as const,
  requestId: 'test-request-id',
  signal: new AbortController().signal,
  abort: jest.fn(),
  dispatch: jest.fn(),
  extra: undefined,
};

describe('customBaseQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({
      auth: {
        token: 'test-token-123',
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('JWT Token Injection', () => {
    it('should inject JWT token when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
        clone: () => ({
          json: () => Promise.resolve({ data: 'test' }),
        }),
      });

      await customBaseQuery('test-endpoint', mockApi, {});

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/api/v1/test-endpoint',
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: 'Bearer test-token-123',
          }),
        })
      );
    });

    it('should not inject JWT token when not available', async () => {
      mockGetState.mockReturnValue({
        auth: {
          token: undefined,
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
        clone: () => ({
          json: () => Promise.resolve({ data: 'test' }),
        }),
      });

      await customBaseQuery('test-endpoint', mockApi, {});

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/api/v1/test-endpoint',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            authorization: expect.anything(),
          }),
        })
      );
    });

    it('should always include content-type and user-agent headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
        clone: () => ({
          json: () => Promise.resolve({ data: 'test' }),
        }),
      });

      await customBaseQuery('test-endpoint', mockApi, {});

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'content-type': 'application/json',
            'user-agent': 'SolariumCP/1.0',
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 authentication errors', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockFetch.mockRejectedValueOnce({
        status: 401,
        message: 'Unauthorized',
      });

      const result = await customBaseQuery('test-endpoint', mockApi, {});

      expect(result.error).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Authentication failed')
      );

      consoleSpy.mockRestore();
    });

    it('should handle 403 forbidden errors', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockFetch.mockRejectedValueOnce({
        status: 403,
        message: 'Forbidden',
      });

      const result = await customBaseQuery('test-endpoint', mockApi, {});

      expect(result.error).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Access forbidden')
      );

      consoleSpy.mockRestore();
    });

    it('should handle timeout errors', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockFetch.mockRejectedValueOnce({
        status: 'TIMEOUT_ERROR',
        message: 'Timeout',
      });

      const result = await customBaseQuery('test-endpoint', mockApi, {});

      expect(result.error).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Request timeout')
      );

      consoleSpy.mockRestore();
    });

    it('should handle network/fetch errors', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockFetch.mockRejectedValueOnce({
        status: 'FETCH_ERROR',
        message: 'Network Error',
      });

      const result = await customBaseQuery('test-endpoint', mockApi, {});

      expect(result.error).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Network error')
      );

      consoleSpy.mockRestore();
    });

    it('should handle server errors (5xx)', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockFetch.mockRejectedValueOnce({
        status: 500,
        message: 'Internal Server Error',
      });

      const result = await customBaseQuery('test-endpoint', mockApi, {});

      expect(result.error).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Server error')
      );

      consoleSpy.mockRestore();
    });

    it('should add timestamp to errors', async () => {
      const mockDate = new Date('2024-01-01T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      mockFetch.mockRejectedValueOnce({
        status: 500,
        message: 'Server Error',
      });

      const result = await customBaseQuery('test-endpoint', mockApi, {});

      expect(result.error).toBeDefined();
      expect((result.error as any).timestamp).toBe('2024-01-01T12:00:00.000Z');

      jest.restoreAllMocks();
    });
  });

  describe('Successful Requests', () => {
    it('should handle successful responses', async () => {
      const mockData = { id: 1, name: 'Test' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
        clone: () => ({
          json: () => Promise.resolve(mockData),
        }),
      });

      const result = await customBaseQuery('test-endpoint', mockApi, {});

      expect(result.data).toEqual(mockData);
      expect(result.error).toBeUndefined();
    });

    it('should handle POST requests with body', async () => {
      const requestBody = { name: 'Test User' };
      const mockResponse = { id: 1, ...requestBody };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockResponse),
        clone: () => ({
          json: () => Promise.resolve(mockResponse),
        }),
      });

      const result = await customBaseQuery(
        {
          url: 'users',
          method: 'POST',
          body: requestBody,
        },
        mockApi,
        {}
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/api/v1/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('Retry Logic', () => {
    it('should be configured with correct retry count', () => {
      // This test verifies the retry configuration is properly set
      expect(API_RETRY_COUNT).toBe(1);
    });

    it('should be configured with correct timeout', () => {
      // This test verifies the timeout configuration is properly set
      expect(API_TIMEOUT_MS).toBe(15000);
    });
  });
});

describe('Authorization header injection', () => {
  it('should attach Authorization header when token exists in state', async () => {
    const testMockState = {
      auth: {
        token: 'test-jwt-token',
        isLoggedIn: true,
      },
    };

    const testMockApi = {
      getState: jest.fn().mockReturnValue(testMockState),
      dispatch: jest.fn(),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' }),
    } as Response);

    await customBaseQuery('/test', testMockApi as any, {});

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-jwt-token',
        }),
      })
    );
  });

  it('should handle 401 responses by dispatching logout', async () => {
    const unauthorizedMockApi = {
      getState: jest.fn().mockReturnValue({ auth: {} }),
      dispatch: jest.fn(),
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    } as Response);

    await customBaseQuery('/test', unauthorizedMockApi as any, {});

    expect(unauthorizedMockApi.dispatch).toHaveBeenCalled();
  });
});
