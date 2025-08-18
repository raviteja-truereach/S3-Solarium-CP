/**
 * useLeadById Hook Comprehensive Tests
 * Complete testing for all hook scenarios including edge cases
 */
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import React from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useLeadById } from '@hooks/useLeadById';
import { store } from '@store/store';
import type { Lead } from '@types/lead';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(),
}));

// Mock database
const mockDatabase = {
  leadDao: {
    findById: jest.fn(),
  },
};

jest.mock('@hooks/useDatabase', () => ({
  useDatabase: () => ({ database: mockDatabase }),
}));

// Mock RTK Query
jest.mock('@store/api/leadApi', () => ({
  useGetLeadByIdQuery: jest.fn(),
}));

import { useGetLeadByIdQuery } from '@store/api/leadApi';

const mockApiResponse = {
  leadId: 'LEAD-123',
  customerName: 'John Doe',
  phone: '+1234567890',
  address: 'A-12, Shanti Nagar, Borivali West, Mumbai',
  status: 'Hot Lead',
  followUpDate: '2024-01-28T10:00:00Z',
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-10T10:00:00Z',
  services: ['SRV003'],
  assignedTo: 'CP-001',
  remarks: 'Test remarks',
  documents: [],
  quotations: [],
};

const mockLead: Lead = {
  id: 'LEAD-123',
  customerName: 'John Doe',
  phone: '+1234567890',
  email: null,
  address: 'A-12, Shanti Nagar, Borivali West',
  city: 'Mumbai',
  state: 'Maharashtra',
  pinCode: null,
  status: 'Hot Lead',
  nextFollowUpDate: '2024-01-28T10:00:00Z',
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-10T10:00:00Z',
  services: ['SRV003'],
  assignedTo: 'CP-001',
  remarks: 'Test remarks',
  documents: [],
  quotations: [],
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>{children}</Provider>
);

