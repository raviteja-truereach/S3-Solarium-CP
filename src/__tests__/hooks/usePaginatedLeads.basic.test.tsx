/**
 * Basic test for usePaginatedLeads to verify setup
 */

import React from 'react';
import { renderHook } from '@testing-library/react';

// Mock the hook dependencies first
jest.mock('../../contexts/ConnectivityContext', () => ({
  useConnectivity: jest.fn(() => ({ isOnline: true })),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => {
    // Mock selector return values
    if (selector.name === 'selectPaginatedLeads') return [];
    if (selector.name === 'selectPaginationMeta')
      return {
        pagesLoaded: [],
        totalPages: 0,
        totalCount: 0,
        loadingNext: false,
        hasMore: true,
        isPageLoaded: () => false,
      };
    if (selector.name === 'selectPaginationLoading')
      return {
        isLoading: false,
        loadingNext: false,
        isAnyLoading: false,
      };
    if (selector.name === 'selectCanLoadMore') return true;
    return null;
  }),
  useDispatch: jest.fn(() => jest.fn()),
}));

jest.mock('../../store/api/leadApi', () => ({
  leadApi: {
    useLazyGetLeadsQuery: jest.fn(() => [
      jest.fn().mockReturnValue({
        unwrap: jest.fn().mockResolvedValue({
          items: [],
          totalCount: 0,
          page: 1,
          totalPages: 1,
        }),
      }),
      {
        isLoading: false,
        error: null,
        originalArgs: null,
      },
    ]),
  },
}));

describe('usePaginatedLeads Basic Test', () => {
  it('should be importable and renderable', async () => {
    // Dynamic import to avoid module loading issues
    const { usePaginatedLeads } = await import('../../hooks/usePaginatedLeads');

    const { result } = renderHook(() => usePaginatedLeads());

    expect(result.current).toBeDefined();
    expect(typeof result.current.loadNext).toBe('function');
    expect(typeof result.current.reload).toBe('function');
    expect(Array.isArray(result.current.items)).toBe(true);
  });
});
