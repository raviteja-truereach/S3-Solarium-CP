/**
 * Performance tests for lead selectors
 */

import { createSelector } from '@reduxjs/toolkit';
import {
  selectFilteredLeads,
  selectOverdueCount,
} from '../../../store/selectors/leadSelectors';
import {
  generateMockLeads,
  benchmarkSelector,
} from '../../../utils/performance';

// Mock state structure
const createMockState = (leads: any[]) => ({
  lead: {
    items: leads.reduce((acc, lead) => {
      acc[lead.id] = lead;
      return acc;
    }, {}),
    searchText: '',
    filters: { statuses: [], dateRange: undefined },
    pagesLoaded: [1],
    totalPages: 1,
    totalCount: leads.length,
    loadingNext: false,
    hasMore: false,
    lastSync: Date.now(),
    isLoading: false,
    error: null,
  },
});

describe('Lead Selectors Performance', () => {
  it('should filter 500 leads within 10ms', () => {
    const mockLeads = generateMockLeads(500);
    const mockState = createMockState(mockLeads);

    const selectorFn = () => selectFilteredLeads(mockState as any);
    const { averageTime } = benchmarkSelector(
      selectorFn,
      50,
      'selectFilteredLeads'
    );

    expect(averageTime).toBeLessThan(10);
  });

  it('should calculate overdue count within 5ms', () => {
    const mockLeads = generateMockLeads(500);
    const mockState = createMockState(mockLeads);

    const selectorFn = () => selectOverdueCount(mockState as any);
    const { averageTime } = benchmarkSelector(
      selectorFn,
      50,
      'selectOverdueCount'
    );

    expect(averageTime).toBeLessThan(5);
  });

  it('should filter by search text correctly', () => {
    const mockLeads = generateMockLeads(100);
    const mockState = createMockState(mockLeads);
    mockState.lead.searchText = 'Customer 5';

    const filteredLeads = selectFilteredLeads(mockState as any);
    expect(filteredLeads.length).toBeGreaterThan(0);
    expect(
      filteredLeads.every(
        (lead) =>
          lead.customerName?.includes('Customer 5') || lead.id.includes('5')
      )
    ).toBe(true);
  });

  it('should filter by status correctly', () => {
    const mockLeads = generateMockLeads(100);
    const mockState = createMockState(mockLeads);
    mockState.lead.filters.statuses = ['Won'];

    const filteredLeads = selectFilteredLeads(mockState as any);
    expect(filteredLeads.every((lead) => lead.status === 'Won')).toBe(true);
  });

  it('should calculate overdue count correctly', () => {
    const mockLeads = generateMockLeads(100);
    const mockState = createMockState(mockLeads);

    const overdueCount = selectOverdueCount(mockState as any);

    // Based on our mock data generation, ~20% should be overdue
    expect(overdueCount).toBeGreaterThan(0);
    expect(overdueCount).toBeLessThan(mockLeads.length);
  });
});
