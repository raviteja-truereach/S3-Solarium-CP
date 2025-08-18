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
// ✅ IMPORT RTK QUERY HOOKS
import {
  useGetLeadsQuery,
  useLazyGetLeadsQuery,
} from '../../store/api/leadApi';

import {
  selectAllLeads,
  selectLeadLoading,
  selectLeadError,
  selectFilters,
  selectActiveFilterCount,
  selectFilteredLeads,
  selectCanLoadMore,
  selectSearchText,
} from '../../store/selectors/leadSelectors';

import {
  setSearchText,
  clearAllFilters,
  resetPagination,
} from '../../store/slices/leadSlice';

import { LeadListItem } from './LeadListItem';
import { EmptyLeadsState } from '../../components/leads/EmptyLeadsState';
import SearchBar from '../../components/leads/SearchBar';
import FilterSheet from '../../components/leads/FilterSheet';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { autoLoadService } from '../../services/autoLoadService';
import { Lead } from '../../database/models/Lead';
import type { RootState } from '../../store/types';
import Toast from 'react-native-toast-message';
import Tooltip from '../../components/common/Tooltip';
import { useIsOnline } from '../../hooks/useConnectivityMemoized';
import { upsertLeads, setLeads } from '../../store/slices/leadSlice';
import { clearPages } from '../../store/slices/leadSlice';
import { Assets } from '../../../assets';

const PERFORMANCE_TARGET_MS = 150;
const MAX_AUTO_LOAD_LEADS = 500;

