/**
 * Dashboard Refresh Hook
 * Specialized hook for dashboard pull-to-refresh with dashboard API integration
 */
import { useCallback } from 'react';
import { AccessibilityInfo } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAppSelector, useAppDispatch } from './reduxHooks';
import { SyncManager } from '../sync/SyncManager';
import {
  selectSyncInProgress,
  selectNextAllowedSyncAt,
  selectLastSyncAt,
  setSyncStarted,
  setSyncFinished,
  setSyncFailed,
  setNextAllowedSyncAt,
} from '../store/slices/networkSlice';
import { dashboardApi } from '../store/api/dashboardApi';
import { isSyncAllowed, getNextAllowedSyncAt } from '../constants/sync';

/**
 * Dashboard refresh hook return type
 */
export interface UseDashboardRefreshReturn {
  /** Whether refresh is currently in progress */
  refreshing: boolean;
  /** Function to trigger refresh */
  onRefresh: () => void;
  /** Last successful sync timestamp */
  lastSyncAt: number | null;
  /** Next allowed sync timestamp */
  nextAllowedSyncAt: number;
}

/**
 * Dashboard refresh hook with sync guard and dashboard API integration
 *
 * This hook provides pull-to-refresh functionality specifically optimized for
 * the dashboard screen. It integrates with both the general sync system and
 * the dashboard API to ensure fresh data is loaded.
 *
 * Features:
 * - Respects sync guard interval to prevent excessive API calls
 * - Manages sync state in Redux for UI consistency
 * - Invalidates dashboard cache to force fresh data fetch
 * - Provides user feedback via toast messages
 * - Announces refresh actions for accessibility
 * - Handles all error scenarios gracefully
 *
 * @returns Object with refreshing state, onRefresh function, and sync timestamps
 *
 * @example
 * ```typescript
 * const { refreshing, onRefresh, lastSyncAt } = useDashboardRefresh();
 *
 * return (
 *   <ScrollView refreshControl={
 *     <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
 *   }>
 *     <DashboardContent />
 *   </ScrollView>
 * );
 * ```
 */
export const useDashboardRefresh = (): UseDashboardRefreshReturn => {
  const dispatch = useAppDispatch();
  const refreshing = useAppSelector(selectSyncInProgress);
  const nextAllowedSyncAt = useAppSelector(selectNextAllowedSyncAt);
  const lastSyncAt = useAppSelector(selectLastSyncAt);

  const onRefresh = useCallback(async () => {
    const now = Date.now();

    // Check sync guard to prevent excessive refresh attempts
    if (!isSyncAllowed(now, nextAllowedSyncAt)) {
      const waitTimeSeconds = Math.ceil((nextAllowedSyncAt - now) / 1000);
      Toast.show({
        type: 'info',
        text1: 'Please wait',
        text2: `Try again in ${waitTimeSeconds} seconds`,
        visibilityTime: 2000,
      });
      console.log(
        'DashboardRefresh: Sync blocked by guard, wait time:',
        waitTimeSeconds,
        'seconds'
      );
      return;
    }

    // Announce refresh for accessibility
    AccessibilityInfo.announceForAccessibility('Refreshing dashboard data');

    try {
      console.log('DashboardRefresh: Starting dashboard refresh');

      // Set sync started state
      dispatch(setSyncStarted());

      // Update next allowed sync time
      const nextSync = getNextAllowedSyncAt(now);
      dispatch(setNextAllowedSyncAt(nextSync));

      // Trigger sync via SyncManager
      const syncManager = SyncManager.getInstance();
      const result = await syncManager.manualSync('pullToRefresh');

      if (result.success) {
        console.log('DashboardRefresh: Sync completed successfully', {
          duration: result.duration,
          recordCounts: result.recordCounts,
        });

        // Mark sync as finished
        dispatch(setSyncFinished(now));

        // Invalidate dashboard cache to force fresh data fetch
        console.log('DashboardRefresh: Invalidating dashboard cache');
        dispatch(dashboardApi.util.invalidateTags(['DashboardSummary']));

        Toast.show({
          type: 'success',
          text1: 'Dashboard refreshed',
          text2: 'Your dashboard data has been updated',
          visibilityTime: 2000,
        });
      } else {
        console.error('DashboardRefresh: Sync failed:', result.error);

        dispatch(setSyncFailed(result.error || 'Dashboard refresh failed'));

        // Don't show toast for auth failures (handled by error middleware)
        if (result.error !== 'AUTH_EXPIRED') {
          let errorMessage = 'Please try again';

          if (result.error === 'OFFLINE') {
            errorMessage = 'Check your connection';
          } else if (result.error?.includes('timeout')) {
            errorMessage = 'Request timed out';
          }

          Toast.show({
            type: 'error',
            text1: 'Refresh failed',
            text2: errorMessage,
            visibilityTime: 3000,
          });
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        'DashboardRefresh: Unexpected error during refresh:',
        error
      );

      dispatch(setSyncFailed(errorMessage));

      Toast.show({
        type: 'error',
        text1: 'Refresh failed',
        text2: 'Something went wrong',
        visibilityTime: 3000,
      });
    }
  }, [dispatch, nextAllowedSyncAt]);

  return {
    refreshing,
    onRefresh,
    lastSyncAt,
    nextAllowedSyncAt,
  };
};

export default useDashboardRefresh;
