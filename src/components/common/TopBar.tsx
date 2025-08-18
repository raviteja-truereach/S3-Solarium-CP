import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Appbar, Badge, Icon, IconButton, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector } from '../../hooks/reduxHooks';
import { useConnectivity } from '../../contexts/ConnectivityContext';
import {
  selectUnreadCount,
  selectSyncInProgress,
  selectLastSyncTs,
} from '../../store/slices/networkSlice';
import { getSyncManager } from '../../services/SyncManager';
import navigationRef, {
  navigateToNotifications,
  navigateToSettings,
} from '../../navigation/navigationRef';
import { store } from '../../store/index';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
// import { Assets } from '../../../assets';
const syncIcon = require('../../../assets/sync.png');
const bellIcon = require('../../../assets/bell.png');
const userIcon = require('../../../assets/user.png');

export interface TopBarProps {
  title?: string;
  showSync?: boolean;
  showNotifications?: boolean;
  showProfile?: boolean;
  onBackPress?: () => void;
  showBackButton?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  title = '',
  showSync = true,
  showNotifications = true,
  showProfile = true,
  onBackPress,
  showBackButton = false,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isConnected } = useConnectivity();
  const navigation = useNavigation();

  // Redux selectors
  const unreadCount = useAppSelector(selectUnreadCount);
  const syncInProgress = useAppSelector(selectSyncInProgress);
  const lastSyncTs = useAppSelector(selectLastSyncTs);

  // Sync manager instance
  const syncManager = getSyncManager(store);

  // Calculate sync button state
  const isSyncDisabled = syncInProgress || !isConnected;
  const syncIconColor = isSyncDisabled
    ? theme.colors.disabled
    : theme.colors.primary;

  /**
   * Handle sync button press (manual sync)
   */
  const handleSyncPress = useCallback(async () => {
    try {
      console.log('🔄 TopBar sync button pressed');
      await syncManager.manualSync('manual');
    } catch (error) {
      console.error('❌ TopBar sync failed:', error);
    }
  }, [syncManager]);

  /**
   * Handle sync button long press (full sync)
   */
  const handleSyncLongPress = useCallback(async () => {
    try {
      console.log('🔄 TopBar sync button long-pressed (full sync)');
      await syncManager.fullSync('longPress');
    } catch (error) {
      console.error('❌ TopBar full sync failed:', error);
    }
  }, [syncManager]);

  /**
   * Handle notifications button press
   */
  const handleNotificationsPress = useCallback(() => {
    console.log('🔔 TopBar notifications button pressed');
    navigateToNotifications();
  }, []);

  /**
   * Handle profile button press
   */
  const handleProfilePress = useCallback(() => {
    // TODO: Navigate to profile screen when implemented
    navigation.navigate('Settings' as never);
  }, []);

  /**
   * Get sync button accessibility label
   */
  const getSyncAccessibilityLabel = (): string => {
    if (syncInProgress) {
      return 'Synchronizing data, please wait';
    }
    if (!isConnected) {
      return 'Sync disabled, no internet connection';
    }
    return 'Synchronise data';
  };

  /**
   * Get sync button accessibility hint
   */
  const getSyncAccessibilityHint = (): string => {
    return 'Tap to sync data, long press for full sync';
  };

  /**
   * Get notifications accessibility label
   */
  const getNotificationsAccessibilityLabel = (): string => {
    if (unreadCount > 0) {
      return `Notifications, ${unreadCount} unread`;
    }
    return 'Notifications';
  };

  return (
    <Appbar.Header
      style={[
        styles.header,
        {
          paddingTop: insets.top,
          backgroundColor: theme.colors.surface,
          elevation: Platform.OS === 'android' ? 4 : 0,
          shadowColor: Platform.OS === 'ios' ? theme.colors.shadow : undefined,
          shadowOffset:
            Platform.OS === 'ios' ? { width: 0, height: 2 } : undefined,
          shadowOpacity: Platform.OS === 'ios' ? 0.1 : undefined,
          shadowRadius: Platform.OS === 'ios' ? 4 : undefined,
        },
      ]}
    >
      {/* Back Button */}
      {showBackButton && (
        <Appbar.BackAction onPress={onBackPress} accessibilityLabel="Go back" />
      )}

      {/* Title */}
      {title && (
        <Appbar.Content
          title={title}
          titleStyle={[styles.title, { color: theme.colors.onSurface }]}
        />
      )}

      {/* Spacer to push actions to the right */}
      {!title && <View style={styles.spacer} />}

      {/* Sync Button */}
      {showSync && (
        <View style={styles.syncContainer}>
          <TouchableOpacity
            onPress={handleSyncPress}
            onLongPress={handleSyncLongPress}
            disabled={isSyncDisabled}
            style={[styles.iconButton, { opacity: isSyncDisabled ? 0.3 : 1 }]}
            testID="topbar-sync-button"
            accessibilityLabel={getSyncAccessibilityLabel()}
            accessibilityHint={getSyncAccessibilityHint()}
          >
            <Image
              source={syncIcon}
              style={[
                styles.iconImage,
                {
                  tintColor: syncIconColor,
                  transform: syncInProgress
                    ? [{ rotate: '180deg' }]
                    : undefined,
                },
              ]}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Last sync indicator */}
          {lastSyncTs && !syncInProgress && (
            <View style={styles.syncIndicator}>
              <View
                style={[
                  styles.syncDot,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
            </View>
          )}
        </View>
      )}

      {/* Notifications Button */}
      {showNotifications && (
        <View style={styles.notificationContainer}>
          <TouchableOpacity
            onPress={handleNotificationsPress}
            style={styles.iconButton}
            testID="topbar-notifications-button"
            accessibilityLabel={getNotificationsAccessibilityLabel()}
            accessibilityHint="Tap to view notifications"
          >
            <Image
              source={bellIcon}
              style={[styles.iconImage]}
              resizeMode="contain"
            />
            {unreadCount > 0 && (
              <Badge style={styles.notificationBadge}>
                {unreadCount > 99 ? '99+' : unreadCount.toString()}
              </Badge>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Profile Button */}
      {showProfile && (
        <TouchableOpacity
          onPress={handleProfilePress}
          style={styles.iconButton}
          testID="topbar-profile-button"
          accessibilityLabel="Profile"
          accessibilityHint="Tap to view profile"
        >
          <Image
            source={userIcon}
            style={[styles.iconImage]}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}
    </Appbar.Header>
  );
};

const styles = StyleSheet.create({
  header: {
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  syncContainer: {
    position: 'relative',
  },
  syncButton: {
    margin: 0,
  },
  syncIndicator: {
    position: 'absolute',
    bottom: 11,
    right: 12,
  },
  syncDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  notificationContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    zIndex: 1,
  },
  iconButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  iconImage: {
    width: 20,
    height: 20,
  },
});

export default TopBar;
