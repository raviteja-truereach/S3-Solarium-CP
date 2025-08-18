import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Snackbar, useTheme } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../../store/hooks';

// ✅ Import customer-specific hooks and selectors (from Sub-task 2)
import { usePaginatedCustomers } from '../../hooks/usePaginatedCustomers';
import {
  selectFilteredAndSearchedCustomers,
  selectAllCustomers,
  selectCustomerLoading,
  selectCustomerError,
  selectFilters,
  selectActiveFilterCount,
  selectSearchTerm,
} from '../../store/selectors/customerSelectors';

import {
  updateSearchTerm,
  clearFilters,
  resetPagination,
} from '../../store/slices/customerSlice';

import { CustomerListItem } from './CustomerListItem';
import { EmptyCustomersState } from '../../components/customers/EmptyCustomersState';
import SearchBar from '../../components/customers/CustomerSearchBar';
import CustomerFilterSheet from '../../components/customers/CustomerFilterSheet';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import type { Customer } from '../../database/models/Customer';
import type { RootState } from '../../store/types';
import Toast from 'react-native-toast-message';
import Tooltip from '../../components/common/Tooltip';
import { useIsOnline } from '../../hooks/useConnectivityMemoized';
import { Assets } from '../../../assets';

const PERFORMANCE_TARGET_MS = 150;

