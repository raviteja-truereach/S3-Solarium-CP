import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  useGetQuotationsQuery,
  useShareQuotationMutation,
  useGetQuotationPdfQuery,
} from '../../store/api/quotationApi';
import { useQuotations } from '../../hooks/useQuotations';
import { QuotationListItem } from './QuotationListItem';
// import { EmptyLeadsState } from '../../components/leads/EmptyLeadsState';
import { QuotationEmptyState } from '../../components/quotations/QuotationEmptyState';
import type { QuotationEmptyStateType } from '../../components/quotations/QuotationEmptyState';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { useConnectivity } from '../../contexts/ConnectivityContext';
import {
  setSearchText,
  clearAllFilters,
} from '../../store/slices/quotationSlice';
import {
  selectQuotationSearchText,
  selectQuotationFilters,
  selectQuotationState,
  selectQuotationsArray,
} from '../../store/selectors/quotationSelectors';
import { QuotationSearchBar } from '../../components/quotations/QuotationSearchBar';
import { QuotationFilterSheet } from '../../components/quotations/QuotationFilterSheet';
import { openQuotationPdf, handlePdfError } from '../../utils/pdfHandler';
import Toast from 'react-native-toast-message';
import type { RootState } from '../../store/types';
import type { Quotation } from '../../types/quotation';
import { useLazyGetQuotationPdfQuery } from '../../store/api/quotationApi';
import { useIsOnline } from '@hooks/useConnectivityMemoized';
import { Assets } from '../../../assets';
/**
 * QuotationsScreen Component
 * Main screen for displaying and managing quotations
 */

const getQuotationSource = (
  isOnline: boolean,
  hasApiData: boolean,
  hasCachedData: boolean
): 'api' | 'cache' | 'none' => {
  if (isOnline && hasApiData) return 'api';
  if (hasCachedData) return 'cache';
  return 'none';
};

