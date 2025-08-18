/**
 * Pull-to-Refresh Control Component
 * Wrapper around React Native's RefreshControl with sync integration
 */
import React from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';
import { useTheme } from 'react-native-paper';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

/**
 * Pull-to-refresh control props
 */
export interface PullToRefreshControlProps
  extends Omit<RefreshControlProps, 'refreshing' | 'onRefresh'> {
  /** Optional custom refresh handler (will be called after sync) */
  onRefreshComplete?: () => void;
}

/**
 * Pull-to-Refresh Control Component
 *
 * Provides a themed RefreshControl that integrates with the app's sync system.
 * Handles sync guard logic, state management, and user feedback automatically.
 *
 * Features:
 * - Automatic sync triggering on pull-to-refresh
 * - Sync guard protection (prevents too frequent syncs)
 * - Toast notifications for user feedback
 * - Accessibility announcements
 * - Themed colors matching app design
 *
 * @param props - RefreshControl props (excluding refreshing and onRefresh)
 * @returns Themed RefreshControl component
 */
export const PullToRefreshControl: React.FC<PullToRefreshControlProps> =
  React.memo(({ onRefreshComplete, ...refreshControlProps }) => {
    const theme = useTheme();
    const { refreshing, onRefresh } = usePullToRefresh();

    // Handle refresh completion callback
    const handleRefresh = React.useCallback(async () => {
      await onRefresh();
      onRefreshComplete?.();
    }, [onRefresh, onRefreshComplete]);

    return (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handleRefresh}
        tintColor={theme.colors.primary}
        colors={[theme.colors.primary]}
        progressBackgroundColor={theme.colors.surface}
        title="Pull to refresh"
        titleColor={theme.colors.onSurface}
        {...refreshControlProps}
      />
    );
  });

PullToRefreshControl.displayName = 'PullToRefreshControl';

export default PullToRefreshControl;
