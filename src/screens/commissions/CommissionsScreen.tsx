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
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Snackbar, useTheme } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../../store/hooks';

// Commission-specific imports
import { usePaginatedCommissions } from '../../hooks/usePaginatedCommissions';
import {
  selectFilteredCommissions,
  selectAllCommissions,
  selectCommissionLoading,
  selectCommissionError,
  selectFilters,
  selectActiveFilterCount,
  selectSearchTerm,
  selectCommissionKPIs,
} from '../../store/selectors/commissionSelectors';

import {
  updateSearchTerm,
  clearFilters,
  resetPagination,
} from '../../store/slices/commissionSlice';

import { CommissionListItem } from './CommissionListItem';
import { EmptyCommissionsState } from '../../components/commissions/EmptyCommissionsState';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import type { Commission } from '../../database/models/Commission';
import type { RootState } from '../../store/types';
import Toast from 'react-native-toast-message';
import { useIsOnline } from '../../hooks/useConnectivityMemoized';
import { CommissionSearchBar } from '../../components/commissions/CommissionSearchBar';
import CommissionFilterSheet from '../../components/commissions/CommissionFilterSheet';
import { CommissionKPIBar } from '../../components/commissions/CommissionKPIBar';
import CommissionFilterChips from '../../components/commissions/CommissionFilterChips';
import { Assets } from '../../../assets';

const PERFORMANCE_TARGET_MS = 150;

