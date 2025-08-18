/**
 * Use Document Count Hook
 * Enhanced with real API integration and cache synchronization
 */
import { useCallback, useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from './reduxHooks';
import { useDatabase } from './useDatabase';
import { DocumentSyncService } from '../services/DocumentSyncService';
import {
  selectDocumentCount,
  selectDocumentCountLoading,
  selectDocumentCountError,
  selectDocumentCountLastSync,
  selectUiLocked,
  selectIsOperationInProgress,
  setDocumentCount,
  incrementDocumentCount,
  resetDocumentCount,
  setLoadingState,
  setErrorState,
  clearError,
  setUiLocked,
  setOperationInProgress,
  clearLeadData,
} from '../store/slices/documentCountSlice';
import {
  useGetDocumentCountQuery,
  useLazyGetDocumentCountQuery,
} from '../store/api/documentApi';

/**
 * Document count hook options
 */
export interface UseDocumentCountOptions {
  /** Skip automatic count fetching */
  skip?: boolean;
  /** Refresh interval in milliseconds */
  refreshInterval?: number;
  /** Use cache first before API */
  useCacheFirst?: boolean;
}

/**
 * Document count hook return type
 */
export interface UseDocumentCountReturn {
  /** Current document count */
  count: number;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Last sync timestamp */
  lastSync: number | null;
  /** Whether UI is locked */
  isCountLocked: boolean;
  /** Whether count operations are in progress */
  isRefreshing: boolean;
  /** Refresh count from server and cache */
  refreshCount: () => Promise<void>;
  /** Increment count by specified amount */
  incrementCount: (increment?: number) => Promise<void>;
  /** Reset count to 0 */
  resetCount: () => Promise<void>;
  /** Clear error state */
  clearErrorState: () => void;
  /** Clear all data for this lead */
  cleanup: () => void;
  /** Reset loading state */
  resetLoadingState: () => void;
  /** Invalidate cache and refresh from server */
  invalidateAndRefresh: () => Promise<void>;
}

/**
 * Use Document Count Hook with Real API Integration
 */
export const useDocumentCount = (
  leadId: string,
  options: UseDocumentCountOptions = {}
): UseDocumentCountReturn => {
  const dispatch = useAppDispatch();
  const { db, authToken } = useDatabase();
  const { skip = false, refreshInterval, useCacheFirst = true } = options;

  // RTK Query hooks for API calls
  const {
    data: apiCountData,
    isLoading: apiLoading,
    error: apiError,
  } = useGetDocumentCountQuery(leadId, {
    skip: skip || !leadId,
    refetchOnMountOrArgChange: true,
  });

  const [triggerApiCount] = useLazyGetDocumentCountQuery();

  // Redux selectors
  const count = useAppSelector(selectDocumentCount(leadId));
  const loading = useAppSelector(selectDocumentCountLoading(leadId));
  const error = useAppSelector(selectDocumentCountError(leadId));
  const lastSync = useAppSelector(selectDocumentCountLastSync(leadId));
  const isCountLocked = useAppSelector(selectUiLocked);
  const isRefreshing = useAppSelector(
    selectIsOperationInProgress(leadId, 'refresh')
  );

  // Refs for cleanup and service
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const documentSyncServiceRef = useRef<DocumentSyncService | null>(null);

  // Initialize document sync service
  useEffect(() => {
    if (db && authToken && !documentSyncServiceRef.current) {
      documentSyncServiceRef.current = new DocumentSyncService(
        db,
        authToken
        // Pass store for Redux updates - we'll access it via dispatch
      );
    }
  }, [db, authToken]);

  const resetLoadingState = useCallback(() => {
    dispatch(setLoadingState({ leadId, loading: false }));
    dispatch(setUiLocked(false));
  }, [leadId, dispatch]);

  /**
   * Refresh count from both cache and server
   */
  const refreshCount = useCallback(async () => {
    if (!leadId || isCountLocked || !documentSyncServiceRef.current) {
      console.log('📊 Refresh skipped:', {
        leadId,
        isCountLocked,
        hasService: !!documentSyncServiceRef.current,
      });
      return;
    }

    // Reset stuck loading state after 10 seconds
    if (loading) {
      console.log('⚠️ Resetting stuck loading state for:', leadId);
      resetLoadingState();
    }

    console.log('📊 Starting document count refresh for lead:', leadId);

    try {
      // Set loading state
      dispatch(setLoadingState({ leadId, loading: true }));
      dispatch(
        setOperationInProgress({
          leadId,
          operation: 'refresh',
          inProgress: true,
        })
      );

      let finalCount = 0;

      if (useCacheFirst) {
        // Try cache first
        try {
          const cachedCount =
            await documentSyncServiceRef.current.getCachedDocumentCount(leadId);
          if (cachedCount > 0) {
            finalCount = cachedCount;
            console.log('📊 Using cached count:', finalCount);
          }
        } catch (cacheError) {
          console.warn(
            '⚠️ Cache read failed, falling back to API:',
            cacheError
          );
        }
      }

      // Get fresh count from API
      try {
        const apiResult = await triggerApiCount(leadId);
        if (apiResult.data?.data?.count !== undefined) {
          finalCount = apiResult.data.data.count;
          console.log('📊 Using API count:', finalCount);

          // Update cache via sync service
          await documentSyncServiceRef.current.syncDocumentsByLead(leadId);
        }
      } catch (apiError) {
        console.warn('⚠️ API call failed:', apiError);
        if (finalCount === 0) {
          throw new Error(
            'Failed to fetch document count from both cache and API'
          );
        }
      }

      // Update Redux state
      if (mountedRef.current) {
        dispatch(setDocumentCount({ leadId, count: finalCount }));
      }

      console.log(
        `✅ Document count refreshed for lead ${leadId}: ${finalCount}`
      );
    } catch (err: any) {
      console.error(
        `❌ Error refreshing document count for lead ${leadId}:`,
        err
      );

      if (mountedRef.current) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to refresh document count';
        dispatch(setErrorState({ leadId, error: errorMessage }));
      }
    } finally {
      if (mountedRef.current) {
        dispatch(setLoadingState({ leadId, loading: false }));
        dispatch(
          setOperationInProgress({
            leadId,
            operation: 'refresh',
            inProgress: false,
          })
        );
      }
    }
  }, [
    leadId,
    loading,
    isCountLocked,
    dispatch,
    triggerApiCount,
    useCacheFirst,
    resetLoadingState,
  ]);

  /**
   * Invalidate cache and refresh from server
   */
  const invalidateAndRefresh = useCallback(async () => {
    if (!documentSyncServiceRef.current || !leadId) {
      return;
    }

    console.log('🔄 Invalidating cache and refreshing for lead:', leadId);

    try {
      dispatch(setLoadingState({ leadId, loading: true }));

      await documentSyncServiceRef.current.invalidateLeadDocuments(leadId);

      console.log('✅ Cache invalidated and refreshed for lead:', leadId);
    } catch (error: any) {
      console.error('❌ Failed to invalidate and refresh:', error);
      dispatch(
        setErrorState({
          leadId,
          error: error.message || 'Failed to refresh documents',
        })
      );
    } finally {
      dispatch(setLoadingState({ leadId, loading: false }));
    }
  }, [leadId, dispatch]);

  /**
   * Increment count by specified amount
   */
  const incrementCount = useCallback(
    async (increment: number = 1) => {
      if (!leadId || loading || isCountLocked) {
        return;
      }

      try {
        // Set loading state and UI lock
        dispatch(setLoadingState({ leadId, loading: true }));
        dispatch(setUiLocked(true));
        dispatch(
          setOperationInProgress({
            leadId,
            operation: 'increment',
            inProgress: true,
          })
        );

        // Update Redux state immediately for optimistic UI
        if (mountedRef.current) {
          dispatch(incrementDocumentCount({ leadId, increment }));
        }

        console.log(
          `✅ Document count incremented for lead ${leadId}: +${increment}`
        );
      } catch (err: any) {
        console.error(
          `❌ Error incrementing document count for lead ${leadId}:`,
          err
        );

        if (mountedRef.current) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : 'Failed to increment document count';
          dispatch(setErrorState({ leadId, error: errorMessage }));
        }
      } finally {
        if (mountedRef.current) {
          dispatch(setLoadingState({ leadId, loading: false }));
          dispatch(setUiLocked(false));
          dispatch(
            setOperationInProgress({
              leadId,
              operation: 'increment',
              inProgress: false,
            })
          );
        }
      }
    },
    [leadId, loading, isCountLocked, dispatch]
  );

  /**
   * Reset count to 0
   */
  const resetCount = useCallback(async () => {
    if (!leadId || loading || isCountLocked) {
      return;
    }

    try {
      // Set loading state and UI lock
      dispatch(setLoadingState({ leadId, loading: true }));
      dispatch(setUiLocked(true));
      dispatch(
        setOperationInProgress({ leadId, operation: 'reset', inProgress: true })
      );

      // Update state if component is still mounted
      if (mountedRef.current) {
        dispatch(resetDocumentCount(leadId));
      }

      console.log(`✅ Document count reset for lead ${leadId}`);
    } catch (err: any) {
      console.error(
        `❌ Error resetting document count for lead ${leadId}:`,
        err
      );

      if (mountedRef.current) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to reset document count';
        dispatch(setErrorState({ leadId, error: errorMessage }));
      }
    } finally {
      if (mountedRef.current) {
        dispatch(setLoadingState({ leadId, loading: false }));
        dispatch(setUiLocked(false));
        dispatch(
          setOperationInProgress({
            leadId,
            operation: 'reset',
            inProgress: false,
          })
        );
      }
    }
  }, [leadId, loading, isCountLocked, dispatch]);

  /**
   * Clear error state
   */
  const clearErrorState = useCallback(() => {
    if (error) {
      dispatch(clearError(leadId));
    }
  }, [leadId, error, dispatch]);

  /**
   * Clear all data for this lead
   */
  const cleanup = useCallback(() => {
    dispatch(clearLeadData(leadId));
  }, [leadId, dispatch]);

  // Auto-refresh on mount if not skipped
  useEffect(() => {
    if (!skip && !loading && !lastSync && leadId) {
      refreshCount();
    }
  }, [skip, loading, lastSync, refreshCount, leadId]);

  // Handle API data updates
  useEffect(() => {
    if (apiCountData?.data?.count !== undefined && leadId) {
      dispatch(
        setDocumentCount({
          leadId,
          count: apiCountData.data.count,
        })
      );
    }
  }, [apiCountData, leadId, dispatch]);

  // Handle API errors
  useEffect(() => {
    if (apiError && leadId) {
      const errorMessage =
        'message' in apiError
          ? (apiError as any).message
          : 'Failed to fetch document count';
      dispatch(setErrorState({ leadId, error: errorMessage }));
    }
  }, [apiError, leadId, dispatch]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        if (!loading && !isCountLocked) {
          refreshCount();
        }
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }
  }, [refreshInterval, loading, isCountLocked, refreshCount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;

      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, []);

  return {
    count,
    loading: loading || apiLoading,
    error: error || (apiError ? 'API Error' : null),
    lastSync,
    isCountLocked,
    isRefreshing,
    refreshCount,
    incrementCount,
    resetCount,
    clearErrorState,
    cleanup,
    resetLoadingState,
    invalidateAndRefresh,
  };
};
