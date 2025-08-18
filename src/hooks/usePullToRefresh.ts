/**
 * Pull-to-Refresh Hook
 * Provides pull-to-refresh functionality with sync guard and state management
 */
import { useCallback } from 'react';
import { AccessibilityInfo } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAppSelector, useAppDispatch } from './reduxHooks';
import { SyncManager } from '../sync/SyncManager';
import {
  selectSyncInProgress,
  selectNextAllowedSyncAt,
  setSyncStarted,
  setSyncFinished,
  setSyncFailed,
  setNextAllowedSyncAt,
} from '../store/slices/networkSlice';
import {
  isSyncAllowed,
  getNextAllowedSyncAt,
  SYNC_GUARD_MS,
} from '../constants/sync';

/**
 * Hook return type
 */
export interface UsePullToRefreshReturn {
  /** Whether refresh is currently in progress */
  refreshing: boolean;
  /** Function to trigger refresh */
  onRefresh: () => void;
  /** Next allowed sync timestamp */
  nextAllowedSyncAt: number;
}

/**
 * Pull-to-refresh hook with sync guard and state management
 *
 * Features:
 * - Respects sync guard interval (SYNC_GUARD_MS)
 * - Manages sync state in Redux
 * - Shows toast messages for user feedback
 * - Announces refresh for accessibility
 * - Prevents duplicate sync operations
 *
 * @returns Object with refreshing state and onRefresh function
 */
export const usePullToRefresh = (): UsePullToRefreshReturn => {
  const dispatch = useAppDispatch();
  const refreshing = useAppSelector(selectSyncInProgress);
  const nextAllowedSyncAt = useAppSelector(selectNextAllowedSyncAt);

  const onRefresh = useCallback(async () => {
    const now = Date.now();

    // Check sync guard
    if (!isSyncAllowed(now, nextAllowedSyncAt)) {
      const waitTimeSeconds = Math.ceil((nextAllowedSyncAt - now) / 1000);
      Toast.show({
        type: 'info',
        text1: 'Please wait',
        text2: `Try again in ${waitTimeSeconds} seconds`,
        visibilityTime: 2000,
      });
      console.log(
        'PullToRefresh: Sync blocked by guard, wait time:',
        waitTimeSeconds,
        'seconds'
      );
      return;
    }

    // Announce refresh for accessibility
    AccessibilityInfo.announceForAccessibility('Refreshing data');

    try {
      console.log('PullToRefresh: Starting manual sync');

      // Set sync started state
      dispatch(setSyncStarted());

      // Update next allowed sync time
      const nextSync = getNextAllowedSyncAt(now);
      dispatch(setNextAllowedSyncAt(nextSync));

      // Trigger sync via SyncManager
      const syncManager = SyncManager.getInstance();
      const result = await syncManager.manualSync('pullToRefresh');

      if (result.success) {
        console.log('PullToRefresh: Sync completed successfully', {
          duration: result.duration,
          recordCounts: result.recordCounts,
        });

        dispatch(setSyncFinished(now));

        Toast.show({
          type: 'success',
          text1: 'Data refreshed',
          text2: 'Your data has been updated',
          visibilityTime: 2000,
        });
      } else {
        console.error('PullToRefresh: Sync failed:', result.error);

        dispatch(setSyncFailed(result.error || 'Sync failed'));

        // Don't show toast for auth failures (handled by error middleware)
        if (result.error !== 'AUTH_EXPIRED') {
          Toast.show({
            type: 'error',
            text1: 'Refresh failed',
            text2:
              result.error === 'OFFLINE'
                ? 'Check your connection'
                : 'Please try again',
            visibilityTime: 3000,
          });
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('PullToRefresh: Unexpected error during sync:', error);

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
    nextAllowedSyncAt,
  };
};

export default usePullToRefresh;
