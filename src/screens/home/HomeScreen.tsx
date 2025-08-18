/**
 * Home Screen
 * Main dashboard showing live metrics, quick actions, and recent activity
 *
 * Features:
 * - Live dashboard metrics with automatic updates
 * - Sync status and manual sync trigger
 * - Quick action buttons
 * - Recent leads/activities preview
 * - Proper accessibility and performance optimization
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import {
  useTheme,
  Button,
  Card,
  Title,
  Paragraph,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import type { MD3Theme } from 'react-native-paper';
import { useAppSelector } from '../../hooks/reduxHooks';
import { selectLastSyncTs } from '../../store/slices/networkSlice';
import { useConnectivity } from '../../contexts/ConnectivityContext';
import { formatRelativeTime } from '../../utils/date';
import { OfflineBanner } from '../../components/common/OfflineBanner';

// Redux - adjusted paths for home subfolder structure
import { useAppSelectorShallow } from '../../store/hooks';
import {
  selectDashboardSummary,
  selectSyncInProgress,
  selectLastSyncAt,
  selectNetworkError,
} from '../../store/slices/networkSlice';
import { selectLeads } from '../../store/slices/leadSlice';

// Components - adjusted path for home subfolder
import { DashboardStatCard } from '../../components/dashboard';

// Services - adjusted path for home subfolder
import { getSyncManager } from '../../sync/SyncManager';

import type { HomeScreenProps } from '../../navigation/types';
import { navigate } from '../../navigation/navigationRef';
import { useGetDashboardSummaryQuery } from '../../store/api/dashboardApi';
import { useDispatch } from 'react-redux';
import { setDashboardSummary } from '../../store/slices/networkSlice';
import { TopBar } from '../../components/common/TopBar';
import AppButton from '@components/common/AppButton';
import SQLite from 'react-native-sqlite-storage';
import { getCurrentSchemaVersion } from '../../database/migrations';
import { openDatabase } from '../../database/database';

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = createStyles(theme);
  const lastSyncTs = useAppSelector(selectLastSyncTs);
  const { isConnected } = useConnectivity();
  console.log('isConnected in home screen', isConnected);
  // const dispatch = useAppDispatch();

  // Redux state with performance optimization
  const dashboardSummary = useAppSelectorShallow(selectDashboardSummary);
  const syncInProgress = useAppSelectorShallow(selectSyncInProgress);
  const lastSyncAt = useAppSelectorShallow(selectLastSyncAt);
  const networkError = useAppSelectorShallow(selectNetworkError);
  const recentLeads = useAppSelectorShallow(
    (state) => selectLeads(state)?.slice(0, 3) || []
  );

  // Local state
  const [isOffline, setIsOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncDisplay, setLastSyncDisplay] = useState<string>('Never');

  // RTK Query hook for dashboard data
  const {
    data: summaryData,
    error: summaryError,
    isLoading: summaryLoading,
    refetch: refetchSummary,
    isFetching,
  } = useGetDashboardSummaryQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });

  // Sync RTK Query data to Redux state
  useEffect(() => {
    if (summaryData) {
      console.log('✅ Dashboard data received:', summaryData);
      dispatch(setDashboardSummary(summaryData));
    }
  }, [summaryData, dispatch]);

  // Refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🏠 HomeScreen focused, refreshing data...');
      refetchSummary();
    }, [refetchSummary])
  );

  // const handleRefresh = useCallback(() => {
  //   console.log('🔄 Manual refresh triggered');
  //   refetchSummary();
  // }, [refetchSummary]);

  // Network connectivity monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !state.isConnected || state.isInternetReachable === false;
      setIsOffline(offline);
    });

    return unsubscribe;
  }, []);

  // Update last sync display
  useEffect(() => {
    if (lastSyncAt) {
      const updateDisplay = () => {
        const now = Date.now();
        const diff = now - lastSyncAt;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) {
          setLastSyncDisplay('Just now');
        } else if (minutes < 60) {
          setLastSyncDisplay(`${minutes}m ago`);
        } else if (hours < 24) {
          setLastSyncDisplay(`${hours}h ago`);
        } else {
          setLastSyncDisplay(`${days}d ago`);
        }
      };

      updateDisplay();
      const interval = setInterval(updateDisplay, 60000); // Update every minute

      return () => clearInterval(interval);
    } else {
      setLastSyncDisplay('Never');
    }
  }, [lastSyncAt]);

  // Determine if we have cached data
  const hasCache = Boolean(lastSyncAt && lastSyncAt > 0);

  // Manual sync handler
  const handleManualSync = useCallback(async () => {
    if (syncInProgress) return;

    try {
      const syncManager = getSyncManager();
      const result = await syncManager.manualSync('manual');

      if (!result.success) {
        Alert.alert(
          'Sync Failed',
          result.error || 'Unable to sync data. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Manual sync error:', error);
      Alert.alert(
        'Sync Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [syncInProgress]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await handleManualSync();
    setRefreshing(false);
  }, [handleManualSync]);

  // Screen focus handler - refresh data when screen becomes active
  useFocusEffect(
    useCallback(() => {
      // Optional: Auto-sync when screen gains focus if data is stale
      const shouldAutoSync = lastSyncAt && Date.now() - lastSyncAt > 300000; // 5 minutes
      if (shouldAutoSync && !syncInProgress) {
        handleManualSync();
      }
    }, [lastSyncAt, syncInProgress, handleManualSync])
  );

  // FIND and REPLACE the navigation functions:
  const navigateToLeads = useCallback(() => {
    navigation.navigate('MyLeads');
  }, [navigation]);

  const navigateToCustomers = useCallback(() => {
    navigate('Main', {
      screen: 'Customers',
      params: { screen: 'CustomersList' },
    });
  }, []);

  const navigateToQuotations = useCallback(() => {
    navigate('Main', { screen: 'Quotations' });
  }, []);

  const navigateToAddLead = useCallback(() => {
    // Will be implemented in Sprint 3
    console.log('Navigate to add lead - Coming soon');
  }, []);

  const navigateToDocumentTest = () => {
    navigation.navigate('TestCustomerEnhancements');
  };

  // Add this button to test migration
  const testMigration = async () => {
    try {
      const db = await openDatabase();

      const version = await getCurrentSchemaVersion(db);
      console.log('📊 Current schema version:', version);
      // alert(`Current schema version: ${version}`);
    } catch (error) {
      console.error('❌ Migration test failed:', error);
      // alert(`Migration test failed: ${error.message}`);
    }
  };

  const navigateToCommissions = useCallback(() => {
    // Option 1: If using current tab navigation
    navigate('Main', { screen: 'Commissions' });

    // Option 2: If using drawer navigation (comment out Option 1 and use this)
    // navigate('Main', {
    //   screen: 'CommissionStack',
    //   params: { screen: 'CommissionsList' },
    // });
  }, []);

  return (
    <View style={styles.container}>
      <TopBar
        title="Dashboard"
        showSync={true}
        showNotifications={true}
        showProfile={true}
      />
      <ScrollView
        style={styles.content}
        testID="home-screen"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header Section */}
        {/* <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Title style={styles.headerTitle}>Dashboard</Title>
              <Paragraph style={styles.headerSubtitle}>
                Welcome back! Here's your overview.
              </Paragraph>
            </View>
            <View style={styles.syncContainer}>
              {syncInProgress ? (
                <View style={styles.syncingStatus}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.syncText}>Syncing...</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.syncButton}
                  onPress={handleManualSync}
                  disabled={isOffline}
                  testID="sync-button"
                >
                  <Text
                    style={[
                      styles.syncIcon,
                      isOffline && styles.syncTextDisabled,
                    ]}
                  >
                    ↻
                  </Text>
                  <Text
                    style={[
                      styles.syncText,
                      isOffline && styles.syncTextDisabled,
                    ]}
                  >
                    {lastSyncDisplay}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isOffline && (
            <View style={styles.offlineBar}>
              <Text style={styles.offlineText}>
                📶 You're offline. Some data may be outdated.
              </Text>
            </View>
          )}
          {networkError && !syncInProgress && (
            <View style={styles.errorBar}>
              <Text style={styles.errorText}>⚠️ {networkError}</Text>
              <TouchableOpacity onPress={handleManualSync}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View> */}

        {/* Dashboard Metrics - Live Data */}
        <View style={styles.metricsContainer}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          {/* <TouchableOpacity
            style={styles.testButton}
            onPress={navigateToDocumentTest}
          >
            <Text style={styles.testButtonText}>🧪 Test Document Module</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.testButton} onPress={testMigration}>
            <Text style={styles.testButtonText}>🧪 Test Migration</Text>
          </TouchableOpacity> */}

          <View style={styles.metricsGrid}>
            {/* First Row */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <DashboardStatCard
                  title="Today Pending"
                  value={dashboardSummary?.todayPending}
                  isOffline={isOffline}
                  hasCache={hasCache}
                  testID="today-pending-card"
                />
              </View>

              <View style={styles.metricItem}>
                <DashboardStatCard
                  title="Overdue"
                  value={dashboardSummary?.overdue}
                  isOffline={isOffline}
                  hasCache={hasCache}
                  testID="overdue-card"
                />
              </View>
            </View>

            {/* Second Row */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <DashboardStatCard
                  title="Total Leads"
                  value={dashboardSummary?.total}
                  isOffline={isOffline}
                  hasCache={hasCache}
                  testID="total-leads-card"
                />
              </View>

              {/* Conditional: New Leads if available */}
              <View style={styles.metricItem}>
                {dashboardSummary?.newLeads !== undefined ? (
                  <DashboardStatCard
                    title="New Leads"
                    value={dashboardSummary.newLeads}
                    isOffline={isOffline}
                    hasCache={hasCache}
                    testID="new-leads-card"
                  />
                ) : (
                  <DashboardStatCard
                    title="In Progress"
                    value={dashboardSummary?.inProgress}
                    isOffline={isOffline}
                    hasCache={hasCache}
                    testID="in-progress-card"
                  />
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddLead')}
              style={[styles.actionButton, styles.containedButton]}
              testID="add-lead-button"
              accessibilityRole="button"
              accessibilityLabel="Add Lead"
            >
              <Text style={[styles.buttonText, styles.containedButtonText]}>
                + Add Lead
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={navigateToLeads}
              style={[styles.actionButton, styles.outlinedButton]}
              testID="view-leads-button"
              accessibilityRole="button"
              accessibilityLabel="View Leads"
            >
              <Text style={[styles.buttonText, styles.outlinedButtonText]}>
                View Leads
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={navigateToCustomers}
              style={[styles.actionButton, styles.outlinedButton]}
              testID="customers-button"
              accessibilityRole="button"
              accessibilityLabel="Customers"
            >
              <Text style={[styles.buttonText, styles.outlinedButtonText]}>
                Customers
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={navigateToQuotations}
              style={[styles.actionButton, styles.outlinedButton]}
              testID="quotations-button"
              accessibilityRole="button"
              accessibilityLabel="Quotations"
            >
              <Text style={[styles.buttonText, styles.outlinedButtonText]}>
                Quotations
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={navigateToCommissions}
              style={[
                styles.actionButton,
                styles.outlinedButton,
                { maxWidth: '48%' },
              ]}
              testID="commissions-button"
              accessibilityRole="button"
              accessibilityLabel="My Commissions"
            >
              <Text style={[styles.buttonText, styles.outlinedButtonText]}>
                My Commissions
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {!isConnected && <Text style={styles.cachedLabel}>cached</Text>}
        <View style={styles.lastSyncContainer}>
          <Text style={styles.lastSyncText}>
            Last sync: {formatRelativeTime(lastSyncTs)}
          </Text>
        </View>

        {/* Recent Activity */}
        {recentLeads.length > 0 && (
          <View style={styles.recentContainer}>
            <View style={styles.recentHeader}>
              <Text style={styles.sectionTitle}>Recent Leads</Text>
              <TouchableOpacity onPress={navigateToLeads}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {recentLeads.map((lead) => (
              <Card key={lead.id} style={styles.leadCard}>
                <Card.Content>
                  <View style={styles.leadHeader}>
                    <Text style={styles.leadTitle}>
                      {lead?.customerName ||
                        lead.customer_id ||
                        `Lead #${lead.id}`}
                    </Text>
                    <Chip
                      mode="outlined"
                      compact
                      textStyle={styles.chipText}
                      style={[
                        styles.statusChip,
                        { backgroundColor: getStatusColor(lead.status, theme) },
                      ]}
                    >
                      {lead.status}
                    </Chip>
                  </View>

                  <View style={styles.leadDetails}>
                    {lead.phone && (
                      <Text style={styles.leadDetail}>📞 {lead.phone}</Text>
                    )}
                    {lead.estimated_value && (
                      <Text style={styles.leadDetail}>
                        💰 ₹{lead.estimated_value.toLocaleString()}
                      </Text>
                    )}
                    {lead.follow_up_date && (
                      <Text style={styles.leadDetail}>
                        📅 Follow-up:{' '}
                        {new Date(lead.follow_up_date).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

/**
 * Get status color based on lead status
 */
const getStatusColor = (status: string, theme: MD3Theme): string => {
  switch (status.toLowerCase()) {
    case 'new':
      return theme.colors.primaryContainer;
    case 'contacted':
      return theme.colors.secondaryContainer;
    case 'qualified':
      return theme.colors.tertiaryContainer;
    case 'proposal':
      return '#FFE4B5'; // Light orange
    case 'won':
      return '#D4E6C4'; // Light green
    case 'lost':
      return '#FFCCCB'; // Light red
    default:
      return theme.colors.surfaceVariant;
  }
};

/**
 * Create theme-aware styles
 */
const createStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      backgroundColor: theme.colors.surface,
      paddingTop: Platform.OS === 'ios' ? 50 : 20,
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    },
    headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerText: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
    },
    syncContainer: {
      alignItems: 'flex-end',
    },
    syncingStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    syncButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    syncText: {
      fontSize: 14,
      color: theme.colors.onSurface,
    },
    syncTextDisabled: {
      color: theme.colors.outline,
    },
    offlineBar: {
      backgroundColor: '#FFF3CD',
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginTop: 12,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: '#FFC107',
    },
    offlineText: {
      fontSize: 14,
      color: '#856404',
      textAlign: 'center',
    },
    errorBar: {
      backgroundColor: '#F8D7DA',
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginTop: 12,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: '#DC3545',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    errorText: {
      fontSize: 14,
      color: '#721C24',
      flex: 1,
    },
    retryText: {
      fontSize: 14,
      color: '#007AFF',
      fontWeight: '600',
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.onBackground,
      marginBottom: 16,
    },
    metricsContainer: {
      paddingHorizontal: 20,
      paddingTop: 24,
    },
    metricsGrid: {
      gap: 16,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    metricItem: {
      flex: 1,
    },
    actionsContainer: {
      paddingHorizontal: 20,
      paddingTop: 32,
    },
    actionGrid: {
      gap: 12,
    },
    // actionRow: {
    //   flexDirection: 'row',
    //   gap: 12,
    //   marginBottom: 12,
    //   justifyContent: 'space-between',
    // },
    // actionButton: {
    //   // flex: 1,
    //   minWidth: '45%',
    // },
    actionButtonContent: {
      paddingVertical: 8,
      // paddingHorizontal: 16,
    },
    recentContainer: {
      paddingHorizontal: 20,
      paddingTop: 32,
    },
    recentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    viewAllText: {
      fontSize: 16,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    leadCard: {
      marginBottom: 12,
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    leadHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    leadTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onSurface,
      flex: 1,
      marginRight: 12,
    },
    statusChip: {
      height: 28,
    },
    chipText: {
      fontSize: 10,
      fontWeight: '500',
    },
    leadDetails: {
      gap: 4,
    },
    leadDetail: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
    },
    bottomSpacing: {
      height: 32,
    },
    syncIcon: {
      fontSize: 20,
      color: theme.colors.primary,
      fontWeight: 'bold',
    },
    content: {
      flex: 1,
    },
    lastSyncContainer: {
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    lastSyncText: {
      fontSize: 13,
      color: '#8E8E93',
      fontWeight: '500',
    },
    cachedLabel: {
      position: 'absolute',
      top: 8,
      right: 12,
      fontSize: 10,
      color: '#8E8E93',
      backgroundColor: '#F0F0F0',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      textTransform: 'uppercase',
      fontWeight: '600',
    },
    /////
    actionRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    actionButton: {
      flex: 1,
      minHeight: 48, // Better accessibility
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 24, // Paper button default radius
      // Remove the old actionButtonContent style
    },

    // NEW BUTTON STYLES
    containedButton: {
      backgroundColor: theme.colors.primary,
      elevation: 2, // Android shadow
      shadowColor: '#000', // iOS shadow
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    outlinedButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },

    // TEXT STYLES
    buttonText: {
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
      // No numberOfLines limit - let it wrap naturally
    },
    containedButtonText: {
      color: theme.colors.onPrimary, // Usually white
    },
    outlinedButtonText: {
      color: theme.colors.primary,
    },
  });

export default HomeScreen;