export const CustomersScreen: React.FC<any> = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const networkStatus = useNetworkStatus();

  // ✅ Auth state access (following MyLeadsScreen pattern)
  const isLoggedIn = useAppSelector(
    (state: RootState) => state.auth.isLoggedIn
  );
  const authToken = useAppSelector((state: RootState) => state.auth.token);

  // ✅ Customer state from Redux (using customer selectors)
  const customers = useAppSelector(selectFilteredAndSearchedCustomers);
  const allCustomers = useAppSelector(selectAllCustomers);
  const isLoading = useAppSelector(selectCustomerLoading);
  const error = useAppSelector(selectCustomerError);
  const searchText = useAppSelector(selectSearchTerm);
  const currentFilters = useAppSelector(selectFilters);
  const activeFilterCount = useAppSelector(selectActiveFilterCount);

  // ✅ Pagination hook (from Sub-task 2)
  const {
    items: paginatedCustomers,
    loadNext,
    refreshing,
    error: paginationError,
    reload,
  } = usePaginatedCustomers({
    pageSize: 20,
    autoReloadOnline: true,
  });

  // Local state (same as MyLeadsScreen)
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  // Refs for tracking (same as MyLeadsScreen)
  const previousFiltersRef = useRef(currentFilters);
  const previousSearchRef = useRef(searchText);
  const isOnline = useIsOnline();

  // Performance monitoring
  const filteringStartTime = useRef<number>(0);

  console.log('🔍 CustomersScreen Loading States:', {
    isLoading,
    refreshing,
    isLoggedIn,
    authToken: !!authToken,
    customersCount: customers.length,
    allCustomersCount: allCustomers.length,
  });

  useEffect(() => {
    filteringStartTime.current = performance.now();
  }, [searchText, currentFilters]);

  // ✅ Authentication check (same pattern as MyLeadsScreen)
  useEffect(() => {
    if (!isLoggedIn || !authToken) {
      console.warn('⚠️ User not authenticated');
    }
  }, [isLoggedIn, authToken]);

  // Computed values
  const showEmptyState = useMemo(() => {
    return !isLoading && !refreshing && customers.length === 0;
  }, [isLoading, refreshing, customers.length]);

  // ✅ Refresh handler (following MyLeadsScreen pattern)
  const handleRefresh = useCallback(async () => {
    if (!isLoggedIn || refreshing) return;

    try {
      console.log('🔄 Refreshing customers...');
      dispatch(resetPagination());

      await reload();

      setSnackbarMessage(
        `Refreshed ${customers.length} customers successfully`
      );
      setSnackbarVisible(true);
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to refresh customers';
      setSnackbarMessage(errorMessage);
      setSnackbarVisible(true);
    }
  }, [isLoggedIn, refreshing, reload, dispatch, customers.length]);

  // ✅ Load more handler (following MyLeadsScreen pattern)
  const handleLoadMore = useCallback(async () => {
    if (!isLoggedIn || isLoading) return;

    try {
      console.log('📜 Loading more customers...');
      await loadNext();
    } catch (error) {
      console.error('❌ Load more failed:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to load more customers';
      setSnackbarMessage(errorMessage);
      setSnackbarVisible(true);
    }
  }, [isLoggedIn, isLoading, loadNext]);

  // Handle errors (same pattern as MyLeadsScreen)
  useEffect(() => {
    if (error || paginationError) {
      const errorMessage =
        error || paginationError || 'Failed to load customers';
      console.error('❌ Customer error:', errorMessage);

      Alert.alert('Error', errorMessage, [
        { text: 'Retry', onPress: handleRefresh },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [error, paginationError, handleRefresh]);

  // ✅ Customer interaction handlers
  const handleCallCustomer = useCallback((customer: Customer) => {
    const phoneNumber = customer.phone?.replace(/[^0-9+]/g, '');

    if (!phoneNumber) {
      Alert.alert(
        'No Phone Number',
        'This customer does not have a phone number.'
      );
      return;
    }

    const phoneUrl = `tel:${phoneNumber}`;

    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        return Linking.openURL(phoneUrl);
      })
      .catch((error) => {
        console.error('Call error:', error);
        Alert.alert(
          'Call Failed',
          'Unable to make the call. Please try again.'
        );
      });
  }, []);

  const handleCustomerPress = useCallback(
    (customer: Customer) => {
      console.log('Customer pressed:', customer.name, 'ID:', customer.id);
      navigation.navigate('CustomerDetail', { customerId: customer.id });
    },
    [navigation]
  );

  const handleSearchSubmit = useCallback((query: string) => {
    console.log('Customer search submitted:', query);
  }, []);

  const handleOpenFilter = useCallback(() => {
    setFilterSheetVisible(true);
  }, []);

  const handleCloseFilter = useCallback(() => {
    setFilterSheetVisible(false);
  }, []);

  const handleClearSearch = useCallback(() => {
    dispatch(updateSearchTerm(''));
  }, [dispatch]);

  const handleClearAllFilters = useCallback(() => {
    dispatch(clearFilters());
    setSnackbarMessage('All filters cleared');
    setSnackbarVisible(true);
  }, [dispatch]);

  // ✅ Focus effect (following MyLeadsScreen pattern)
  useFocusEffect(
    React.useCallback(() => {
      if (isLoggedIn) {
        console.log('🔄 CustomersScreen focused, will auto-refresh if needed');
      }
    }, [isLoggedIn])
  );

  // ✅ Early return if not authenticated (same as MyLeadsScreen)
  if (!isLoggedIn || !authToken) {
    return (
      <View style={styles.container}>
        <View style={styles.authRequiredContainer}>
          <Image
            source={Assets.icons.padlock}
            style={styles.authRequiredIcon}
            resizeMode="contain"
          />
          <Text style={styles.authRequiredTitle}>Authentication Required</Text>
          <Text style={styles.authRequiredMessage}>
            Please log in to access your customers.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ✅ Render methods (adapted for customers)
  const renderCustomerItem = useCallback(
    ({ item }: { item: Customer }) => (
      <CustomerListItem
        customer={item}
        onPress={handleCustomerPress}
        onCallPress={handleCallCustomer}
        testID={`customer-item-${item.id}`}
      />
    ),
    [handleCustomerPress, handleCallCustomer]
  );

  const renderListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>My Customers</Text>

          <TouchableOpacity
            onPress={handleOpenFilter}
            style={styles.filterButton}
            testID="filter-button"
          >
            <Image
              source={Assets.icons.filter}
              style={styles.filterIcon}
              resizeMode="contain"
            />
            <Text style={styles.filterButtonText}>Filter</Text>

            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{customers.length}</Text>
            <Text style={styles.statLabel}>
              {activeFilterCount > 0 ? 'Filtered' : 'Showing'} Customers
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{allCustomers.length}</Text>
            <Text style={styles.statLabel}>Total Customers</Text>
          </View>

          {isOnline && (
            <View style={styles.statItem}>
              <Image
                source={Assets.icons.globe}
                style={styles.connectionStatusIcon}
                resizeMode="contain"
              />
              <Text style={styles.statLabel}>Online</Text>
            </View>
          )}
        </View>

        {(activeFilterCount > 0 || searchText.trim()) && (
          <View style={styles.activeFiltersContainer}>
            {searchText.trim() && (
              <TouchableOpacity
                style={styles.activeFilterChip}
                onPress={handleClearSearch}
              >
                <Image
                  source={Assets.icons.magnifyingGlass}
                  style={styles.chipIcon}
                  resizeMode="contain"
                />
                <Text style={styles.activeFilterChipText}>
                  Search: "{searchText}" ✕
                </Text>
              </TouchableOpacity>
            )}

            {activeFilterCount > 0 && (
              <TouchableOpacity
                style={styles.activeFilterChip}
                onPress={handleOpenFilter}
              >
                <Image
                  source={Assets.icons.filter}
                  style={styles.chipIcon}
                  resizeMode="contain"
                />
                <Text style={styles.activeFilterChipText}>
                  {activeFilterCount} filter
                  {activeFilterCount > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.clearAllButton}
              onPress={handleClearAllFilters}
            >
              <Image
                source={Assets.icons.sync}
                style={styles.chipIcon}
                resizeMode="contain"
              />
              <Text style={styles.clearAllButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    ),
    [
      customers.length,
      allCustomers.length,
      activeFilterCount,
      searchText,
      isOnline,
      handleOpenFilter,
      handleClearSearch,
      handleClearAllFilters,
    ]
  );

  const renderEmptyState = useCallback(() => {
    if (activeFilterCount > 0 || searchText.trim()) {
      return (
        <EmptyCustomersState
          icon={Assets.icons.magnifyingGlass}
          title="No customers match your filters"
          message={
            searchText && activeFilterCount > 0
              ? `No results for "${searchText}" with the selected filters. Try adjusting your search terms or filters.`
              : searchText
              ? `No results found for "${searchText}". Try a different search term.`
              : 'No customers match your current filters. Try adjusting your filter criteria.'
          }
          actionText="Clear Filters"
          onActionPress={handleClearAllFilters}
          testID="empty-filtered-state"
        />
      );
    }

    return (
      <EmptyCustomersState
        icon={Assets.icons.group}
        title="No customers yet"
        message="No customers found. Pull to refresh or check your internet connection."
        actionText="Refresh"
        onActionPress={handleRefresh}
        testID="empty-default-state"
      />
    );
  }, [activeFilterCount, searchText, handleClearAllFilters, handleRefresh]);

  return (
    <View style={styles.container}>
      <SearchBar
        testID="customers-search-bar"
        loading={isLoading}
        onSearchSubmit={handleSearchSubmit}
        placeholder="Search customers"
      />

      {showEmptyState ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={customers}
          renderItem={renderCustomerItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#004C89']}
              tintColor="#004C89"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          accessibilityLabel="Customers list"
          accessibilityHint="Scroll to see more customers"
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      )}

      <CustomerFilterSheet
        visible={filterSheetVisible}
        onDismiss={handleCloseFilter}
        testID="customer-filter-sheet"
      />

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

// ✅ Styles (same as MyLeadsScreen with minor text updates)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  authRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  authRequiredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  authRequiredMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: '#004C89',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#004C89',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    position: 'relative',
  },
  filterButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#004C89',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  connectionStatus: {
    fontSize: 20,
    marginBottom: 4,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  activeFilterChip: {
    backgroundColor: 'rgba(0, 76, 137, 0.1)',
    borderColor: '#004C89',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activeFilterChipText: {
    color: '#004C89',
    fontSize: 12,
    fontWeight: '500',
  },
  clearAllButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: '#FF3B30',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearAllButtonText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  fabDisabled: {
    backgroundColor: '#BDBDBD',
    opacity: 0.6,
  },

  /////////
  authRequiredIcon: {
    width: 64,
    height: 64,
    marginBottom: 24,
    tintColor: '#666',
  },
  filterIcon: {
    width: 12,
    height: 12,
    marginRight: 4,
    tintColor: 'white',
  },
  connectionStatusIcon: {
    width: 20,
    height: 27,
    marginBottom: 4,
    tintColor: '#004C89',
  },
  chipIcon: {
    width: 12,
    height: 12,
    marginRight: 6,
    tintColor: '#004C89',
  },
});

export default CustomersScreen;