describe('useLeadById - Comprehensive Tests', () => {
  const mockNetInfoListener = jest.fn();
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup NetInfo mock
    (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
      callback({ isConnected: true, isInternetReachable: true });
      return mockNetInfoListener;
    });

    // Setup RTK Query mock defaults
    (useGetLeadByIdQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    // Setup database mock defaults
    mockDatabase.leadDao.findById.mockResolvedValue(mockLead);
  });

  describe('API Success Scenarios', () => {
    it('should return transformed API data when online', async () => {
      (useGetLeadByIdQuery as jest.Mock).mockReturnValue({
        data: mockApiResponse,
        isLoading: false,
        error: undefined,
        refetch: mockRefetch,
      });

      const { result } = renderHook(() => useLeadById('LEAD-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.lead).toEqual(
          expect.objectContaining({
            id: 'LEAD-123',
            customerName: 'John Doe',
            city: 'Mumbai',
            nextFollowUpDate: '2024-01-28T10:00:00Z',
          })
        );
        expect(result.current.source).toBe('api');
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeUndefined();
      });
    });

    it('should handle API loading state', () => {
      (useGetLeadByIdQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: undefined,
        refetch: mockRefetch,
      });

      const { result } = renderHook(() => useLeadById('LEAD-123'), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.source).toBe('api');
      expect(result.current.lead).toBeUndefined();
    });

    it('should handle API data with missing fields', async () => {
      const incompleteApiResponse = {
        ...mockApiResponse,
        address: '', // Empty address
        followUpDate: null, // No follow-up date
      };

      (useGetLeadByIdQuery as jest.Mock).mockReturnValue({
        data: incompleteApiResponse,
        isLoading: false,
        error: undefined,
        refetch: mockRefetch,
      });

      const { result } = renderHook(() => useLeadById('LEAD-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.lead).toEqual(
          expect.objectContaining({
            address: '',
            nextFollowUpDate: null,
          })
        );
      });
    });
  });

  describe('Address Parsing Coverage', () => {
    const addressTestCases = [
      {
        input: 'A-12, Shanti Nagar, Borivali West, Mumbai',
        expected: {
          city: 'Mumbai',
          address: 'A-12, Shanti Nagar, Borivali West',
        },
      },
      {
        input: 'B-45, Sector 21, Noida, Uttar Pradesh, 201301',
        expected: { city: 'Noida', state: 'Uttar Pradesh', pinCode: '201301' },
      },
      {
        input: 'Plot 123, Hitech City, Hyderabad, Telangana',
        expected: { city: 'Hyderabad', state: 'Telangana' },
      },
      {
        input: 'Simple Address',
        expected: { city: null, state: null, pinCode: null },
      },
    ];

    addressTestCases.forEach(({ input, expected }) => {
      it(`should parse address: ${input}`, async () => {
        const testApiResponse = {
          ...mockApiResponse,
          address: input,
        };

        (useGetLeadByIdQuery as jest.Mock).mockReturnValue({
          data: testApiResponse,
          isLoading: false,
          error: undefined,
          refetch: mockRefetch,
        });

        const { result } = renderHook(() => useLeadById('LEAD-123'), {
          wrapper,
        });

        await waitFor(() => {
          expect(result.current.lead).toEqual(
            expect.objectContaining(expected)
          );
        });
      });
    });
  });

  describe('Offline Cache Scenarios', () => {
    beforeEach(() => {
      // Simulate offline
      (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
        callback({ isConnected: false, isInternetReachable: false });
        return mockNetInfoListener;
      });
    });

    it('should fallback to cache when offline', async () => {
      const { result } = renderHook(() => useLeadById('LEAD-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.lead).toEqual(mockLead);
        expect(result.current.source).toBe('cache');
        expect(mockDatabase.leadDao.findById).toHaveBeenCalledWith('LEAD-123');
      });
    });

    it('should handle cache loading state', async () => {
      const { result } = renderHook(() => useLeadById('LEAD-123'), { wrapper });

      // Should show loading initially
      expect(result.current.loading).toBe(true);
      expect(result.current.source).toBe('cache');
    });

    it('should handle cache miss', async () => {
      mockDatabase.leadDao.findById.mockResolvedValue(null);

      const { result } = renderHook(() => useLeadById('LEAD-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBe('cache-miss');
        expect(result.current.source).toBe('cache');
      });
    });

    it('should handle cache database errors', async () => {
      const cacheError = new Error('Database connection failed');
      mockDatabase.leadDao.findById.mockRejectedValue(cacheError);

      const { result } = renderHook(() => useLeadById('LEAD-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.source).toBe('cache');
      });
    });

    it('should measure cache performance', async () => {
      const startTime = Date.now();

      const { result } = renderHook(() => useLeadById('LEAD-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.lead).toBeDefined();
      });

      const endTime = Date.now();
      const loadTime = endTime - startTime;

      expect(loadTime).toBeLessThan(800); // Performance requirement
    });
  });

  describe('API Error Scenarios', () => {
    const errorTestCases = [
      { status: 400, shouldFallback: false },
      { status: 404, shouldFallback: false },
      { status: 500, shouldFallback: true },
      { status: 502, shouldFallback: true },
      { status: 503, shouldFallback: true },
      { name: 'NetworkError', shouldFallback: true },
      { code: 'NETWORK_ERROR', shouldFallback: true },
    ];

    errorTestCases.forEach(({ shouldFallback, ...errorProps }) => {
      it(`should ${
        shouldFallback ? 'fallback to cache' : 'return error'
      } for ${JSON.stringify(errorProps)}`, async () => {
        (useGetLeadByIdQuery as jest.Mock).mockReturnValue({
          data: undefined,
          isLoading: false,
          error: errorProps,
          refetch: mockRefetch,
        });

        const { result } = renderHook(() => useLeadById('LEAD-123'), {
          wrapper,
        });

        await waitFor(() => {
          if (shouldFallback) {
            expect(result.current.source).toBe('cache');
            expect(result.current.lead).toEqual(mockLead);
          } else {
            expect(result.current.source).toBe('api');
            expect(result.current.error).toEqual(errorProps);
          }
        });
      });
    });
  });

  describe('Network State Transitions', () => {
    it('should handle online to offline transition', async () => {
      let networkCallback: (state: any) => void;

      (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
        networkCallback = callback;
        callback({ isConnected: true, isInternetReachable: true });
        return mockNetInfoListener;
      });

      const { result } = renderHook(() => useLeadById('LEAD-123'), { wrapper });

      // Start online
      expect(result.current.source).toBe('api');

      // Go offline
      act(() => {
        networkCallback({ isConnected: false, isInternetReachable: false });
      });

      await waitFor(() => {
        expect(result.current.source).toBe('cache');
      });
    });

    it('should handle offline to online transition', async () => {
      let networkCallback: (state: any) => void;

      (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
        networkCallback = callback;
        callback({ isConnected: false, isInternetReachable: false });
        return mockNetInfoListener;
      });

      const { result } = renderHook(() => useLeadById('LEAD-123'), { wrapper });

      // Start offline
      await waitFor(() => {
        expect(result.current.source).toBe('cache');
      });

      // Go online
      act(() => {
        networkCallback({ isConnected: true, isInternetReachable: true });
      });

      // Should trigger API refetch
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Retry Logic Coverage', () => {
    it('should debounce retry calls', async () => {
      const { result } = renderHook(() => useLeadById('LEAD-123'), { wrapper });

      // Call retry multiple times quickly
      act(() => {
        result.current.onRetry();
        result.current.onRetry();
        result.current.onRetry();
      });

      // Should only trigger once due to debouncing
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalledTimes(1);
      });
    });

    it('should allow retry after debounce period', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useLeadById('LEAD-123'), { wrapper });

      // First retry
      act(() => {
        result.current.onRetry();
      });

      // Advance time past debounce period
      act(() => {
        jest.advanceTimersByTime(2500);
      });

      // Second retry should work
      act(() => {
        result.current.onRetry();
      });

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });

    it('should retry cache fetch when offline', async () => {
      // Start offline
      (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
        callback({ isConnected: false, isInternetReachable: false });
        return mockNetInfoListener;
      });

      mockDatabase.leadDao.findById.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useLeadById('LEAD-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBe('cache-miss');
      });

      // Mock successful retry
      mockDatabase.leadDao.findById.mockResolvedValueOnce(mockLead);

      act(() => {
        result.current.onRetry();
      });

      await waitFor(() => {
        expect(result.current.lead).toEqual(mockLead);
        expect(mockDatabase.leadDao.findById).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Hook Options Coverage', () => {
    it('should skip query when skip option is true', () => {
      renderHook(() => useLeadById('LEAD-123', { skip: true }), { wrapper });

      expect(useGetLeadByIdQuery).toHaveBeenCalledWith(
        'LEAD-123',
        expect.objectContaining({ skip: true })
      );
    });

    it('should use polling interval when provided', () => {
      renderHook(() => useLeadById('LEAD-123', { pollingInterval: 5000 }), {
        wrapper,
      });

      expect(useGetLeadByIdQuery).toHaveBeenCalledWith(
        'LEAD-123',
        expect.objectContaining({ pollingInterval: 5000 })
      );
    });

    it('should handle multiple instances of the hook', async () => {
      const { result: result1 } = renderHook(() => useLeadById('LEAD-123'), {
        wrapper,
      });
      const { result: result2 } = renderHook(() => useLeadById('LEAD-456'), {
        wrapper,
      });

      expect(result1.current.onRetry).toBeDefined();
      expect(result2.current.onRetry).toBeDefined();
      expect(result1.current.onRetry).not.toBe(result2.current.onRetry);
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useLeadById('LEAD-123'), {
        wrapper,
      });

      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid mount/unmount cycles', () => {
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderHook(() => useLeadById(`LEAD-${i}`), {
          wrapper,
        });
        unmount();
      }

      expect(true).toBeTruthy(); // Should complete without errors
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid leadId', async () => {
      const { result } = renderHook(() => useLeadById(''), { wrapper });

      expect(result.current.lead).toBeUndefined();
    });

    it('should handle database unavailability', async () => {
      // Mock database as null
      jest.doMock('@hooks/useDatabase', () => ({
        useDatabase: () => ({ database: null }),
      }));

      (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
        callback({ isConnected: false, isInternetReachable: false });
        return mockNetInfoListener;
      });

      const { result } = renderHook(() => useLeadById('LEAD-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBe('cache-miss');
      });
    });

    it('should handle malformed API responses', async () => {
      const malformedResponse = {
        leadId: 'LEAD-123',
        // Missing required fields
      };

      (useGetLeadByIdQuery as jest.Mock).mockReturnValue({
        data: malformedResponse,
        isLoading: false,
        error: undefined,
        refetch: mockRefetch,
      });

      const { result } = renderHook(() => useLeadById('LEAD-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.lead).toBeDefined();
        expect(result.current.lead?.customerName).toBeUndefined();
      });
    });
  });
});
