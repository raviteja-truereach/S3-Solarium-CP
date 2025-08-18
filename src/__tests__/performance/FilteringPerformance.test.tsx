import { performance } from 'perf_hooks';
import { configureStore } from '@reduxjs/toolkit';
import leadSlice, { upsertLeads } from '../../store/slices/leadSlice';
import { selectFilteredLeads } from '../../store/selectors/leadSelectors';
import { generateMockLeads } from '../../utils/performance';

const PERFORMANCE_TARGET_MS = 150;

describe('Filtering Performance Tests', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        lead: leadSlice,
      },
    });
  });

  it('should filter 500 leads within 150ms', () => {
    // Generate 500 mock leads
    const mockLeads = generateMockLeads(500);
    store.dispatch(upsertLeads(mockLeads));

    // Apply search filter
    store.dispatch({ type: 'lead/setSearchText', payload: 'John' });

    // Measure filtering performance
    const startTime = performance.now();
    const filteredLeads = selectFilteredLeads(store.getState());
    const endTime = performance.now();

    const duration = endTime - startTime;

    console.log(`🔬 Filtering 500 leads took ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThan(PERFORMANCE_TARGET_MS);
    expect(filteredLeads.length).toBeGreaterThan(0);
  });

  it('should handle status filtering within performance target', () => {
    const mockLeads = generateMockLeads(500);
    store.dispatch(upsertLeads(mockLeads));

    // Apply status filter
    store.dispatch({
      type: 'lead/setFilters',
      payload: { statuses: ['New Lead', 'In Discussion'] },
    });

    const startTime = performance.now();
    const filteredLeads = selectFilteredLeads(store.getState());
    const endTime = performance.now();

    const duration = endTime - startTime;

    console.log(`🔬 Status filtering took ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThan(PERFORMANCE_TARGET_MS);
    expect(
      filteredLeads.every((lead) =>
        ['New Lead', 'In Discussion'].includes(lead.status)
      )
    ).toBe(true);
  });

  it('should handle combined search and status filtering efficiently', () => {
    const mockLeads = generateMockLeads(500);
    store.dispatch(upsertLeads(mockLeads));

    // Apply both search and status filters
    store.dispatch({ type: 'lead/setSearchText', payload: 'Customer' });
    store.dispatch({
      type: 'lead/setFilters',
      payload: { statuses: ['New Lead'] },
    });

    const startTime = performance.now();
    const filteredLeads = selectFilteredLeads(store.getState());
    const endTime = performance.now();

    const duration = endTime - startTime;

    console.log(`🔬 Combined filtering took ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThan(PERFORMANCE_TARGET_MS);
    expect(
      filteredLeads.every(
        (lead) =>
          lead.status === 'New Lead' &&
          lead.customerName?.toLowerCase().includes('customer')
      )
    ).toBe(true);
  });
});
