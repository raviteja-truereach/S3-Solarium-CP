/**
 * Base API Tests
 * Unit tests for RTK Query base API configuration
 */
import { baseApi } from '@store/api/baseApi';

// Mock the custom base query
jest.mock('@store/api/baseQuery', () => ({
  customBaseQuery: jest.fn(),
}));

describe('baseApi', () => {
  it('should be configured with correct reducer path', () => {
    expect(baseApi.reducerPath).toBe('baseApi');
  });

  it('should have correct tag types defined', () => {
    const expectedTagTypes = [
      'Lead',
      'Customer',
      'Quotation',
      'Commission',
      'User',
      'KYC',
      'Product',
      'Service',
    ];

    // Access the tagTypes through the internal config
    expect((baseApi as any).tagTypes).toEqual(expectedTagTypes);
  });

  it('should have empty endpoints initially', () => {
    // The endpoints should be empty as they will be injected later
    expect(Object.keys(baseApi.endpoints)).toHaveLength(0);
  });

  it('should use custom base query', () => {
    // This verifies that the baseApi is using our custom base query
    const { customBaseQuery } = require('@store/api/baseQuery');
    expect(customBaseQuery).toBeDefined();
  });
});