export const MyLeadsScreen: React.FC<any> = ({ navigation }) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const networkStatus = useNetworkStatus();

  // ✅ USE DIRECT AUTH STATE ACCESS (following your existing pattern)
  const isLoggedIn = useAppSelector(
    (state: RootState) => state.auth.isLoggedIn
  );
  const authToken = useAppSelector((state: RootState) => state.auth.token);

  // Lead state from Redux
  const leads = useAppSelector(selectFilteredLeads);
  const allLeads = useAppSelector(selectAllLeads);
  const isLoading = useAppSelector(selectLeadLoading);
  const error = useAppSelector(selectLeadError);
  const searchText = useAppSelector(selectSearchText);
  const currentFilters = useAppSelector(selectFilters);
  const activeFilterCount = useAppSelector(selectActiveFilterCount);
  const canLoadMore = useAppSelector(selectCanLoadMore);

  const {
    data: initialLeadsData,
    error: initialError,
    isLoading: initialLoading,
    isFetching: initialFetching,
  } = useGetLeadsQuery(
    { page: 1, limit: 20, summary: false }, // ✅ GET ACTUAL LEADS, NOT SUMMARY
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      skip: !isLoggedIn,
    }
  );

  // ✅ ALSO GET SUMMARY DATA FOR OVERDUE COUNT (IF NEEDED)
  const { data: summaryData } = useGetLeadsQuery(
    { summary: true }, // ✅ GET SUMMARY FOR OVERDUE COUNT
    {
      refetchOnMountOrArgChange: true,
      skip: !isLoggedIn,
    }
  );

  // ✅ LAZY QUERIES for manual control
  const [getLeads, { isLoading: loadingMore, isFetching: fetchingMore }] =
    useLazyGetLeadsQuery();

  const [refreshLeads, { isLoading: refreshing, isFetching: refreshFetching }] =
    useLazyGetLeadsQuery();

  // Local state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Refs for tracking
  const previousFiltersRef = useRef(currentFilters);
  const previousSearchRef = useRef(searchText);
  const autoLoadInProgressRef = useRef(false);
  const isOnline = useIsOnline();

  // Performance monitoring
  const filteringStartTime = useRef<number>(0);

  // Add this right after your loading state declarations
  console.log('🔍 Loading States Debug:', {
    initialLoading,
    isLoading,
    refreshing,
    loadingMore,
    initialFetching,
    refreshFetching,
    fetchingMore,
    isLoggedIn,
    authToken: !!authToken,
  });

  useEffect(() => {
    filteringStartTime.current = performance.now();
  }, [searchText, currentFilters]);

  // ✅ CHECK AUTHENTICATION with your existing state structure
  useEffect(() => {
    if (!isLoggedIn || !authToken) {
      console.warn('⚠️ User not authenticated');
      // Don't auto-redirect, let user see auth required screen
    }
  }, [isLoggedIn, authToken]);

  // Computed values
  const showEmptyState = useMemo(() => {
    return !initialLoading && !isLoading && leads.length === 0;
  }, [initialLoading, isLoading, leads.length]);

  // const isOnline =
  //   networkStatus.isConnected && networkStatus.isInternetReachable;

  // ✅ REFRESH HANDLER using RTK Query
  const handleRefresh = useCallback(async () => {
    if (!isLoggedIn || refreshing) return;

    try {
      console.log('🔄 Refreshing leads using RTK Query...');

      // ✅ Clear existing state first
      dispatch(clearPages());
      dispatch(resetPagination());
      setCurrentPage(1);

      const result = await refreshLeads({
        page: 1,
        limit: 20,
        summary: false,
      }).unwrap();

      setSnackbarMessage(
        `Loaded ${result.items?.length || 0} leads successfully`
      );
      setSnackbarVisible(true);
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to refresh leads';
      setSnackbarMessage(errorMessage);
      setSnackbarVisible(true);
    }
  }, [isLoggedIn, refreshing, refreshLeads, dispatch]);

  // ✅ LOAD MORE HANDLER using RTK Query
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !canLoadMore || !isLoggedIn) return;

    try {
      console.log(`📜 Loading page ${currentPage + 1} using RTK Query...`);

      const nextPage = currentPage + 1;
      const result = await getLeads({
        page: nextPage,
        limit: 20,
        summary: false, // ✅ Ensure we get actual leads
      }).unwrap();

      // ✅ Transform and dispatch additional leads
      if (result.items && Array.isArray(result.items)) {
        const transformedLeads: Lead[] = result.items.map((apiLead: any) => ({
          id: apiLead.leadId,
          customer_id: undefined,
          status: apiLead.status,
          priority: 'medium' as const,
          source: 'api',
          product_type: apiLead.services?.join(', ') || '',
          estimated_value: undefined,
          follow_up_date: apiLead.followUpDate || undefined,
          created_at: apiLead.createdAt,
          updated_at: apiLead.updatedAt,
          remarks: undefined,
          address: apiLead.address || '',
          phone: apiLead.phone || '',
          email: undefined,
          sync_status: 'synced' as const,
          local_changes: '{}',
          customerName: apiLead.customerName || '',
          assignedTo: apiLead.assignedTo || '',
          services: apiLead.services || [],
        }));

        dispatch(upsertLeads(transformedLeads));
      }

      setCurrentPage(nextPage);
      console.log(`✅ Loaded page ${nextPage} successfully`);
    } catch (error) {
      console.error('❌ Load more failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load more leads';
      setSnackbarMessage(errorMessage);
      setSnackbarVisible(true);
    }
  }, [loadingMore, canLoadMore, isLoggedIn, currentPage, getLeads, dispatch]);

  // ✅ AUTO-LOAD with RTK Query
  const handleAutoLoad = useCallback(async () => {
    if (autoLoadInProgressRef.current || !isLoggedIn) return;

    autoLoadInProgressRef.current = true;
    console.log('🚀 Starting auto-load using RTK Query...');

    try {
      await autoLoadService.autoLoadPages(
        dispatch,
        async () => {
          const nextPage = Math.floor(allLeads.length / 20) + 1;
          await getLeads({ page: nextPage, limit: 20 }).unwrap();
        },
        () => canLoadMore,
        () => allLeads.length,
        {
          maxLeads: MAX_AUTO_LOAD_LEADS,
          batchSize: 20,
          maxPages: 25,
        }
      );
    } catch (error) {
      console.error('❌ Auto-load failed:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to load complete dataset';
      if (
        !errorMessage.includes('UNAUTHORIZED') &&
        !errorMessage.includes('FORBIDDEN')
      ) {
        setSnackbarMessage('Failed to load complete dataset');
        setSnackbarVisible(true);
      }
    } finally {
      autoLoadInProgressRef.current = false;
    }
  }, [dispatch, canLoadMore, allLeads.length, getLeads, isLoggedIn]);

  // Auto-load logic
  useEffect(() => {
    const filtersChanged =
      JSON.stringify(currentFilters) !==
      JSON.stringify(previousFiltersRef.current);
    const searchChanged = searchText !== previousSearchRef.current;

    if ((filtersChanged || searchChanged) && isLoggedIn) {
      console.log('🔄 Filters/search changed, triggering auto-load:', {
        filtersChanged,
        searchChanged,
        isOnline,
        canLoadMore,
        currentLeadCount: allLeads.length,
      });

      dispatch(resetPagination());
      setCurrentPage(1);

      if (isOnline && canLoadMore && !autoLoadInProgressRef.current) {
        handleAutoLoad();
      }

      previousFiltersRef.current = currentFilters;
      previousSearchRef.current = searchText;
    }
  }, [
    currentFilters,
    searchText,
    isOnline,
    canLoadMore,
    allLeads.length,
    isLoggedIn,
    handleAutoLoad,
    dispatch,
  ]);

  // Handle RTK Query errors
  useEffect(() => {
    if (initialError) {
      console.error('❌ Initial load error:', initialError);
      const errorMessage =
        'error' in initialError ? initialError.error : 'Failed to load leads';

      Alert.alert('Error', errorMessage, [
        { text: 'Retry', onPress: handleRefresh },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [initialError, handleRefresh]);

  // Existing handlers
  const handleCallLead = useCallback((lead: Lead) => {
    const phoneNumber = lead.phone?.replace(/[^0-9+]/g, '');

    if (!phoneNumber) {
      Alert.alert('No Phone Number', 'This lead does not have a phone number.');
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

  const handleLeadPress = useCallback(
    (lead: Lead) => {
      console.log('Lead pressed:', lead.customerName, 'ID:', lead.id);
      navigation.navigate('LeadDetail', { leadId: lead.id });
    },
    [navigation]
  );

  /**
   * Handle Add Lead button press with connectivity check
   */
  const handleAddLead = React.useCallback(() => {
    console.log('📝 Add Lead button pressed');

    // ✅ Early return if offline
    if (!isOnline) {
      console.log('📵 Cannot add lead - device is offline');
      Toast.show({
        type: 'error',
        text1: 'No Internet Connection',
        text2: 'Please connect to the internet to add a new lead.',
      });
      return;
    }

    // ✅ Navigate to AddLead screen (AuthGuard will handle authentication)
    navigation.navigate('AddLead');
  }, [navigation, isOnline]);

  const handleSearchSubmit = useCallback((query: string) => {
    console.log('Search submitted:', query);
  }, []);

  const handleOpenFilter = useCallback(() => {
    setFilterSheetVisible(true);
  }, []);

  const handleCloseFilter = useCallback(() => {
    setFilterSheetVisible(false);
  }, []);

  const handleClearSearch = useCallback(() => {
    dispatch(setSearchText(''));
  }, [dispatch]);

  const handleClearAllFilters = useCallback(() => {
    autoLoadService.cancelAutoLoad();
    dispatch(clearAllFilters());
    setSnackbarMessage('All filters cleared');
    setSnackbarVisible(true);
  }, [dispatch]);

  // ✅ LOAD ON FOCUS - Following your HomeScreen pattern
  useFocusEffect(
    React.useCallback(() => {
      if (isLoggedIn) {
        console.log('🔄 Screen focused, leads will auto-refetch via RTK Query');
        // RTK Query handles this automatically with refetchOnFocus: true
      }
    }, [isLoggedIn])
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      autoLoadService.cancelAutoLoad();
    };
  }, []);

  // ADD this effect after your existing useEffects
  useEffect(() => {
    console.log('🔍 RTK Query Data Effect:', {
      hasData: !!initialLeadsData,
      isLoading: initialLoading,
      error: initialError,
    });

    if (initialLeadsData && !initialLoading && !initialError) {
      console.log('📥 Processing RTK Query leads data:', initialLeadsData);

      // ✅ Dispatch RTK Query data to Redux state for selectors
      if (initialLeadsData.items && Array.isArray(initialLeadsData.items)) {
        console.log(
          '✅ Dispatching leads to Redux state:',
          initialLeadsData.items.length
        );

        // Transform API data to Lead format (reuse existing transformation)
        const transformedLeads: Lead[] = initialLeadsData.items.map(
          (apiLead: any) => ({
            id: apiLead.leadId,
            customer_id: undefined,
            status: apiLead.status,
            priority: 'medium' as const,
            source: 'api',
            product_type: apiLead.services?.join(', ') || '',
            estimated_value: undefined,
            follow_up_date: apiLead.followUpDate || undefined,
            created_at: apiLead.createdAt,
            updated_at: apiLead.updatedAt,
            remarks: undefined,
            address: apiLead.address || '',
            phone: apiLead.phone || '',
            email: undefined,
            sync_status: 'synced' as const,
            local_changes: '{}',
            customerName: apiLead.customerName || '',
            assignedTo: apiLead.assignedTo || '',
            services: apiLead.services || [],
          })
        );

        // Dispatch to Redux state
        dispatch(upsertLeads(transformedLeads));
      } else {
        console.warn('⚠️ No items array in RTK Query response');
      }
    }
  }, [initialLeadsData, initialLoading, initialError, dispatch]);

  // ✅ ALSO HANDLE LAZY QUERY RESULTS
  useEffect(() => {
    // Handle refresh results
    if (refreshLeads.data && !refreshing) {
      console.log('🔄 Processing refresh data');
      if (refreshLeads.data.items && Array.isArray(refreshLeads.data.items)) {
        const transformedLeads: Lead[] = refreshLeads.data.items.map(
          (apiLead: any) => ({
            id: apiLead.leadId,
            customer_id: undefined,
            status: apiLead.status,
            priority: 'medium' as const,
            source: 'api',
            product_type: apiLead.services?.join(', ') || '',
            estimated_value: undefined,
            follow_up_date: apiLead.followUpDate || undefined,
            created_at: apiLead.createdAt,
            updated_at: apiLead.updatedAt,
            remarks: undefined,
            address: apiLead.address || '',
            phone: apiLead.phone || '',
            email: undefined,
            sync_status: 'synced' as const,
            local_changes: '{}',
            customerName: apiLead.customerName || '',
            assignedTo: apiLead.assignedTo || '',
            services: apiLead.services || [],
          })
        );

        dispatch(setLeads(transformedLeads)); // Use setLeads for refresh
      }
    }
  }, [refreshLeads.data, refreshing, dispatch]);

  // Auto-refresh effect for status updates
  // Auto-refresh effect for status updates - CORRECTED VERSION
  useEffect(() => {
    console.log('📱 MyLeadsScreen: Setting up auto-refresh listener');

    // Listen for lead updates in Redux state
    const checkForUpdates = () => {
      const currentLeadCount = leads.length;
      const lastUpdateTime = allLeads.reduce((latest, lead) => {
        const leadTime = new Date(lead.updated_at || 0).getTime();
        return leadTime > latest ? leadTime : latest;
      }, 0);

      // If we have recent updates (within last 10 seconds), consider refreshing
      const now = Date.now();
      const timeSinceUpdate = now - lastUpdateTime;

      if (timeSinceUpdate < 10000 && currentLeadCount > 0) {
        console.log('🔄 Recent lead updates detected, ensuring fresh data');

        // Use your existing refreshLeads method
        refreshLeads({ summary: false, page: 1, limit: 20 });
      }
    };

    // Check for updates when component receives new data
    const timeoutId = setTimeout(checkForUpdates, 1000);

    return () => clearTimeout(timeoutId);
  }, [leads.length, allLeads, refreshLeads]);

  // Focus effect for returning from LeadDetailScreen - CORRECTED VERSION
  useFocusEffect(
    useCallback(() => {
      console.log('📱 MyLeadsScreen focused');

      // Small delay to allow any pending updates to complete
      const focusTimeoutId = setTimeout(() => {
        console.log('🔄 Refreshing leads after screen focus');
        refreshLeads({ summary: false, page: 1, limit: 20 });
      }, 500);

      return () => clearTimeout(focusTimeoutId);
    }, [refreshLeads])
  );

  // ✅ EARLY RETURN IF NOT AUTHENTICATED using your existing state
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
            Please log in to access your leads.
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

  // Render methods remain the same...
  const renderLeadItem = useCallback(
    ({ item }: { item: Lead }) => (
      <TouchableOpacity
        style={styles.leadItem}
        onPress={() => handleLeadPress(item)}
        testID={`lead-item-${item.id}`}
      >
        <View style={styles.leadHeader}>
          <Text style={styles.leadName}>{item.customerName}</Text>
          <Text style={styles.leadStatus}>{item.status}</Text>
        </View>
  
        <View style={styles.leadContactInfo}>
          <View style={styles.leadPhoneContainer}>
            <View style={styles.phoneRow}>
              <Image
                source={Assets.icons.phoneCall}
                style={styles.contactIcon}
                resizeMode="contain"
              />
              <Text style={styles.leadPhone}>{item.phone}</Text>
            </View>
  
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCallLead(item)}
              testID={`call-button-${item.id}`}
            >
              <Image
                source={Assets.icons.call}
                style={styles.callButtonIcon}
                resizeMode="contain"
              />
              <Text style={styles.callButtonText}>Call</Text>
            </TouchableOpacity>
          </View>
  
          <View style={styles.addressRow}>
            <Image
              source={Assets.icons.location}
              style={styles.contactIcon}
              resizeMode="contain"
            />
            <Text style={styles.leadAddress} numberOfLines={1}>
              {item.address}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [handleLeadPress, handleCallLead]
  );

  const renderListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>My Leads</Text>
  
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
            <Text style={styles.statNumber}>{leads.length}</Text>
            <Text style={styles.statLabel}>
              {activeFilterCount > 0 ? 'Filtered' : 'Showing'} Leads
            </Text>
          </View>
  
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{allLeads.length}</Text>
            <Text style={styles.statLabel}>Total Leads</Text>
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
      leads.length,
      allLeads.length,
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
        <EmptyLeadsState
          icon={Assets.icons.magnifyingGlass}
          title="No leads match your filters"
          message={
            searchText && activeFilterCount > 0
              ? `No results for "${searchText}" with the selected filters. Try adjusting your search terms or filters.`
              : searchText
              ? `No results found for "${searchText}". Try a different search term.`
              : 'No leads match your current filters. Try adjusting your filter criteria.'
          }
          actionText="Clear Filters"
          onActionPress={handleClearAllFilters}
          testID="empty-filtered-state"
        />
      );
    }
  
    return (
      <EmptyLeadsState
        icon={Assets.icons.clipboard}
        title="No leads yet"
        message="No leads found. Pull to refresh or check your internet connection."
        actionText="Refresh"
        onActionPress={handleRefresh}
        testID="empty-default-state"
      />
    );
  }, [activeFilterCount, searchText, handleClearAllFilters, handleRefresh]);

  return (
    <View style={styles.container}>
      <SearchBar
        testID="my-leads-search-bar"
        loading={false}
        onSearchSubmit={handleSearchSubmit}
      />

      {showEmptyState ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={leads}
          renderItem={renderLeadItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || refreshFetching} // ✅ RTK Query states
              onRefresh={handleRefresh}
              colors={['#004C89']}
              tintColor="#004C89"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          accessibilityLabel="Leads list"
          accessibilityHint="Scroll to see more leads"
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      )}
      <Tooltip
        content={isOnline ? 'Add new lead' : 'No internet – cannot add lead'}
        placement="top"
      >
        <TouchableOpacity
          style={[
            styles.fab,
            // ✅ Grey out FAB when offline
            !isOnline && styles.fabDisabled,
          ]}
          onPress={handleAddLead}
          accessibilityLabel="Add new lead"
          accessibilityRole="button"
          testID="add-lead-fab"
        >
          <Image
            source={Assets.icons.plus}
            style={styles.fabIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Tooltip>

      <FilterSheet
        visible={filterSheetVisible}
        onDismiss={handleCloseFilter}
        testID="lead-filter-sheet"
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

// All styles remain exactly the same as before...
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
  leadItem: {
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leadName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  leadStatus: {
    fontSize: 12,
    color: '#004C89',
    fontWeight: '600',
    backgroundColor: 'rgba(0, 76, 137, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  leadContactInfo: {
    gap: 4,
  },
  leadPhoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leadPhone: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  // callButtonIcon: {
  //   fontSize: 12,
  //   color: 'white',
  //   marginRight: 4,
  // },
  callButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  leadAddress: {
    fontSize: 12,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#004C89',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  // fabIcon: {
  //   fontSize: 24,
  //   color: 'white',
  //   fontWeight: 'bold',
  // },
  autoLoadIndicator: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  autoLoadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingMore: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 8,
    marginHorizontal: 20,
    borderRadius: 20,
  },
  loadingMoreText: {
    color: 'white',
    fontSize: 12,
  },
  fabDisabled: {
    backgroundColor: '#BDBDBD', // Grey background when disabled
    opacity: 0.6,
  },
  /////
  contactIcon: {
    width: 14,
    height: 14,
    marginRight: 8,
    tintColor: '#666',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIcon: {
    width: 12,
    height: 12,
    marginRight: 4,
    tintColor: 'white',
  },
  connectionStatusIcon: {
    marginTop: 6,
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
  callButtonIcon: {
    width: 12,
    height: 12,
    marginRight: 4,
    tintColor: 'white',
  },
  authRequiredIcon: {
    width: 64,
    height: 64,
    marginBottom: 24,
    tintColor: '#666',
  },
  fabIcon: {
    width: 28,
    height: 28,
    tintColor: 'white',
  },
});

export default MyLeadsScreen;
