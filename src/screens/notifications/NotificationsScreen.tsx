import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, List, Divider, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopBar } from '../../components/common/TopBar';
import { useAppSelector } from '../../hooks/reduxHooks';
import { selectUnreadCount } from '../../store/slices/networkSlice';

const NotificationsScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const unreadCount = useAppSelector(selectUnreadCount);

  const handleBackPress = () => {
    // Navigation will be handled by the navigation system
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <TopBar
        title="Notifications"
        showBackButton={true}
        showNotifications={false} // Don't show notifications icon on notifications screen
        onBackPress={handleBackPress}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.headerTitle}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <Text
              variant="bodyMedium"
              style={[styles.unreadText, { color: theme.colors.error }]}
            >
              {unreadCount} unread
            </Text>
          )}
        </View>

        {/* Stub Content */}
        <View style={styles.emptyState}>
          <Text
            variant="titleMedium"
            style={[
              styles.emptyTitle,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            No notifications yet
          </Text>
          <Text
            variant="bodyMedium"
            style={[
              styles.emptyMessage,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            You'll see your notifications here when you receive them.
          </Text>
        </View>

        {/* Placeholder notifications for testing */}
        {unreadCount > 0 && (
          <View style={styles.notificationsList}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Recent Notifications
            </Text>

            {Array.from({ length: Math.min(unreadCount, 5) }, (_, index) => (
              <React.Fragment key={index}>
                <List.Item
                  title={`Notification ${index + 1}`}
                  description="This is a placeholder notification"
                  left={(props) => <List.Icon {...props} icon="bell" />}
                  right={(props) => (
                    <View style={styles.unreadIndicator}>
                      <View
                        style={[
                          styles.unreadDot,
                          { backgroundColor: theme.colors.error },
                        ]}
                      />
                    </View>
                  )}
                  style={[
                    styles.notificationItem,
                    { backgroundColor: theme.colors.surface },
                  ]}
                  titleStyle={{ color: theme.colors.onSurface }}
                  descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                />
                {index < Math.min(unreadCount, 5) - 1 && <Divider />}
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontWeight: '600',
  },
  unreadText: {
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    textAlign: 'center',
    maxWidth: 280,
  },
  notificationsList: {
    marginTop: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  notificationItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 1,
  },
  unreadIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default NotificationsScreen;
