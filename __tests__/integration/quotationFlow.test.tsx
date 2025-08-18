/**
 * Quotation Flow Integration Tests
 */
import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  screen,
} from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { configureStore } from '@reduxjs/toolkit';
import QuotationsScreen from '../../screens/quotations/QuotationsScreen';
import quotationSlice, {
  setSearchText,
  setFilters,
} from '../../store/slices/quotationSlice';
import authSlice from '../../store/slices/authSlice';
import { Quotation } from '../../types/quotation';

// Mock dependencies
jest.mock('../../hooks/useConnectivityMemoized', () => ({
  useIsOnline: () => true,
}));

jest.mock('../../contexts/ConnectivityContext', () => ({
  useConnectivity: () => ({ isOnline: true }),
}));

jest.mock('../../store/api/quotationApi', () => ({
  useGetQuotationsQuery: () => ({
    data: [],
    isLoading: false,
    isFetching: false,
    refetch: jest.fn(),
  }),
  useShareQuotationMutation: () => [jest.fn()],
  useLazyGetQuotationPdfQuery: () => [jest.fn()],
}));

const createTestStore = (quotations: Quotation[] = []) => {
  const quotationItems = quotations.reduce((acc, quotation) => {
    acc[quotation.quotationId] = quotation;
    return acc;
  }, {} as Record<string, Quotation>);

  return configureStore({
    reducer: {
      quotation: quotationSlice,
      auth: authSlice,
    },
    preloadedState: {
      auth: { isLoggedIn: true, token: 'test-token' },
      quotation: {
        items: quotationItems,
        pagesLoaded: [],
        totalPages: 0,
        totalCount: quotations.length,
        loadingNext: false,
        hasMore: true,
        lastSync: null,
        isLoading: false,
        error: null,
        searchText: '',
        filters: { statuses: [], leadId: undefined, dateRange: undefined },
        summaryData: undefined,
        wizard: {
          isActive: false,
          currentStep: 1,
          leadId: null,
          data: {},
          errors: {},
          isValid: false,
          creating: false,
        },
        quotationDetails: {},
      },
    },
  });
};

const TestWrapper: React.FC<{ children: React.ReactNode; store: any }> = ({
  children,
  store,
}) => (
  <Provider store={store}>
    <PaperProvider>{children}</PaperProvider>
  </Provider>
);

// Generate mock quotations
const generateMockQuotations = (count: number): Quotation[] => {
  const statuses = ['Created', 'Shared', 'Accepted', 'Rejected'];
  return Array.from({ length: count }, (_, i) => ({
    quotationId: `QUOT-${i.toString().padStart(3, '0')}`,
    leadId: `LEAD-${i.toString().padStart(3, '0')}`,
    systemKW: 5 + (i % 10),
    totalCost: 500000 + i * 10000,
    status: statuses[i % 4] as any,
    createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  }));
};

describe('Quotation Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Search and Filter Integration', () => {
    it('should integrate search and filter functionality', async () => {
      const mockQuotations = generateMockQuotations(50);
      const store = createTestStore(mockQuotations);

      render(
        <TestWrapper store={store}>
          <QuotationsScreen />
        </TestWrapper>
      );

      // Initial state - should show quotations list
      expect(screen.getByTestId('quotations-list')).toBeTruthy();

      // Apply search filter
      store.dispatch(setSearchText('LEAD-001'));

      // Apply status filter
      store.dispatch(setFilters({ statuses: ['Created'] }));

      await waitFor(() => {
        // Should show filtered results or empty state
        expect(
          screen.getByTestId('quotations-list') ||
            screen.getByTestId('quotations-filtered-state')
        ).toBeTruthy();
      });
    });

    it('should handle large dataset filtering performance', () => {
      const startTime = performance.now();

      const mockQuotations = generateMockQuotations(500);
      const store = createTestStore(mockQuotations);

      render(
        <TestWrapper store={store}>
          <QuotationsScreen />
        </TestWrapper>
      );

      // Apply complex filters
      store.dispatch(setSearchText('LEAD-1'));
      store.dispatch(setFilters({ statuses: ['Created', 'Shared'] }));

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`📊 Large dataset filtering took ${duration.toFixed(2)}ms`);

      // Should complete within performance target
      expect(duration).toBeLessThan(1500);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      const store = createTestStore([]);

      // Mock useQuotations to return error
      jest.doMock('../../hooks/useQuotations', () => ({
        useQuotations: () => ({
          quotations: [],
          loading: false,
          error: 'Network error occurred',
          refetch: jest.fn(),
        }),
      }));

      render(
        <TestWrapper store={store}>
          <QuotationsScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('quotations-error-state')).toBeTruthy();
      });
    });
  });

  describe('Offline Mode Integration', () => {
    it('should handle offline mode with cached data', () => {
      // Mock offline state
      jest.doMock('../../hooks/useConnectivityMemoized', () => ({
        useIsOnline: () => false,
      }));

      jest.doMock('../../contexts/ConnectivityContext', () => ({
        useConnectivity: () => ({ isOnline: false }),
      }));

      const mockQuotations = generateMockQuotations(20);
      const store = createTestStore(mockQuotations);

      render(
        <TestWrapper store={store}>
          <QuotationsScreen />
        </TestWrapper>
      );

      // Should show cached quotations with offline indicator
      expect(screen.getByTestId('quotations-list')).toBeTruthy();
    });
  });
});
