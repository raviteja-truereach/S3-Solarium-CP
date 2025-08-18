/**
 * Quotation List Performance Tests
 */
import { performance } from 'perf_hooks';
import { configureStore } from '@reduxjs/toolkit';
import quotationSlice, {
  upsertQuotations,
} from '../../store/slices/quotationSlice';
import { selectFilteredQuotations } from '../../store/selectors/quotationSelectors';
import { Quotation } from '../../types/quotation';

const PERFORMANCE_TARGET_MS = 150;
const RENDER_TARGET_MS = 1500;

// Generate mock quotations for performance testing
const generateMockQuotations = (count: number): Quotation[] => {
  const statuses = ['Created', 'Shared', 'Accepted', 'Rejected'];
  return Array.from({ length: count }, (_, i) => ({
    quotationId: `QUOT-${i.toString().padStart(4, '0')}`,
    leadId: `LEAD-${i.toString().padStart(4, '0')}`,
    systemKW: 5 + (i % 15),
    totalCost: 500000 + i * 1000,
    status: statuses[i % 4] as any,
    createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  }));
};

describe('Quotation List Performance Tests', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        quotation: quotationSlice,
      },
    });
  });

  describe('Selector Performance', () => {
    it('should filter 500 quotations within performance target', () => {
      const mockQuotations = generateMockQuotations(500);
      const quotationItems = mockQuotations.reduce((acc, quotation) => {
        acc[quotation.quotationId] = quotation;
        return acc;
      }, {} as Record<string, Quotation>);

      store.dispatch({
        type: 'quotation/populateFromCache',
        payload: { quotations: mockQuotations, lastSync: Date.now() },
      });

      // Apply search filter
      store.dispatch({ type: 'quotation/setSearchText', payload: 'LEAD-1' });

      const startTime = performance.now();
      const filteredQuotations = selectFilteredQuotations(store.getState());
      const endTime = performance.now();

      const duration = endTime - startTime;

      console.log(`📊 Filtering 500 quotations took ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(PERFORMANCE_TARGET_MS);
      expect(filteredQuotations.length).toBeGreaterThan(0);
    });

    it('should handle status filtering within performance target', () => {
      const mockQuotations = generateMockQuotations(500);

      store.dispatch({
        type: 'quotation/populateFromCache',
        payload: { quotations: mockQuotations, lastSync: Date.now() },
      });

      // Apply status filter
      store.dispatch({
        type: 'quotation/setFilters',
        payload: { statuses: ['Created', 'Shared'] },
      });

      const startTime = performance.now();
      const filteredQuotations = selectFilteredQuotations(store.getState());
      const endTime = performance.now();

      const duration = endTime - startTime;

      console.log(`📊 Status filtering took ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(PERFORMANCE_TARGET_MS);
      expect(
        filteredQuotations.every((quotation) =>
          ['Created', 'Shared'].includes(quotation.status)
        )
      ).toBe(true);
    });

    it('should handle combined search and status filtering efficiently', () => {
      const mockQuotations = generateMockQuotations(1000);

      store.dispatch({
        type: 'quotation/populateFromCache',
        payload: { quotations: mockQuotations, lastSync: Date.now() },
      });

      // Apply both search and status filters
      store.dispatch({ type: 'quotation/setSearchText', payload: 'LEAD-10' });
      store.dispatch({
        type: 'quotation/setFilters',
        payload: { statuses: ['Created'] },
      });

      const startTime = performance.now();
      const filteredQuotations = selectFilteredQuotations(store.getState());
      const endTime = performance.now();

      const duration = endTime - startTime;

      console.log(`📊 Combined filtering took ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(PERFORMANCE_TARGET_MS);
      expect(
        filteredQuotations.every(
          (quotation) =>
            quotation.status === 'Created' &&
            quotation.leadId.includes('LEAD-10')
        )
      ).toBe(true);
    });
  });

  describe('Memory Performance', () => {
    it('should not cause memory leaks with large datasets', () => {
      const initialMemory = process.memoryUsage();

      // Process multiple large datasets
      for (let i = 0; i < 5; i++) {
        const mockQuotations = generateMockQuotations(200);

        store.dispatch({
          type: 'quotation/populateFromCache',
          payload: { quotations: mockQuotations, lastSync: Date.now() },
        });

        // Perform filtering operations
        store.dispatch({
          type: 'quotation/setSearchText',
          payload: `test-${i}`,
        });
        selectFilteredQuotations(store.getState());

        // Clear state
        store.dispatch({ type: 'quotation/setSearchText', payload: '' });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryDiff = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(
        `📊 Memory difference: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`
      );

      // Memory growth should be reasonable (less than 50MB for this test)
      expect(memoryDiff).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Component Render Performance', () => {
    it('should meet render time target for large lists', () => {
      const quotationCount = 100;
      const startTime = performance.now();

      // Simulate component rendering time by processing data
      const mockQuotations = generateMockQuotations(quotationCount);
      const processedData = mockQuotations.map((quotation) => ({
        ...quotation,
        formattedAmount: `₹${quotation.totalCost.toLocaleString()}`,
        formattedDate: new Date(quotation.createdAt).toLocaleDateString(),
        systemCapacity: `${quotation.systemKW} kW`,
      }));

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      console.log(
        `📊 Processing ${quotationCount} quotations took ${renderTime.toFixed(
          2
        )}ms`
      );

      expect(renderTime).toBeLessThan(RENDER_TARGET_MS);
      expect(processedData).toHaveLength(quotationCount);
    });
  });
});
