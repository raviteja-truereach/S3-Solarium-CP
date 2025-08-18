/**
 * Services API Tests
 * Tests for services API endpoints and data handling
 */
import { renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { store } from '../../src/store/store';
import { useGetActiveServicesQuery } from '../../src/store/api/servicesApi';

// Mock fetch
global.fetch = jest.fn();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>{children}</Provider>
);

describe('Services API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useGetActiveServicesQuery', () => {
    it('should fetch active services successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          items: [
            {
              serviceId: 'SRV001',
              name: 'Solar Rooftop Installation',
              type: 'Installation',
              description: 'Complete solar rooftop installation',
              status: 'Active',
            },
          ],
          total: 1,
          offset: 0,
          limit: 25,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useGetActiveServicesQuery({}), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeFalsy();
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useGetActiveServicesQuery({}), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBeFalsy();
      expect(result.current.isLoading).toBe(false);
    });

    it('should use correct API endpoint with parameters', async () => {
      const mockResponse = { success: true, data: { items: [] } };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      renderHook(
        () =>
          useGetActiveServicesQuery({
            status: 'Active',
            offset: 10,
            limit: 50,
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(
            '/api/v1/services?status=Active&offset=10&limit=50'
          ),
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              Authorization: expect.stringContaining('Bearer'),
            }),
          })
        );
      });
    });

    it('should cache results correctly', async () => {
      const mockResponse = { success: true, data: { items: [] } };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      // First call
      const { result: result1, unmount: unmount1 } = renderHook(
        () => useGetActiveServicesQuery({}),
        { wrapper }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      unmount1();

      // Second call with same parameters - should use cache
      const { result: result2 } = renderHook(
        () => useGetActiveServicesQuery({}),
        { wrapper }
      );

      // Should have data immediately from cache
      expect(result2.current.data).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only called once due to caching
    });
  });
});
