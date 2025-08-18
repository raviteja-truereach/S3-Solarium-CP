/**
 * QuotationsScreen Unit Tests
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
import QuotationsScreen from '../../../src/screens/quotations/QuotationsScreen';
import quotationSlice from '../../../src/store/slices/quotationSlice';
import authSlice from '../../../src/store/slices/authSlice';
import { Quotation } from '../../../src/types/quotation';

// Mock dependencies
jest.mock('../../../src/hooks/useConnectivityMemoized', () => ({
  useIsOnline: () => true,
}));

jest.mock('../../../src/contexts/ConnectivityContext', () => ({
  useConnectivity: () => ({ isOnline: true }),
}));

jest.mock('../../../src/store/api/quotationApi', () => ({
  useGetQuotationsQuery: () => ({
    data: [],
    isLoading: false,
    isFetching: false,
    refetch: jest.fn(),
  }),
  useShareQuotationMutation: () => [jest.fn()],
  useLazyGetQuotationPdfQuery: () => [jest.fn()],
}));

jest.mock('../../../src/hooks/useQuotations', () => ({
  useQuotations: () => ({
    quotations: [],
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      quotation: quotationSlice,
      auth: authSlice,
    },
    preloadedState: {
      auth: { isLoggedIn: true, token: 'test-token' },
      quotation: {
        items: {},
        pagesLoaded: [],
        totalPages: 0,
        totalCount: 0,
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
      ...initialState,
    },
  });
};

const TestWrapper: React.FC<{ children: React.ReactNode; store?: any }> = ({
  children,
  store = createTestStore(),
}) => (
  <Provider store={store}>
    <PaperProvider>{children}</PaperProvider>
  </Provider>
);

describe('QuotationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      render(
        <TestWrapper>
          <QuotationsScreen />
        </TestWrapper>
      );

      expect(screen.getByTestId('quotation-search-bar')).toBeTruthy();
    });

    it('should show empty state when no quotations exist', () => {
      render(
        <TestWrapper>
          <QuotationsScreen />
        </TestWrapper>
      );

      expect(screen.getByTestId('quotations-default-empty-state')).toBeTruthy();
    });

    it('should render header with quotations title', () => {
      const mockQuotations: Quotation[] = [
        {
          quotationId: 'QUOT-001',
          leadId: 'LEAD-001',
          systemKW: 5,
          totalCost: 500000,
          status: 'Created',
          createdAt: '2023-01-01T00:00:00Z',
        },
      ];

      const store = createTestStore({
        quotation: {
          items: { 'QUOT-001': mockQuotations[0] },
          // ... other state
        },
      });

      render(
        <TestWrapper store={store}>
          <QuotationsScreen />
        </TestWrapper>
      );

      expect(screen.getByText('Quotations')).toBeTruthy();
    });
  });

  describe('Search Functionality', () => {
    it('should handle search input', async () => {
      render(
        <TestWrapper>
          <QuotationsScreen />
        </TestWrapper>
      );

      const searchBar = screen.getByTestId('quotation-search-bar');
      expect(searchBar).toBeTruthy();
    });
  });

  describe('Filter Functionality', () => {
    it('should open filter sheet when filter button is pressed', async () => {
      const mockQuotations: Quotation[] = [
        {
          quotationId: 'QUOT-001',
          leadId: 'LEAD-001',
          systemKW: 5,
          totalCost: 500000,
          status: 'Created',
          createdAt: '2023-01-01T00:00:00Z',
        },
      ];

      const store = createTestStore({
        quotation: {
          items: { 'QUOT-001': mockQuotations[0] },
          // ... other required state
        },
      });

      render(
        <TestWrapper store={store}>
          <QuotationsScreen />
        </TestWrapper>
      );

      const filterButton = screen.getByTestId('filter-button');
      fireEvent.press(filterButton);

      await waitFor(() => {
        expect(screen.getByTestId('quotation-filter-sheet')).toBeTruthy();
      });
    });
  });

  describe('Performance', () => {
    it('should handle large dataset efficiently', () => {
      const mockQuotations: Record<string, Quotation> = {};

      // Generate 100 mock quotations
      for (let i = 0; i < 100; i++) {
        const quotationId = `QUOT-${i.toString().padStart(3, '0')}`;
        mockQuotations[quotationId] = {
          quotationId,
          leadId: `LEAD-${i}`,
          systemKW: 5 + (i % 10),
          totalCost: 500000 + i * 1000,
          status: ['Created', 'Shared', 'Accepted', 'Rejected'][i % 4] as any,
          createdAt: new Date(
            Date.now() - i * 24 * 60 * 60 * 1000
          ).toISOString(),
        };
      }

      const store = createTestStore({
        quotation: {
          items: mockQuotations,
          // ... other state
        },
      });

      const startTime = performance.now();

      render(
        <TestWrapper store={store}>
          <QuotationsScreen />
        </TestWrapper>
      );

      const renderTime = performance.now() - startTime;

      // Should render within performance target
      expect(renderTime).toBeLessThan(1500); // 1.5s target
      expect(screen.getByTestId('quotations-list')).toBeTruthy();
    });
  });
});
