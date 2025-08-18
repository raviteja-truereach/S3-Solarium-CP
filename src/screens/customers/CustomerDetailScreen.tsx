/**
 * Customer Detail Screen
 * Main screen displaying detailed customer information with tab navigation
 * Using react-native-paper SegmentedButtons for tabs (following LeadDetailScreen pattern)
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';
import {
  Text,
  SegmentedButtons,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList } from '@navigation/types';
import { ScreenContainer } from '@components/common/ScreenContainer';
import { TabErrorBoundary } from '@components/common/TabErrorBoundary';
import { useIsOnline } from '@hooks/useConnectivityMemoized';
import { useGetCustomerByIdQuery } from '@store/api/customerApi';
import { CustomerProfileTab } from '@components/customers/CustomerProfileTab';
import { CustomerKYCTab } from '@components/customers/CustomerKYCTab';
import { CustomerLeadsTab } from '@components/customers/CustomerLeadsTab';

type CustomerDetailScreenProps = NativeStackScreenProps<
  MainTabParamList,
  'CustomerDetail'
>;

// Tab configuration
enum CustomerTabKey {
  PROFILE = 'profile',
  KYC = 'kyc',
  LEADS = 'leads',
}

const CUSTOMER_TABS = [
  {
    key: CustomerTabKey.PROFILE,
    title: 'Profile',
    enabled: true,
  },
  {
    key: CustomerTabKey.KYC,
    title: 'KYC',
    enabled: true,
  },
  {
    key: CustomerTabKey.LEADS,
    title: 'Leads',
    enabled: true,
  },
];

const DEFAULT_TAB_KEY = CustomerTabKey.PROFILE;

/**
 * Individual Tab Content Components
 */
const ProfileTabContent: React.FC<{ customerId: string }> = ({
  customerId,
}) => {
  const { data, isLoading, error, refetch } =
    useGetCustomerByIdQuery(customerId);

  const customer = data?.data;

  return (
    <CustomerProfileTab
      customer={customer}
      loading={isLoading}
      error={error}
      onRetry={refetch}
    />
  );
};

const KYCTabContent: React.FC<{ customerId: string }> = ({ customerId }) => {
  return <CustomerKYCTab customerId={customerId} />;
};

const LeadsTabContent: React.FC<{ customerId: string }> = ({ customerId }) => {
  return <CustomerLeadsTab customerId={customerId} />;
};

/**
 * Customer Detail Screen Component
 */
export const CustomerDetailScreen: React.FC<CustomerDetailScreenProps> = ({
  route,
}) => {
  const { customerId } = route.params;
  const isOnline = useIsOnline();

  // Validate customerId
  if (!customerId || typeof customerId !== 'string') {
    return (
      <ScreenContainer safeArea={true}>
        <View style={styles.errorContainer}>
          <Text variant="headlineSmall" style={styles.errorText}>
            Invalid Customer ID
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // Get customer data
  const { data, isLoading, error, refetch } =
    useGetCustomerByIdQuery(customerId);
  const customer = data?.data;

  // Tab navigation state
  const [selectedTab, setSelectedTab] =
    useState<CustomerTabKey>(DEFAULT_TAB_KEY);
  const [loadingTabs, setLoadingTabs] = useState<Set<CustomerTabKey>>(
    new Set()
  );

  // Handle tab selection
  const handleTabChange = useCallback(
    (tabKey: string) => {
      const tab = CUSTOMER_TABS.find((t) => t.key === tabKey);

      if (!tab) return;

      // Show loading for lazy tabs
      if (
        tabKey !== CustomerTabKey.PROFILE &&
        !loadingTabs.has(tabKey as CustomerTabKey)
      ) {
        setLoadingTabs((prev) => new Set(prev).add(tabKey as CustomerTabKey));

        // Simulate loading delay
        setTimeout(() => {
          setLoadingTabs((prev) => {
            const newSet = new Set(prev);
            newSet.delete(tabKey as CustomerTabKey);
            return newSet;
          });
        }, 300);
      }

      setSelectedTab(tabKey as CustomerTabKey);
    },
    [loadingTabs]
  );

  // Render tab content with error boundaries
  const renderTabContent = useCallback(() => {
    const isLoading = loadingTabs.has(selectedTab);

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>
            Loading {CUSTOMER_TABS.find((t) => t.key === selectedTab)?.title}...
          </Text>
        </View>
      );
    }

    switch (selectedTab) {
      case CustomerTabKey.PROFILE:
        return (
          <TabErrorBoundary tabName="Profile">
            <ProfileTabContent customerId={customerId} />
          </TabErrorBoundary>
        );

      case CustomerTabKey.KYC:
        return (
          <TabErrorBoundary tabName="KYC">
            <KYCTabContent customerId={customerId} />
          </TabErrorBoundary>
        );

      case CustomerTabKey.LEADS:
        return (
          <TabErrorBoundary tabName="Leads">
            <LeadsTabContent customerId={customerId} />
          </TabErrorBoundary>
        );

      default:
        return (
          <TabErrorBoundary tabName="Profile">
            <ProfileTabContent customerId={customerId} />
          </TabErrorBoundary>
        );
    }
  }, [selectedTab, loadingTabs, customerId]);

  // Prepare segmented buttons
  const segmentedButtons = CUSTOMER_TABS.map((tab) => ({
    value: tab.key,
    label: tab.title,
    disabled: !tab.enabled,
    style: {
      opacity: tab.enabled ? 1 : 0.4,
      backgroundColor: tab.enabled ? undefined : '#F0F0F0',
    },
    labelStyle: {
      color: tab.enabled ? '#004C89' : '#8E8E93',
      fontWeight: tab.enabled ? '600' : '400',
    },
  }));

  // Performance logging
  React.useEffect(() => {
    console.log(
      `✅ CustomerDetailScreen rendered for customerId: ${customerId}`
    );
  }, [customerId]);

  return (
    <ScreenContainer safeArea={true} testID="customer-detail-screen">
      {/* Header with Customer ID and Offline Indicator */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text variant="headlineSmall" style={styles.headerTitle}>
            {customer?.name || `Customer #${customerId}`}
          </Text>

          {/* Offline Chip */}
          {!isOnline && (
            <Chip
              mode="outlined"
              style={styles.offlineChip}
              textStyle={styles.offlineChipText}
              compact={true}
              testID="offline-chip"
            >
              Offline
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
          testID="customer-tabs"
          accessibilityLabel="Customer detail tab navigation"
          accessibilityHint="Swipe left or right to navigate between tabs"
        />
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer} testID="customer-tab-content">
        {renderTabContent()}
      </View>
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
});

export default CustomerDetailScreen;
