import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, Icon } from 'react-native-paper';
import { useAppSelector } from '../../hooks/reduxHooks';
import { useConnectivity } from '../../contexts/ConnectivityContext';
import {
  selectLastSyncTs,
  selectSyncInProgress,
} from '../../store/slices/networkSlice';
import { formatRelativeTime } from '../../utils/date';

export interface LastSyncIndicatorProps {
  style?: any;
  showIcon?: boolean;
  textVariant?: 'bodySmall' | 'bodyMedium' | 'labelSmall';
}

export const LastSyncIndicator: React.FC<LastSyncIndicatorProps> = ({
  style,
  showIcon = true,
  textVariant = 'bodySmall',
}) => {
  const theme = useTheme();
  const { isConnected } = useConnectivity();
  const lastSyncTs = useAppSelector(selectLastSyncTs);
  const syncInProgress = useAppSelector(selectSyncInProgress);

  // Update relative time every 30 seconds
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate({});
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (syncInProgress) {
      return theme.colors.primary;
    }
    if (!isConnected) {
      return theme.colors.error;
    }
    return theme.colors.onSurfaceVariant;
  };

  const getStatusIcon = () => {
    if (syncInProgress) {
      return 'sync';
    }
    if (!isConnected) {
      return 'wifi-off';
    }
    if (lastSyncTs) {
      return 'check-circle-outline';
    }
    return 'help-circle-outline';
  };

  const getStatusText = () => {
    if (syncInProgress) {
      return 'Syncing...';
    }

    const relativeTime = formatRelativeTime(lastSyncTs);
    return `Last sync: ${relativeTime}`;
  };

  const statusColor = getStatusColor();
  const statusIcon = getStatusIcon();
  const statusText = getStatusText();

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="text"
      accessibilityLabel={`Sync status: ${statusText}`}
      testID="last-sync-indicator"
    >
      {showIcon && <Icon source={statusIcon} size={16} color={statusColor} />}
      <Text
        variant={textVariant}
        style={[
          styles.text,
          {
            color: statusColor,
            marginLeft: showIcon ? 6 : 0,
          },
        ]}
      >
        {statusText}
      </Text>

      {!isConnected && (
        <View style={styles.offlineIndicator}>
          <Text
            variant="labelSmall"
            style={[styles.offlineText, { color: theme.colors.error }]}
          >
            • Offline
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
  offlineIndicator: {
    marginLeft: 8,
  },
  offlineText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default LastSyncIndicator;
