/**
 * StaleDataBanner - Warning banner for stale cached data
 *
 * Shows when data hasn't been synced for more than 24 hours and user is offline
 * Provides accessibility compliance with role="alert"
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export interface StaleDataBannerProps {
  /** When data was last synced */
  lastSyncAt: string | null;
  /** Function to trigger manual sync attempt */
  onRefresh?: () => void;
  /** Whether currently attempting to refresh */
  refreshing?: boolean;
  /** Custom test ID for testing */
  testID?: string;
}

/**
 * Calculate if data is considered stale (>24 hours old)
 */
export const isDataStale = (lastSyncAt: string | null): boolean => {
  if (!lastSyncAt) return true;

  const lastSync = new Date(lastSyncAt);
  const now = new Date();
  const diffHours = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

  return diffHours > 24;
};

/**
 * Format how long ago data was synced
 */
const formatSyncAge = (lastSyncAt: string | null): string => {
  if (!lastSyncAt) return 'never';

  const lastSync = new Date(lastSyncAt);
  const now = new Date();
  const diffHours = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

  if (diffHours < 1) return 'less than an hour ago';
  if (diffHours < 24) return `${Math.floor(diffHours)} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};

export const StaleDataBanner: React.FC<StaleDataBannerProps> = ({
  lastSyncAt,
  onRefresh,
  refreshing = false,
  testID = 'stale-data-banner',
}) => {
  const syncAge = formatSyncAge(lastSyncAt);

  // Announce to screen readers when banner appears
  React.useEffect(() => {
    const message = `Warning: Lead data is outdated. Last synced ${syncAge}. You are viewing cached data only.`;
    AccessibilityInfo.announceForAccessibility(message);
  }, [syncAge]);

  return (
    <View
      style={styles.container}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLabel={`Warning: Lead data is outdated. Last synced ${syncAge}. You are viewing cached data only.`}
    >
      <View style={styles.content}>
        <Icon name="warning-outline" size={20} color={styles.icon.color} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Data may be outdated</Text>
          <Text style={styles.subtitle}>
            Last synced {syncAge}. You're viewing cached data only.
          </Text>
        </View>
      </View>

      {onRefresh && (
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
          testID={`${testID}-refresh`}
          accessibilityLabel={
            refreshing ? 'Refreshing data' : 'Tap to refresh data'
          }
          accessibilityHint="Attempts to sync latest data when back online"
        >
          <Icon
            name={refreshing ? 'refresh' : 'refresh-outline'}
            size={16}
            color={styles.refreshText.color}
          />
          <Text style={styles.refreshText}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFECB5',
    borderWidth: 1,
    borderRadius: 8,
    margin: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 1000, // High z-index as required
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    color: '#856404',
  },
  textContainer: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#6C5B00',
    lineHeight: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(133, 100, 4, 0.1)',
  },
  refreshText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default StaleDataBanner;
