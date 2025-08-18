/**
 * useLeadsRefresh - Hook for pull-to-refresh integration with SyncManager
 *
 * Features:
 * - Integrates SyncManager.manualSync with pull-to-refresh
 * - Re-hydrates Redux from SQLite after successful sync
 * - Handles sync throttling and error states
 * - Provides unified refresh behavior
 * - Mutex protection against concurrent syncs
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert } from 'react-native';
import { SyncManager } from '../services/SyncManager';
import { leadApi } from '../store/api/leadApi';
import { upsertLeads, resetPagination } from '../store/slices/leadSlice';
import { selectLeadState } from '../store/selectors/leadSelectors';
import { useConnectivity } from '../contexts/ConnectivityContext';
import type { Lead } from '../database/models/Lead';

/**
 * Result interface for useLeadsRefresh hook
 */
export interface UseLeadsRefreshResult {
  /** Whether currently refreshing */
  refreshing: boolean;
  /** Function to trigger manual refresh */
  onRefresh: () => Promise<void>;
  /** Last refresh timestamp */
  lastRefresh: Date | null;
  /** Whether sync is throttled */
  isThrottled: boolean;
  /** Remaining throttle time in seconds */
  throttleRemaining: number;
}

/**
 * Configuration options for useLeadsRefresh
 */
export interface UseLeadsRefreshOptions {
  /** Whether to show toast messages for errors */
  showToasts?: boolean;
  /** Custom throttle time in seconds (default: 30) */
  throttleSeconds?: number;
  /** Whether to reset pagination after refresh */
  resetPaginationOnRefresh?: boolean;
}

/**
 * Hook for handling leads refresh with SyncManager integration
 *
 * @param options Configuration options
 * @returns UseLeadsRefreshResult with refresh state and handlers
 *
 * @example
 * ```typescript
 * const { refreshing, onRefresh, isThrottled } = useLeadsRefresh({
 *   showToasts: true,
 *   resetPaginationOnRefresh: true
 * });
 *
 * // Use in RefreshControl
 * <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
 * ```
 */
export function useLeadsRefresh(
  options: UseLeadsRefreshOptions = {}
): UseLeadsRefreshResult {
  const {
    showToasts = true,
    throttleSeconds = 30,
    resetPaginationOnRefresh = true,
  } = options;

  // State management
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [throttleRemaining, setThrottleRemaining] = useState(0);

  // Redux
  const dispatch = useDispatch();
  const leadState = useSelector(selectLeadState);
  const { isOnline } = useConnectivity();

  // Mutex to prevent concurrent syncs
  const syncMutexRef = useRef(false);
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);

  console.log('🔄 useLeadsRefresh hook initialized');

  /**
   * Load leads from SQLite cache into Redux
   */
  const rehydrateFromCache = useCallback(async (): Promise<void> => {
    try {
      console.log('💾 Re-hydrating leads from SQLite cache');

      // Option 1: Use RTK Query to fetch fresh data (will hit cache first)
      const result = await dispatch(
        leadApi.endpoints.getLeads.initiate({
          offset: 0,
          limit: 100, // Get more items after refresh
          forceRefresh: true,
        })
      ).unwrap();

      console.log('✅ Cache re-hydration successful:', {
        itemsCount: result.items?.length || 0,
        totalCount: result.totalCount,
      });

      // Reset pagination state if requested
      if (resetPaginationOnRefresh) {
        dispatch(resetPagination());
      }
    } catch (error) {
      console.error('❌ Cache re-hydration failed:', error);
      throw new Error('Failed to reload data from cache');
    }
  }, [dispatch, resetPaginationOnRefresh]);

  /**
   * Check if sync is currently throttled
   */
  const checkThrottled = useCallback((): boolean => {
    if (!lastRefresh) return false;

    const timeSinceLastRefresh = (Date.now() - lastRefresh.getTime()) / 1000;
    const remaining = throttleSeconds - timeSinceLastRefresh;

    if (remaining > 0) {
      setThrottleRemaining(Math.ceil(remaining));
      return true;
    }

    setThrottleRemaining(0);
    return false;
  }, [lastRefresh, throttleSeconds]);

  /**
   * Start throttle countdown timer
   */
  const startThrottleTimer = useCallback(() => {
    if (throttleTimerRef.current) {
      clearInterval(throttleTimerRef.current);
    }

    throttleTimerRef.current = setInterval(() => {
      const isStillThrottled = checkThrottled();
      if (!isStillThrottled && throttleTimerRef.current) {
        clearInterval(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    }, 1000);
  }, [checkThrottled]);

  /**
   * Show toast message for sync status
   */
  const showToast = useCallback(
    (message: string, isError: boolean = false) => {
      if (!showToasts) return;

      if (isError) {
        Alert.alert('Sync Error', message);
      } else {
        // For non-error messages, you might want to use a toast library
        // For now, using Alert for consistency
        Alert.alert('Sync Status', message);
      }
    },
    [showToasts]
  );

  /**
   * Main refresh function that integrates SyncManager
   */
  const onRefresh = useCallback(async (): Promise<void> => {
    console.log('🔄 Manual refresh triggered');

    // Guard: Check if already syncing
    if (syncMutexRef.current) {
      console.log('🚫 Sync already in progress, ignoring');
      return;
    }

    // Guard: Check if throttled
    if (checkThrottled()) {
      const message = `Please wait ${throttleRemaining} seconds before refreshing again`;
      console.log(`🚫 Sync throttled: ${message}`);
      showToast(message);
      return;
    }

    // Guard: Check if online
    if (!isOnline) {
      const message = 'Cannot sync while offline';
      console.log(`🚫 ${message}`);
      showToast(message, true);
      return;
    }

    // Acquire mutex
    syncMutexRef.current = true;
    setRefreshing(true);

    try {
      console.log('🔄 Starting SyncManager.manualSync');

      // Invoke SyncManager manual sync
      await SyncManager.manualSync('manual');
      console.log('✅ SyncManager.manualSync completed successfully');

      // Re-hydrate Redux from fresh SQLite cache
      console.log('💾 Re-hydrating Redux from cache');
      await rehydrateFromCache();

      // Update refresh timestamp
      const now = new Date();
      setLastRefresh(now);

      // Start throttle timer
      startThrottleTimer();

      console.log('✅ Manual refresh completed successfully');
    } catch (error: any) {
      const errorMessage = error.message || 'Sync failed';
      console.error('❌ Manual refresh failed:', errorMessage, error);

      // Show error toast
      showToast(`Sync failed: ${errorMessage}`, true);

      // Don't update lastRefresh on error so throttling doesn't apply
    } finally {
      // Release mutex and stop spinner
      syncMutexRef.current = false;
      setRefreshing(false);
    }
  }, [
    checkThrottled,
    throttleRemaining,
    isOnline,
    rehydrateFromCache,
    startThrottleTimer,
    showToast,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (throttleTimerRef.current) {
        clearInterval(throttleTimerRef.current);
      }
    };
  }, []);

  // Calculate current throttled state
  const isThrottled = checkThrottled();

  return {
    refreshing,
    onRefresh,
    lastRefresh,
    isThrottled,
    throttleRemaining,
  };
}

export default useLeadsRefresh;
