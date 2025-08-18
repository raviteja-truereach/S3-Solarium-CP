/**
 * Temporary test file for enhanced Customer Slice verification
 * Test the new pagination pattern and memoized selectors
 */

import { store } from '../store/store';
import { usePaginatedCustomers } from '../hooks/usePaginatedCustomers';
import {
  updateSearchTerm,
  updateFilters,
  clearFilters,
} from '../store/slices/customerSlice';
import {
  selectFilteredAndSearchedCustomers,
  selectActiveFilterCount,
  selectCustomerById,
} from '../store/selectors/customerSelectors';

export const testEnhancedCustomerSlice = () => {
  console.log('🧪 Testing Enhanced Customer Slice...');

  // Test 1: Search functionality
  console.log('🔍 Testing search...');
  store.dispatch(updateSearchTerm('john'));
  const state1 = store.getState();
  console.log('✅ Search term set:', state1.customers.searchTerm);

  // Test 2: Filter functionality
  console.log('🔧 Testing filters...');
  store.dispatch(updateFilters({ kycStatus: 'approved', city: 'Mumbai' }));
  const state2 = store.getState();
  console.log('✅ Filters set:', state2.customers.filters);

  // Test 3: Memoized selectors
  console.log('🎯 Testing memoized selectors...');
  const filteredCustomers = selectFilteredAndSearchedCustomers(
    store.getState()
  );
  const activeFilterCount = selectActiveFilterCount(store.getState());
  console.log('✅ Filtered customers:', filteredCustomers.length);
  console.log('✅ Active filter count:', activeFilterCount);

  // Test 4: Clear filters
  console.log('🧹 Testing clear filters...');
  store.dispatch(clearFilters());
  const state3 = store.getState();
  console.log(
    '✅ Filters cleared:',
    state3.customers.filters,
    state3.customers.searchTerm
  );

  console.log('🎉 Enhanced Customer Slice tests completed!');
};

// Example usage in a component:
export const ExampleUsage = `
// In your component:
import { usePaginatedCustomers } from '../hooks/usePaginatedCustomers';
import { useSelector, useDispatch } from 'react-redux';
import { updateSearchTerm, updateFilters } from '../store/slices/customerSlice';
import { selectFilteredAndSearchedCustomers } from '../store/selectors/customerSelectors';

const MyComponent = () => {
  const dispatch = useDispatch();
  
  // Pagination hook (same pattern as usePaginatedLeads)
  const { items, loadNext, refreshing, error, reload } = usePaginatedCustomers({
    pageSize: 20,
    autoReloadOnline: true
  });
  
  // Filtered customers (memoized selector)
  const filteredCustomers = useSelector(selectFilteredAndSearchedCustomers);
  
  // Search functionality
  const handleSearch = (term: string) => {
    dispatch(updateSearchTerm(term));
  };
  
  // Filter functionality
  const handleFilter = (filters: { kycStatus?: string; city?: string }) => {
    dispatch(updateFilters(filters));
  };
  
  return (
    <FlatList
      data={filteredCustomers}
      onEndReached={loadNext}
      refreshing={refreshing}
      onRefresh={reload}
    />
  );
};
`;