export const CommissionsScreen: React.FC<any> = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const networkStatus = useNetworkStatus();

  // Auth state access
  const isLoggedIn = useAppSelector(
    (state: RootState) => state.auth.isLoggedIn
  );
  const authToken = useAppSelector((state: RootState) => state.auth.token);

  // Commission state from Redux
  const commissions = useAppSelector(selectFilteredCommissions);
  const allCommissions = useAppSelector(selectAllCommissions);
  const isLoading = useAppSelector(selectCommissionLoading);
  const error = useAppSelector(selectCommissionError);
  const searchText = useAppSelector(selectSearchTerm);
  const currentFilters = useAppSelector(selectFilters);
  const activeFilterCount = useAppSelector(selectActiveFilterCount);
  const kpis = useAppSelector(selectCommissionKPIs);

  // Pagination hook
  const {
    items: paginatedCommissions,
    loadNext,
    refreshing,
    error: paginationError,
    reload,
  } = usePaginatedCommissions({
    pageSize: 25,
    autoReloadOnline: true,
  });

  // Local state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  // Refs for tracking
  const previousFiltersRef = useRef(currentFilters);
  const previousSearchRef = useRef(searchText);
  const isOnline = useIsOnline();

  // Performance monitoring
  const filteringStartTime = useRef<number>(0);

  console.log('💰 CommissionsScreen Loading States:', {
    isLoading,
    refreshing,
    isLoggedIn,
    authToken: !!authToken,
    commissionsCount: commissions.length,
    allCommissionsCount: allCommissions.length,
  });

  useEffect(() => {
    filteringStartTime.current = performance.now();
  }, [searchText, currentFilters]);

  // Authentication check
  useEffect(() => {
    if (!isLoggedIn || !authToken) {
      console.warn('⚠️ User not authenticated');
    }
  }, [isLoggedIn, authToken]);

  // Computed values
  const showEmptyState = useMemo(() => {
    return !isLoading && !refreshing && commissions.length === 0;
  }, [isLoading, refreshing, commissions.length]);

  // Format currency helper
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  }, []);

  const handleOpenFilter = useCallback(() => {
    setFilterSheetVisible(true);
  }, []);

  const handleCloseFilter = useCallback(() => {
    setFilterSheetVisible(false);
  }, []);

  /**
   * Refresh handler - refreshes commission data
   */
  const handleRefresh = useCallback(async (): Promise<void> => {
    if (!isLoggedIn || refreshing) return;

    try {
      console.log('🔄 Refreshing commissions...');
      dispatch(resetPagination());

      await reload();

      setSnackbarMessage(
        `Refreshed ${commissions.length} commissions successfully`
      );
      setSnackbarVisible(true);
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to refresh commissions';
      setSnackbarMessage(errorMessage);
      setSnackbarVisible(true);
    }
  }, [isLoggedIn, refreshing, reload, dispatch, commissions.length]);

  /**
   * Load more handler - loads next page
   */
  const handleLoadMore = useCallback(async (): Promise<void> => {
    if (!isLoggedIn || isLoading) return;

    try {
      console.log('📜 Loading more commissions...');
      await loadNext();
    } catch (error) {
      console.error('❌ Load more failed:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to load more commissions';
      setSnackbarMessage(errorMessage);
      setSnackbarVisible(true);
    }
  }, [isLoggedIn, isLoading, loadNext]);

  // Handle errors
  useEffect(() => {
    if (error || paginationError) {
      const errorMessage =
        error || paginationError || 'Failed to load commissions';
      console.error('❌ Commission error:', errorMessage);

      Alert.alert('Error', errorMessage, [
        { text: 'Retry', onPress: handleRefresh },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [error, paginationError, handleRefresh]);

  // Commission interaction handlers
  const handleCommissionPress = useCallback((commission: Commission) => {
    console.log('Commission pressed:', commission.id);
    // Navigate to commission detail when implemented
    Toast.show({
      type: 'info',
      text1: 'Commission Details',
      text2: `Selected commission: ${commission.id.substring(0, 8)}...`,
    });
  }, []);

  const handleSearchSubmit = useCallback((query: string) => {
    console.log('Commission search submitted:', query);
  }, []);

  const handleClearSearch = useCallback(() => {
    dispatch(updateSearchTerm(''));
  }, [dispatch]);

  const handleClearAllFilters = useCallback(() => {
    dispatch(clearFilters());
    setSnackbarMessage('All filters cleared');
    setSnackbarVisible(true);
  }, [dispatch]);

  const handleAddLead = useCallback(() => {
    navigation.navigate('HomeTab', { screen: 'AddLead' });
  }, [navigation]);

  // Focus effect
  useFocusEffect(
    React.useCallback(() => {
      if (isLoggedIn) {
        console.log(
          '🔄 CommissionsScreen focused, will auto-refresh if needed'
        );
      }
    }, [isLoggedIn])
  );

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
            Please log in to access your commissions.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Auth')}
            accessibilityRole="button"
            accessibilityLabel="Go to Login"
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render methods
  const renderCommissionItem = useCallback(
    ({ item }: { item: Commission }) => (
      <CommissionListItem
        commission={item}
        onPress={handleCommissionPress}
        testID={`commission-item-${item.id}`}
      />
    ),
    [handleCommissionPress]
  );

  const renderListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>My Commissions</Text>

          <TouchableOpacity
            onPress={handleOpenFilter}
            style={styles.filterButton}
            testID="filter-button"
            accessibilityRole="button"
            accessibilityLabel="Filter commissions"
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
            <Text style={styles.statNumber}>{commissions.length}</Text>
            <Text style={styles.statLabel}>
              {activeFilterCount > 0 ? 'Filtered' : 'Showing'} Commissions
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{allCommissions.length}</Text>
            <Text style={styles.statLabel}>Total Commissions</Text>
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
      </View>
    ),
    [
      commissions.length,
      allCommissions.length,
      activeFilterCount,
      searchText,
      isOnline,
      kpis,
      formatCurrency,
      handleClearSearch,
      handleClearAllFilters,
    ]
  );

  const renderEmptyState = useCallback(() => {
    if (activeFilterCount > 0 || searchText.trim()) {
      return (
        <EmptyCommissionsState
          icon={Assets.icons.magnifyingGlass}
          title="No commissions match your search"
          message={
            searchText && activeFilterCount > 0
              ? `No results for "${searchText}" with the selected filters. Try adjusting your search terms or filters.`
              : searchText
              ? `No results found for "${searchText}". Try a different search term.`
              : 'No commissions match your current filters. Try adjusting your filter criteria.'
          }
          actionText="Clear Filters"
          onActionPress={handleClearAllFilters}
          testID="empty-filtered-state"
        />
      );
    }

    return (
      <EmptyCommissionsState
        icon={Assets.icons.money}
        title="No commissions yet"
        message="Start earning commissions by creating leads and closing deals. Pull to refresh or add new leads to begin."
        actionText="Add Lead"
        onActionPress={handleAddLead}
        testID="empty-default-state"
      />
    );
  }, [activeFilterCount, searchText, handleClearAllFilters, handleAddLead]);

  return (
    <View style={styles.container}>
      <CommissionKPIBar
        kpis={kpis}
        isOnline={isOnline}
        testID="sticky-kpi-bar"
      />

      {/* Individual Filter Chips */}
      <CommissionFilterChips
        filters={currentFilters}
        activeFilterCount={activeFilterCount}
        onClearAll={handleClearAllFilters}
        testID="filter-chips"
      />
      {showEmptyState ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={commissions}
          renderItem={renderCommissionItem}
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
          accessibilityLabel="Commissions list"
          accessibilityHint="Scroll to see more commissions"
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        accessibilityLabel={snackbarMessage}
      >
        {snackbarMessage}
      </Snackbar>
      <CommissionFilterSheet
        visible={filterSheetVisible}
        onDismiss={handleCloseFilter}
        testID="commission-filter-sheet"
      />
    </View>
  );
};

// Styles following CustomersScreen pattern
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
  // authRequiredIcon: {
  //   fontSize: 64,
  //   marginBottom: 24,
  // },
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
    backgroundColor: '#007AFF',
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
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#004C89',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    position: 'relative',
  },
  // filterIcon: {
  //   fontSize: 14,
  //   color: 'white',
  //   marginRight: 4,
  // },
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
  ///////
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
    height: 20,
    marginBottom: 4,
    tintColor: '#004C89',
  },
});

export default CommissionsScreen;
