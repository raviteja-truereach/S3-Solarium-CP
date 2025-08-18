/**
 * Network Configuration Tests
 * Unit tests for network configuration constants
 */
import {
  API_TIMEOUT_MS,
  API_RETRY_COUNT,
  networkConfig,
} from '@config/Network';

// Mock the Config module
jest.mock('@config/Config', () => ({
  getConfigValue: jest.fn((key: string, fallback: string) => {
    const mockValues: Record<string, string> = {
      REACT_APP_API_TIMEOUT: '20000',
      REACT_APP_API_RETRY: '2',
    };
    return mockValues[key] || fallback;
  }),
}));

describe('Network Configuration', () => {
  it('should have correct default timeout value', () => {
    expect(API_TIMEOUT_MS).toBe(20000); // From mock
  });

  it('should have correct default retry count', () => {
    expect(API_RETRY_COUNT).toBe(2); // From mock
  });

  it('should export network config object', () => {
    expect(networkConfig).toEqual({
      timeout: 20000,
      retryCount: 2,
    });
  });

  it('should handle numeric conversion correctly', () => {
    expect(typeof API_TIMEOUT_MS).toBe('number');
    expect(typeof API_RETRY_COUNT).toBe('number');
  });
});
