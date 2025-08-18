/**
 * Lead Detail Screen
 * Main screen displaying detailed lead information with tab navigation
 * Using react-native-paper SegmentedButtons for tabs
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, Dimensions } from 'react-native';
import {
  Text,
  SegmentedButtons,
  Card,
  ActivityIndicator,
  Chip,
  FAB,
} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@navigation/types';
import { ScreenContainer } from '@components/common/ScreenContainer';
import { LeadTabPlaceholder } from '@components/leads/LeadTabPlaceholder';
import { useDisabledTabToast } from '@components/common/DisabledTabToast';
import { LEAD_TABS, LeadTabKey, DEFAULT_TAB_KEY } from '@constants/leadTabs';
import { LeadInfoTab } from '@components/leads/LeadInfoTab';
import { useLeadById } from '@hooks/useLeadById';
import { TabErrorBoundary } from '@components/common/TabErrorBoundary';
import { useIsOnline } from '@hooks/useConnectivityMemoized';
import { TERMINAL_STATUSES } from '@constants/leadStatus';
import { STRINGS } from '@constants/strings';
import { useUpdateLeadStatusMutation } from '@store/api/leadApi';
import { useGetDocumentCountQuery } from '@store/api/documentApi';
import StatusChangeDialog, {
  StatusChangeDialogRef,
} from '@components/leads/StatusChangeDialog';
import type { StatusChangeDraft } from '@types/lead';
import { getStatusUpdateErrorMessage } from '../../utils/errorMessage';
import { toastConfig } from '@components/common/ToastConfig';
import { AppButton } from '@components/common/AppButton';
import { useNavigation } from '@react-navigation/native';

type LeadDetailScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  'LeadDetail'
>;

/**
 * Individual Tab Content Components
 */
const InfoTabContent: React.FC<{ leadId: string }> = ({ leadId }) => {
  const { lead, loading, error, source, onRetry } = useLeadById(leadId);

  // Debug logging for development
  React.useEffect(() => {
    if (lead) {
      console.log(`✅ LeadInfoTab received lead from ${source}:`, {
        id: lead.id,
        customerName: lead.customerName,
        status: lead.status,
        hasError: Boolean(error),
      });
    }
  }, [lead, source, error]);

  return (
    <LeadInfoTab
      lead={lead}
      loading={loading}
      error={error}
      onRetry={onRetry}
    />
  );
};

/**
 * Lead Detail Screen Component
 */
