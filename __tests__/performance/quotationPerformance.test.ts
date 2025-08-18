/**
 * Quotation Performance Tests
 * Testing performance with large datasets
 */
import { configureStore } from '@reduxjs/toolkit';
import { quotationApi } from '../../src/store/api/quotationApi';
import quotationSlice, {
  upsertQuotations,
} from '../../src/store/slices/quotationSlice';
import {
  selectQuotationsArray,
  selectFilteredQuotations,
  selectQuotationsByLead,
} from '../../src/store/selectors/quotationSelectors';
import type { Quotation } from '../../src/types/api/quotation';
import type { UpsertQuotationsPayload } from '../../src/store/slices/quotationSlice';

describe('Quotation Performance Tests', () => {
  const createLargeDataset = (size: number): Quotation[] => {
    return Array.from({ length: size }, (_, index) => ({
      quotationId: `QUOT-${String(index).padStart(6, '0')}`,
      leadId: `LEAD-${String(Math.floor(index / 10)).padStart(6, '0')}`,
      systemKW: 3 + (index % 8), // Vary between 3-10 kW
      totalCost: 200000 + index * 1000, // Vary costs
      status: (['Generated', 'Shared', 'Accepted', 'Rejected'] as const)[
        index % 4
      ],
      createdAt: new Date(2024, 0, 1 + (index % 365)).toISOString(),
    }));
  };

  describe('Large Dataset Handling', () => {
    it('should handle 1000 quotations efficiently', () => {
      const store = configureStore({
        reducer: {
          quotation: quotationSlice,
        },
      });

      const largeDataset = createLargeDataset(1000);
      const payload: UpsertQuotationsPayload = {
        items: largeDataset,
        page: 1,
        totalPages: 1,
        totalCount: 1000,
      };

      const startTime = performance.now();
      store.dispatch(upsertQuotations(payload));
      const endTime = performance.now();

      const state = store.getState();
      expect(Object.keys(state.quotation.items)).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle 5000 quotations efficiently', () => {
      const store = configureStore({
        reducer: {
          quotation: quotationSlice,
        },
      });

      const largeDataset = createLargeDataset(5000);
      const payload: UpsertQuotationsPayload = {
        items: largeDataset,
        page: 1,
        totalPages: 1,
        totalCount: 5000,
      };

      const startTime = performance.now();
      store.dispatch(upsertQuotations(payload));
      const endTime = performance.now();

      const state = store.getState();
      expect(Object.keys(state.quotation.items)).toHaveLength(5000);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });
  });

  describe('Selector Performance', () => {
    let store: ReturnType<typeof configureStore>;
    let largeState: any;

    beforeAll(() => {
      store = configureStore({
        reducer: {
          quotation: quotationSlice,
        },
      });

      const largeDataset = createLargeDataset(2000);
      const payload: UpsertQuotationsPayload = {
        items: largeDataset,
        page: 1,
        totalPages: 1,
        totalCount: 2000,
      };

      store.dispatch(upsertQuotations(payload));
      largeState = store.getState();
    });

    it('should select all quotations efficiently', () => {
      const startTime = performance.now();
      const quotations = selectQuotationsArray(largeState);
      const endTime = performance.now();

      expect(quotations).toHaveLength(2000);
      expect(endTime - startTime).toBeLessThan(50); // Should complete within 50ms
    });

    it('should filter quotations efficiently', () => {
      // Set up filters
      const stateWithFilters = {
        ...largeState,
        quotation: {
          ...largeState.quotation,
          filters: {
            statuses: ['Generated', 'Shared'],
            leadId: undefined,
            dateRange: undefined,
          },
          searchText: '',
        },
      };

      const startTime = performance.now();
      const filteredQuotations = selectFilteredQuotations(stateWithFilters);
      const endTime = performance.now();

      expect(filteredQuotations.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should select quotations by lead efficiently', () => {
      const startTime = performance.now();
      const quotationsByLead = selectQuotationsByLead(
        largeState,
        'LEAD-000001'
      );
      const endTime = performance.now();

      expect(quotationsByLead.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(50); // Should complete within 50ms
    });

    it('should handle multiple selector calls efficiently', () => {
      const startTime = performance.now();

      // Simulate multiple selector calls as would happen in a React component
      for (let i = 0; i < 100; i++) {
        selectQuotationsArray(largeState);
        selectFilteredQuotations(largeState);
        selectQuotationsByLead(
          largeState,
          `LEAD-${String(i % 200).padStart(6, '0')}`
        );
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks with repeated operations', () => {
      const store = configureStore({
        reducer: {
          quotation: quotationSlice,
        },
      });

      const initialMemory = process.memoryUsage().heapUsed;

      // Perform multiple large operations
      for (let batch = 0; batch < 10; batch++) {
        const dataset = createLargeDataset(500);
        const payload: UpsertQuotationsPayload = {
          items: dataset,
          page: batch + 1,
          totalPages: 10,
          totalCount: 5000,
        };

        store.dispatch(upsertQuotations(payload));
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for test data)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent updates efficiently', async () => {
      const store = configureStore({
        reducer: {
          quotation: quotationSlice,
        },
      });

      const startTime = performance.now();

      // Simulate concurrent updates
      const promises = Array.from({ length: 10 }, (_, index) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            const dataset = createLargeDataset(100);
            const payload: UpsertQuotationsPayload = {
              items: dataset,
              page: index + 1,
              totalPages: 10,
              totalCount: 1000,
            };
            store.dispatch(upsertQuotations(payload));
            resolve();
          }, index * 10);
        });
      });

      await Promise.all(promises);
      const endTime = performance.now();

      const state = store.getState();
      expect(Object.keys(state.quotation.items).length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});
