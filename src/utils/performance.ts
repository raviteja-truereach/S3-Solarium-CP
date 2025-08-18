/**
 * Performance testing utilities for selectors
 */

import type { Lead } from '../database/models/Lead';

/**
 * Generate mock leads for performance testing
 */
export const generateMockLeads = (count: number): Lead[] => {
  const statuses = [
    'New Lead',
    'In Discussion',
    'Won',
    'Executed',
    'Not Interested',
  ];
  const mockLeads: Lead[] = [];

  for (let i = 0; i < count; i++) {
    mockLeads.push({
      id: `MOCK-LEAD-${i.toString().padStart(4, '0')}`,
      customer_id: `CUST-${i}`,
      status: statuses[i % statuses.length],
      priority: 'medium',
      source: 'CP',
      created_at: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'synced',
      local_changes: '{}',
      customerName: `Test Customer ${i}`,
      phone: `+1234567${i.toString().padStart(3, '0')}`,
      address: `${i} Test Street, Test City`,
      email: `customer${i}@test.com`,
      follow_up_date:
        i % 5 === 0
          ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 20% overdue
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 80% future
    });
  }

  return mockLeads;
};

/**
 * Benchmark a selector function
 */
export const benchmarkSelector = <T>(
  selectorFn: () => T,
  iterations: number = 100,
  name: string = 'Selector'
): { averageTime: number; results: T } => {
  const times: number[] = [];
  let lastResult: T;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    lastResult = selectorFn();
    const end = performance.now();
    times.push(end - start);
  }

  const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;

  console.log(`🔬 ${name} Performance:`, {
    averageTime: `${averageTime.toFixed(2)}ms`,
    minTime: `${Math.min(...times).toFixed(2)}ms`,
    maxTime: `${Math.max(...times).toFixed(2)}ms`,
    iterations,
  });

  return { averageTime, results: lastResult! };
};