export const QuotationsScreen: React.FC = () => {
  const theme = useTheme();
  const { isOnline } = useConnectivity();
  const isOnlineStatus = useIsOnline();

  // Auth state
  const isLoggedIn = useAppSelector(
    (state: RootState) => state.auth.isLoggedIn
  );
  const dispatch = useAppDispatch();

  // Search and filter state
  const searchText = useAppSelector(selectQuotationSearchText);
  const filters = useAppSelector(selectQuotationFilters);
  const quotationState = useAppSelector(selectQuotationState);

  // Get cached quotations from Redux state (populated by preloadCacheData)
  const cachedQuotations = useAppSelector(selectQuotationsArray);

  // Local state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [sharingQuotationId, setSharingQuotationId] = useState<string | null>(
    null
  );
  const [loadingPdfQuotationId, setLoadingPdfQuotationId] = useState<
    string | null
  >(null);

  // Use quotations hook for filtered data
  const { quotations, loading, error, refetch } = useQuotations();

  // RTK Query for online data fetch (only when online)
  const {
    data: apiQuotationsData,
    isLoading: initialLoading,
    isFetching: initialFetching,
    refetch: refetchQuery,
  } = useGetQuotationsQuery(
    { offset: 0, limit: 25 },
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      skip: !isLoggedIn || !isOnlineStatus,
    }
  );

  // Share mutation
  const [shareQuotation] = useShareQuotationMutation();
  const [getPdf] = useLazyGetQuotationPdfQuery();

  // Determine data source and quotations to display
  const dataSource = useMemo(() => {
    return getQuotationSource(
      isOnlineStatus,
      !!apiQuotationsData?.length,
      cachedQuotations.length > 0
    );
  }, [isOnlineStatus, apiQuotationsData, cachedQuotations.length]);

  // Use filtered quotations (either from API or cache)
  const displayQuotations = useMemo(() => {
    if (isOnlineStatus && quotations.length > 0) {
      // Online: use filtered quotations from hook
      return quotations;
    } else if (cachedQuotations.length > 0) {
      // Offline: use cached quotations
      return cachedQuotations;
    }
    return [];
  }, [isOnlineStatus, quotations, cachedQuotations]);

  // Rest of the component remains the same...

  /**
   * Handle quotation share with optimistic update
   */
  const handleQuotationShare = useCallback(
    async (quotation: Quotation) => {
      if (!isOnline) {
        Toast.show({
          type: 'error',
          text1: 'No Internet Connection',
          text2: 'Please connect to the internet to share quotations.',
        });
        return;
      }

      if (quotation.status.toLowerCase() !== 'created') {
        Toast.show({
          type: 'error',
          text1: 'Cannot Share',
          text2: 'Only quotations with "Created" status can be shared.',
        });
        return;
      }

      try {
        setSharingQuotationId(quotation.quotationId);
        console.log('🔄 Sharing quotation:', quotation.quotationId);
        console.log('🔍 Quotation status:', quotation.status);

        await shareQuotation(quotation.quotationId).unwrap();

        Toast.show({
          type: 'success',
          text1: 'Quotation Shared',
          text2: `Quotation ${quotation.quotationId} has been shared successfully.`,
        });

        console.log('✅ Quotation shared successfully:', quotation.quotationId);
      } catch (error) {
        console.error('❌ Share failed:', error);

        Toast.show({
          type: 'error',
          text1: 'Share Failed',
          text2:
            typeof error === 'string'
              ? error
              : 'Failed to share quotation. Please try again.',
        });
      } finally {
        setSharingQuotationId(null);
      }
    },
    [isOnline, shareQuotation]
  );

  /**
   * Handle PDF view with RTK Query
   */
  const handleViewPdf = useCallback(
    async (quotation: Quotation) => {
      if (!isOnline) {
        Toast.show({
          type: 'error',
          text1: 'No Internet Connection',
          text2: 'Please connect to the internet to view PDF.',
        });
        return;
      }

      const pdfStatuses = ['shared', 'accepted', 'rejected'];
      if (!pdfStatuses.includes(quotation.status.toLowerCase())) {
        Toast.show({
          type: 'error',
          text1: 'PDF Not Available',
          text2:
            'PDF is only available for shared, accepted, or rejected quotations.',
        });
        return;
      }

      try {
        setLoadingPdfQuotationId(quotation.quotationId);
        console.log('🔍 Fetching PDF for quotation:', quotation.quotationId);

        // Use RTK Query lazy hook to fetch PDF URL
        const result = await getPdf(quotation.quotationId);

        if (result.error) {
          throw new Error(
            typeof result.error === 'string'
              ? result.error
              : 'Failed to fetch PDF'
          );
        }

        if (!result.data) {
          throw new Error('No PDF URL received');
        }

        const pdfUrl = result.data;
        console.log('📄 Opening PDF URL:', pdfUrl);
        await openQuotationPdf(pdfUrl);

        Toast.show({
          type: 'success',
          text1: 'PDF Opened',
          text2: 'Quotation PDF opened successfully.',
        });
      } catch (error) {
        console.error('❌ PDF view failed:', error);

        const errorMessage = handlePdfError(error);
        Toast.show({
          type: 'error',
          text1: 'PDF Error',
          text2: errorMessage,
        });
      } finally {
        setLoadingPdfQuotationId(null);
      }
    },
    [isOnline, getPdf]
  );

  // Determine loading state
  const isLoading = useMemo(() => {
    return initialLoading || loading || isRefreshing;
  }, [initialLoading, loading, isRefreshing]);

  // Determine if we should show empty state
  const showEmptyState = useMemo(() => {
    return !isLoading && quotations.length === 0;
  }, [isLoading, quotations.length]);

  /**
   * Handle pull-to-refresh with enhanced error handling
   */
  const handleRefresh = useCallback(async () => {
    if (!isLoggedIn) return;

    try {
      setIsRefreshing(true);
      console.log('🔄 Refreshing quotations...');

      if (!isOnlineStatus) {
        // Offline refresh - just refresh local data
        await refetch();
        Toast.show({
          type: 'info',
          text1: 'Offline Mode',
          text2:
            'Showing cached quotations. Connect to internet for latest data.',
        });
        return;
      }

      // Online refresh
      await Promise.all([refetch(), refetchQuery()]);

      Toast.show({
        type: 'success',
        text1: 'Refreshed Successfully',
        text2: `Updated quotations data at ${new Date().toLocaleTimeString()}`,
      });
    } catch (error) {
      console.error('❌ Refresh failed:', error);

      let errorMessage = 'Failed to refresh quotations';
      let errorTitle = 'Refresh Failed';

      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Check for specific error types
      if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        errorTitle = 'Network Error';
        errorMessage = 'Please check your internet connection and try again.';
      } else if (
        errorMessage.includes('401') ||
        errorMessage.includes('unauthorized')
      ) {
        errorTitle = 'Session Expired';
        errorMessage = 'Please log in again to continue.';
      } else if (errorMessage.includes('500')) {
        errorTitle = 'Server Error';
        errorMessage =
          'The server is experiencing issues. Please try again later.';
      }

      Toast.show({
        type: 'error',
        text1: errorTitle,
        text2: errorMessage,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [isLoggedIn, isOnlineStatus, refetch, refetchQuery]);

  /**
   * Handle quotation item press
   */
  const handleQuotationPress = useCallback((quotation: Quotation) => {
    // TODO: Navigate to quotation detail screen
    console.log('Quotation pressed:', quotation.quotationId);
  }, []);

  /**
   * Render individual quotation item
   */
  const renderQuotationItem = useCallback(
    ({ item }: { item: Quotation }) => (
      <QuotationListItem
        quotation={item}
        onPress={handleQuotationPress}
        onShare={handleQuotationShare}
        onViewPdf={handleViewPdf}
        isSharing={sharingQuotationId === item.quotationId}
        isLoadingPdf={loadingPdfQuotationId === item.quotationId}
        testID={`quotation-item-${item.quotationId}`}
      />
    ),
    [
      handleQuotationPress,
      handleQuotationShare,
      handleViewPdf,
      sharingQuotationId,
      loadingPdfQuotationId,
    ]
  );

  /**
   * Handle search submission - trigger API search for Lead ID if it looks like a Lead ID
   */
  const handleSearchSubmit = useCallback((query: string) => {
    console.log('Quotation search submitted:', query);

    const trimmedQuery = query.trim();

    // If query looks like a Lead ID (you can adjust this logic based on your Lead ID format)
    // For example, if Lead IDs start with "LEAD" or have a specific pattern
    if (
      trimmedQuery.length > 3 &&
      trimmedQuery.toUpperCase().startsWith('LEAD')
    ) {
      console.log('search api is getting triggered');
      // Trigger API search with Lead ID
      // setSearchLeadId(trimmedQuery);
    } else {
      console.log('search api is not getting triggered');
      // Clear API search, rely on client-side filtering
      // setSearchLeadId(null);
    }
  }, []);

  /**
   * Handle opening filter sheet
   */
  const handleOpenFilter = useCallback(() => {
    setFilterSheetVisible(true);
  }, []);

  /**
   * Handle closing filter sheet
   */
  const handleCloseFilter = useCallback(() => {
    setFilterSheetVisible(false);
  }, []);

  /**
   * Handle clearing all filters and search
   */
  const handleClearAllFilters = useCallback(() => {
    dispatch(clearAllFilters());
    // setSearchLeadId(null); // Clear API search
  }, [dispatch]);

  /**
   * Handle clearing search text
   */
  const handleClearSearch = useCallback(() => {
    dispatch(setSearchText(''));
  }, [dispatch]);

  /**
   * Render empty state with comprehensive error handling
   */
  const renderEmptyState = useCallback(() => {
    const activeFilterCount = filters.statuses.length;
    const hasSearchText = searchText.trim().length > 0;

    // Determine empty state type based on current conditions
    let emptyStateType: QuotationEmptyStateType;
    let customMessage = '';

    // Error state - API/Network errors
    if (error) {
      if (typeof error === 'string') {
        if (error.includes('401') || error.includes('Session expired')) {
          emptyStateType = 'unauthorized';
        } else if (error.includes('500') || error.includes('Server error')) {
          emptyStateType = 'server-error';
        } else if (error.includes('Network') || error.includes('FETCH_ERROR')) {
          emptyStateType = 'error';
          customMessage = 'Network error. Check your connection and try again.';
        } else {
          emptyStateType = 'error';
          customMessage = error;
        }
      } else {
        emptyStateType = 'error';
      }

      return (
        <QuotationEmptyState
          type={emptyStateType}
          message={customMessage || undefined}
          onRetry={handleRefresh}
          retryDisabled={isLoading}
          testID="quotations-error-state"
        />
      );
    }

    // Filtered state - Search or filter applied with no results
    if (hasSearchText || activeFilterCount > 0) {
      let filterMessage = '';

      if (hasSearchText && activeFilterCount > 0) {
        filterMessage = `No results for "${searchText}" with the selected filters. Try adjusting your search terms or filters.`;
      } else if (hasSearchText) {
        filterMessage = `No results found for "${searchText}". Try a different search term.`;
      } else {
        filterMessage =
          'No quotations match your current filters. Try adjusting your filter criteria.';
      }

      return (
        <QuotationEmptyState
          type="filtered"
          message={filterMessage}
          onRetry={handleClearAllFilters}
          actionText="Clear Filters"
          onSecondaryAction={handleRefresh}
          secondaryActionText="Refresh Data"
          testID="quotations-filtered-state"
        />
      );
    }

    // Offline state - No internet and no cached data
    if (!isOnlineStatus && cachedQuotations.length === 0) {
      return (
        <QuotationEmptyState
          type="offline"
          onRetry={handleRefresh}
          actionText="Try Again"
          testID="quotations-offline-state"
        />
      );
    }

    // Default empty state - No quotations exist
    return (
      <QuotationEmptyState
        type="none"
        message={
          isOnlineStatus
            ? 'No quotations found. Create quotations for your leads to get started with pricing and proposals.'
            : 'No quotations available offline. Connect to internet to sync the latest data.'
        }
        onRetry={handleRefresh}
        actionText={isOnlineStatus ? 'Refresh' : 'Check Connection'}
        retryDisabled={isLoading}
        testID="quotations-default-empty-state"
      />
    );
  }, [
    error,
    filters.statuses.length,
    searchText,
    isOnlineStatus,
    cachedQuotations.length,
    isLoading,
    handleRefresh,
    handleClearAllFilters,
  ]);

  /**
   * Render header component matching MyLeadsScreen pattern
   */
  const renderListHeader = useCallback(() => {
    const activeFilterCount = filters.statuses.length;

    return (
      <View style={styles.listHeader}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Quotations</Text>

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
            <Text style={styles.statNumber}>{displayQuotations.length}</Text>
            <Text style={styles.statLabel}>
              {activeFilterCount > 0 ? 'Filtered' : 'Showing'} Quotations
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{quotations.length}</Text>
            <Text style={styles.statLabel}>Total Quotations</Text>
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
                onPress={() => dispatch(setSearchText(''))}
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
    );
  }, [
    quotations.length,
    filters.statuses.length,
    searchText,
    isOnline,
    handleOpenFilter,
    handleClearAllFilters,
    dispatch,
  ]);

  return (
    <View style={styles.container}>
      <QuotationSearchBar
        testID="quotation-search-bar"
        loading={isLoading}
        onSearchSubmit={handleSearchSubmit}
        placeholder="Search By Lead ID"
      />

      {showEmptyState ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={displayQuotations}
          renderItem={renderQuotationItem}
          keyExtractor={(item) => item.quotationId}
          ListHeaderComponent={renderListHeader}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing || initialFetching}
              onRefresh={handleRefresh}
              colors={['#004C89']}
              tintColor="#004C89"
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          accessibilityLabel="Quotations list"
          accessibilityHint="Scroll to see more quotations"
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          testID="quotations-list"
        />
      )}

      <QuotationFilterSheet
        visible={filterSheetVisible}
        onDismiss={handleCloseFilter}
        testID="quotation-filter-sheet"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  listHeader: {
    // paddingHorizontal: 16,
    // paddingVertical: 12,
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
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
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
  ////////
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
  chipIcon: {
    width: 12,
    height: 12,
    marginRight: 6,
    tintColor: '#004C89',
  },
});
export default QuotationsScreen;