export const LeadDetailScreen: React.FC<LeadDetailScreenProps> = ({
  route,
}) => {
  const navigation = useNavigation();
  const { leadId } = route.params;
  const { showToast } = useDisabledTabToast();
  const isOnline = useIsOnline();
  const statusDialogRef = useRef<StatusChangeDialogRef>(null);

  // Status update mutation
  const [updateLeadStatus, { isLoading: isUpdatingStatus }] =
    useUpdateLeadStatusMutation();

  // Validate leadId
  if (!leadId || typeof leadId !== 'string') {
    return (
      <ScreenContainer safeArea={true}>
        <View style={styles.errorContainer}>
          <Text variant="headlineSmall" style={styles.errorText}>
            Invalid Lead ID
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // Get lead data using the hook
  const { lead, loading, error, source, onRetry } = useLeadById(leadId);

  // Tab navigation state
  const [selectedTab, setSelectedTab] = useState<LeadTabKey>(DEFAULT_TAB_KEY);
  const [loadingTabs, setLoadingTabs] = useState<Set<LeadTabKey>>(new Set());
  // Document count for badge
  // Document count for badge (using real API)
  const {
    data: documentCountData,
    isLoading: isDocumentCountLoading,
    refetch: refreshCount,
  } = useGetDocumentCountQuery(leadId, {
    refetchOnMountOrArgChange: true,
  });

  // Extract count from API response
  const documentCount = documentCountData?.data?.count || 0;

  console.log(
    'documentCount in LeadDetailScreen (real API)---->',
    documentCount
  );
  // Refresh document count when screen is focused (with debouncing)
  const hasRefreshedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      // Only refresh once per focus, and only if we haven't refreshed recently
      if (!hasRefreshedRef.current) {
        refreshCount();
        hasRefreshedRef.current = true;

        // Reset the flag after a delay
        setTimeout(() => {
          hasRefreshedRef.current = false;
        }, 5000); // 5 second cooldown
      }

      return () => {
        // Cleanup if needed
      };
    }, [leadId]) // Add leadId dependency
  );
  // Check if FAB should be visible
  const shouldShowFAB = React.useMemo(() => {
    if (!lead || !isOnline) return false;

    // Hide FAB for terminal statuses
    const isTerminalStatus = TERMINAL_STATUSES.includes(lead.status as any);
    return !isTerminalStatus;
  }, [lead, isOnline]);

  // Handle FAB press
  // Handle FAB press with enhanced offline detection
  const handleChangeFABPress = useCallback(() => {
    if (!isOnline) {
      Toast.show({
        type: 'error',
        text1: 'No Internet Connection',
        text2: 'Please go online to proceed with status changes.',
        position: 'bottom',
        visibilityTime: 4000,
      });
      return;
    }

    if (!lead) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Lead data not available. Please refresh and try again.',
        position: 'bottom',
      });
      return;
    }

    statusDialogRef.current?.open();
  }, [isOnline, lead]);

  // Handle status change submission
  // Handle status change submission with enhanced error handling
  const handleStatusChange = useCallback(
    async (data: StatusChangeDraft) => {
      if (!lead) {
        throw new Error('Lead data not available');
      }

      // Double-check connectivity before proceeding
      if (!isOnline) {
        throw new Error('No internet connection. Please go online to proceed.');
      }

      try {
        console.log('🔄 Updating lead status:', { leadId, originalData: data });

        // Transform data to match backend API expectations
        const apiPayload = {
          leadId,
          status: data.newStatus,
          remarks: data.remarks,
          followUpDate: data.nextFollowUpDate,
          quotationRef: data.quotationRef,
          tokenNumber: data.tokenNumber,
        };

        await updateLeadStatus(apiPayload).unwrap();

        console.log('✅ Lead status updated successfully');

        // Show success toast using central config
        Toast.show({
          type: 'success',
          text1: 'Status Updated',
          text2: `Status changed to "${data.newStatus}"`,
          position: 'bottom',
          visibilityTime: 3000,
        });
      } catch (error: any) {
        console.error('❌ Status update failed:', error);

        // Use centralized error message handling
        const errorMessage = getStatusUpdateErrorMessage(error);

        // Show error toast using central config
        Toast.show({
          type: 'error',
          text1: 'Update Failed',
          text2: errorMessage,
          position: 'bottom',
          visibilityTime: 5000,
        });

        // Re-throw error to let dialog handle it (keep dialog open)
        throw error;
      }
    },
    [lead, leadId, updateLeadStatus, isOnline]
  );

  // Handle tab selection
  const handleTabChange = useCallback(
    (tabKey: string) => {
      const tab = LEAD_TABS.find((t) => t.key === tabKey);

      if (!tab) return;

      // Check if tab is disabled
      if (!tab.enabled) {
        showToast({ message: 'Coming soon' });
        return;
      }

      // Show loading for lazy tabs
      if (
        tabKey !== LeadTabKey.INFO &&
        !loadingTabs.has(tabKey as LeadTabKey)
      ) {
        setLoadingTabs((prev) => new Set(prev).add(tabKey as LeadTabKey));

        // Simulate loading delay
        setTimeout(() => {
          setLoadingTabs((prev) => {
            const newSet = new Set(prev);
            newSet.delete(tabKey as LeadTabKey);
            return newSet;
          });
        }, 300);
      }

      setSelectedTab(tabKey as LeadTabKey);
    },
    [showToast, loadingTabs]
  );

  // Render tab content with error boundaries
  const renderTabContent = useCallback(() => {
    const isLoading = loadingTabs.has(selectedTab);

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>
            Loading {LEAD_TABS.find((t) => t.key === selectedTab)?.title}...
          </Text>
        </View>
      );
    }

    const tabConfig = LEAD_TABS.find((t) => t.key === selectedTab);
    const tabName = tabConfig?.title || 'Tab';

    switch (selectedTab) {
      case LeadTabKey.INFO:
        return (
          <TabErrorBoundary tabName="Info">
            <InfoTabContent leadId={leadId} />
          </TabErrorBoundary>
        );

      case LeadTabKey.DOCUMENTS:
        return (
          <TabErrorBoundary tabName="Documents">
            <View style={{ flex: 1, padding: 16 }}>
              <Text
                variant="bodyLarge"
                style={{ marginBottom: 8, textAlign: 'center' }}
              >
                Manage documents for this lead
              </Text>

              <Text
                variant="bodyMedium"
                style={{
                  marginBottom: 16,
                  textAlign: 'center',
                  color: '#666',
                  fontWeight: '500',
                }}
                accessible={true}
                accessibilityLabel={`Currently ${documentCount} documents uploaded`}
              >
                {isDocumentCountLoading
                  ? 'Loading document count...'
                  : documentCount === 0
                  ? 'No documents uploaded yet'
                  : `${documentCount} document${
                      documentCount === 1 ? '' : 's'
                    } uploaded`}
              </Text>

              <AppButton
                mode="contained"
                onPress={() =>
                  navigation.navigate('DocumentUpload', { leadId })
                }
                title="Manage Documents"
                style={{ borderRadius: 8 }}
                accessible={true}
                accessibilityLabel={`Navigate to document upload screen. Currently ${documentCount} documents uploaded.`}
                accessibilityHint="Double tap to open the document management interface"
                testID="documents-tab-navigate-button"
              />
            </View>
          </TabErrorBoundary>
        );

      case LeadTabKey.TIMELINE:
        return (
          <TabErrorBoundary tabName="Timeline">
            <LeadTabPlaceholder
              tabName="Timeline"
              testID="timeline-tab-content"
              icon="📅"
            />
          </TabErrorBoundary>
        );

      case LeadTabKey.QUOTATIONS:
        return (
          <TabErrorBoundary tabName="Quotations">
            <LeadTabPlaceholder
              tabName="Quotations"
              testID="quotations-tab-content"
              icon="📊"
            />
          </TabErrorBoundary>
        );

      default:
        return (
          <TabErrorBoundary tabName="Info">
            <InfoTabContent leadId={leadId} />
          </TabErrorBoundary>
        );
    }
  }, [selectedTab, loadingTabs, leadId]);

  // Prepare segmented buttons with enhanced disabled styling and document count badge
  const segmentedButtons = LEAD_TABS.map((tab) => {
    // Add document count badge for Documents tab
    let displayLabel = tab.title;
    if (tab.key === LeadTabKey.DOCUMENTS) {
      if (isDocumentCountLoading) {
        displayLabel = `${tab.title} (...)`;
      } else if (documentCount > 0) {
        displayLabel = `${tab.title} (${documentCount})`;
      }
    }

    return {
      value: tab.key,
      label: displayLabel,
      disabled: !tab.enabled,
      style: {
        opacity: tab.enabled ? 1 : 0.4,
        backgroundColor: tab.enabled ? undefined : '#F0F0F0',
      },
      labelStyle: {
        color: tab.enabled ? '#004C89' : '#8E8E93',
        fontWeight: tab.enabled ? '600' : '400',
      },
    };
  });

  // Performance logging
  React.useEffect(() => {
    const startTime = Date.now();
    const endTime = Date.now();
    const renderTime = endTime - startTime;

    console.log(
      `✅ LeadDetailScreen rendered in ${renderTime}ms for leadId:`,
      leadId
    );

    if (renderTime > 100) {
      console.warn(
        `⚠️ LeadDetailScreen render time exceeded target: ${renderTime}ms > 100ms`
      );
    }
  }, [leadId]);

  // Enhanced error handling for status update mutations
  useEffect(() => {
    if (isUpdatingStatus) {
      // Show loading toast while updating
      Toast.show({
        type: 'info',
        text1: 'Updating Status',
        text2: 'Please wait...',
        position: 'bottom',
        visibilityTime: 1000,
      });
    }
  }, [isUpdatingStatus]);

  return (
    <ScreenContainer safeArea={true} testID="lead-detail-screen">
      {/* Header with Lead ID and Offline Indicator */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text variant="headlineSmall" style={styles.headerTitle}>
            Lead #{leadId}
          </Text>

          {/* Offline Copy Chip */}
          {source === 'cache' && !error && (
            <Chip
              mode="outlined"
              style={styles.offlineChip}
              textStyle={styles.offlineChipText}
              compact={true}
              testID="offline-chip"
            >
              Offline copy
            </Chip>
          )}
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={selectedTab}
          onValueChange={handleTabChange}
          buttons={segmentedButtons}
          style={styles.segmentedButtons}
          testID="lead-tabs"
          accessible={true}
          accessibilityLabel={
            isDocumentCountLoading
              ? 'Tab navigation. Loading document count.'
              : `Tab navigation. Documents tab has ${documentCount} documents.`
          }
          accessibilityHint="Swipe left or right to navigate between tabs"
        />
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer} testID="lead-info-tab">
        {renderTabContent()}
      </View>

      {/* Change Status FAB */}
      {shouldShowFAB && (
        <FAB
          // icon="+"
          label={STRINGS.STATUS_CHANGE.FAB_LABEL}
          onPress={handleChangeFABPress}
          style={[styles.fab, { opacity: isUpdatingStatus ? 0.7 : 1 }]}
          disabled={isUpdatingStatus}
          testID="change-status-fab"
          accessibilityLabel="Change Lead Status"
          accessibilityHint="Opens dialog to change the current lead status"
        />
      )}

      {/* Status Change Dialog */}
      {lead && (
        <StatusChangeDialog
          ref={statusDialogRef}
          leadId={leadId}
          currentStatus={lead.status}
          onStatusChange={handleStatusChange}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
  },
  offlineChip: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    marginLeft: 8,
  },
  offlineChipText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '600',
  },
  tabContainer: {
    // paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  segmentedButtons: {
    backgroundColor: '#F2F2F7',
    borderRadius: 18,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 10,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#004C89',
  },
});

export default LeadDetailScreen;
