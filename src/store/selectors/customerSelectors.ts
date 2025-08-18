/**
 * Customer Selectors - Following Lead Selectors Pattern
 * Memoized selectors for customer state with pagination support
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type { Customer } from '../../database/models/Customer';

/**
 * Select the customer state
 */
export const selectCustomerState = (state: RootState) => state.customers;

/**
 * Select all customers as an array
 */
export const selectAllCustomers = createSelector(
  [selectCustomerState],
  (customerState) => {
    if (!customerState?.items) return [];
    return Object.values(customerState.items);
  }
);

/**
 * Select paginated customers (same as selectAllCustomers for consistency)
 */
export const selectPaginatedCustomers = createSelector(
  [selectAllCustomers],
  (customers) => customers
);

/**
 * Select pagination metadata
 */
export const selectPaginationMeta = createSelector(
  [selectCustomerState],
  (customerState) => ({
    pagesLoaded: customerState?.pagesLoaded || [],
    totalPages: customerState?.totalPages || 0,
    totalCount: customerState?.totalCount || 0,
    loadingNext: customerState?.loadingNext || false,
    hasMore: customerState?.hasMore || true,
    error: customerState?.error || null,
    isPageLoaded: (page: number) =>
      customerState?.pagesLoaded.includes(page) || false,
  })
);

/**
 * Select loading states for pagination
 */
export const selectPaginationLoading = createSelector(
  [selectCustomerState],
  (customerState) => ({
    isLoading: customerState?.isLoading || false,
    loadingNext: customerState?.loadingNext || false,
    isAnyLoading:
      customerState?.isLoading || customerState?.loadingNext || false,
  })
);

/**
 * Select if more customers can be loaded
 */
export const selectCanLoadMore = createSelector(
  [selectCustomerState],
  (customerState) => {
    if (!customerState) return false;

    const hasMore = customerState.hasMore ?? true;
    const loadingNext = customerState.loadingNext ?? false;
    const isLoading = customerState.isLoading ?? false;

    return hasMore && !loadingNext && !isLoading;
  }
);

/**
 * Select last sync timestamp
 */
export const selectLastSync = createSelector(
  [selectCustomerState],
  (customerState) => customerState?.lastSync || null
);

/**
 * Select current error state
 */
export const selectCustomerError = createSelector(
  [selectCustomerState],
  (customerState) => customerState?.error || null
);

/**
 * Select loading state
 */
export const selectCustomerLoading = createSelector(
  [selectCustomerState],
  (customerState) => customerState?.isLoading || false
);

/**
 * Select a customer by ID
 */
export const selectCustomerById = createSelector(
  [selectCustomerState, (_state: RootState, customerId: string) => customerId],
  (customerState, customerId) => customerState?.items?.[customerId] || null
);

/**
 * Select customers by KYC status
 */
export const selectCustomersByKycStatus = createSelector(
  [selectAllCustomers, (_state: RootState, status: string) => status],
  (customers, status) =>
    customers.filter((customer) => customer.kyc_status === status)
);

/**
 * Select customers count
 */
export const selectCustomersCount = createSelector(
  [selectAllCustomers],
  (customers) => customers.length
);

/**
 * Select customers that need sync
 */
export const selectCustomersNeedingSync = createSelector(
  [selectAllCustomers],
  (customers) =>
    customers.filter((customer) => customer.sync_status !== 'synced')
);

/**
 * Select search term
 */
export const selectSearchTerm = createSelector(
  [selectCustomerState],
  (customerState) => customerState?.searchTerm || ''
);

/**
 * Select current filters
 */
export const selectFilters = createSelector(
  [selectCustomerState],
  (customerState) => customerState?.filters || {}
);

/**
 * Helper function to check if a customer matches search criteria
 */
const matchesSearch = (customer: Customer, searchTerm: string): boolean => {
  if (!searchTerm.trim()) return true;

  const searchLower = searchTerm.toLowerCase().trim();
  const searchFields = [
    customer.name || '',
    customer.phone || '',
    customer.email || '',
    customer.address || '',
    customer.city || '',
    customer.state || '',
    customer.id || '',
  ];

  return searchFields.some((field) =>
    field.toLowerCase().includes(searchLower)
  );
};

/**
 * Helper function to check if a customer matches KYC status filter
 */
const matchesKycStatusFilter = (
  customer: Customer,
  kycStatus?: string
): boolean => {
  if (!kycStatus) return true;
  return customer.kyc_status === kycStatus;
};

/**
 * Helper function to check if a customer matches city filter
 */
const matchesCityFilter = (customer: Customer, city?: string): boolean => {
  if (!city) return true;
  return customer.city === city;
};

/**
 * Helper function to check if a customer matches state filter
 */
const matchesStateFilter = (customer: Customer, state?: string): boolean => {
  if (!state) return true;
  return customer.state === state;
};

/**
 * Memoized selector for filtered and searched customers
 * Returns customers matching search term and filters
 * Performance target: ≤ 10ms for ≤ 500 records
 */
export const selectFilteredAndSearchedCustomers = createSelector(
  [selectAllCustomers, selectSearchTerm, selectFilters],
  (customers, searchTerm, filters) => {
    const startTime = performance.now();

    const filteredCustomers = customers.filter((customer) => {
      return (
        matchesSearch(customer, searchTerm) &&
        matchesKycStatusFilter(customer, filters.kycStatus) &&
        matchesCityFilter(customer, filters.city) &&
        matchesStateFilter(customer, filters.state)
      );
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Log performance for monitoring
    if (duration > 10) {
      console.warn(
        `⚠️ selectFilteredAndSearchedCustomers took ${duration.toFixed(
          2
        )}ms (target: ≤10ms)`
      );
    } else if (__DEV__) {
      console.log(
        `✅ selectFilteredAndSearchedCustomers: ${filteredCustomers.length}/${
          customers.length
        } customers in ${duration.toFixed(2)}ms`
      );
    }

    return filteredCustomers;
  }
);

/**
 * Select active filter count (for badge display)
 */
export const selectActiveFilterCount = createSelector(
  [selectSearchTerm, selectFilters],
  (searchTerm, filters) => {
    let count = 0;

    if (searchTerm.trim()) count++;
    if (filters.kycStatus) count++;
    if (filters.city) count++;
    if (filters.state) count++;

    return count;
  }
);

/**
 * Legacy compatibility selectors (keeping existing names)
 */
export const selectFilteredCustomers = selectFilteredAndSearchedCustomers;
