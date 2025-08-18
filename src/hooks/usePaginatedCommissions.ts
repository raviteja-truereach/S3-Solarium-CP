/**
 * usePaginatedCommissions - Custom hook for paginated commission loading with infinite scroll support
 * Following the exact same pattern as usePaginatedCustomers
 *
 * Features:
 * - Integrates RTK-Query with Redux pagination state
 * - Handles offline scenarios gracefully
 * - Provides loadNext() with proper guards
 * - Auto-reload when connectivity restored
 * - Full TypeScript typing
 * - AbortController cleanup on unmount
 */

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { commissionApi } from '../store/api/commissionApi';
import {
  selectPaginatedCommissions,
  selectPaginationMeta,
  selectPaginationLoading,
  selectCanLoadMore,
} from '../store/selectors/commissionSelectors';
import {
  startNextPageLoad,
  finishNextPageLoad,
  resetPagination,
} from '../store/slices/commissionSlice';
import { useConnectivity } from '../contexts/ConnectivityContext';
import type { Commission } from '../database/models/Commission';

/**
 * Return type for usePaginatedCommissions hook
 */
export interface UsePaginatedCommissionsResult {
  /** Array of commissions from all loaded pages */
  items: Commission[];
  /** Function to load next page - no-op if already loading or no more pages */
  loadNext: () => Promise<void>;
  /** Whether currently refreshing (loading first page) */
  refreshing: boolean;
  /** Current error state */
  error: string | null;
  /** Function to reload from beginning */
  reload: () => Promise<void>;
}

/**
 * Configuration options for usePaginatedCommissions
 */
export interface UsePaginatedCommissionsOptions {
  /** Number of items per page (default: 25) */
  pageSize?: number;
  /** Whether to auto-reload when coming online (default: true) */
  autoReloadOnline?: boolean;
}

/**
 * Custom hook for paginated commission loading with infinite scroll support
 * Following the exact same pattern as usePaginatedCustomers
 *
 * @param options Configuration options
 * @returns UsePaginatedCommissionsResult with items, loadNext, refreshing, error, reload
 *
 * @example
 * ```typescript
 * const { items, loadNext, refreshing, error, reload } = usePaginatedCommissions({
 *   pageSize: 25,
 *   autoReloadOnline: true
 * });
 *
 * // Load more items
 * const handleLoadMore = () => {
 *   loadNext(); // No-op if already loading or no more pages
 * };
 *
 * // Reload from beginning
 * const handleRefresh = () => {
 *   reload();
 * };
 * ```
 */
export function usePaginatedCommissions(
  options: UsePaginatedCommissionsOptions = {}
): UsePaginatedCommissionsResult {
  const { pageSize = 25, autoReloadOnline = true } = options;

  // Get connectivity state
  const { isOnline } = useConnectivity();

  // Get pagination state from Redux store
  const commissions = useSelector(selectPaginatedCommissions);
  const paginationMeta = useSelector(selectPaginationMeta);
  const loadingState = useSelector(selectPaginationLoading);
  const canLoadMore = useSelector(selectCanLoadMore);

  // Redux dispatch
  const dispatch = useDispatch();

  // Track which page to load next
  const nextPageRef = useRef(1);

  // Calculate next page based on loaded pages
  const nextPage = useMemo(() => {
    const loadedPages = paginationMeta.pagesLoaded;
    if (loadedPages.length === 0) return 1;

    // Find the next page that hasn't been loaded
    let page = 1;
    while (loadedPages.includes(page)) {
      page++;
    }
    return page;
  }, [paginationMeta.pagesLoaded]);

  // RTK Query lazy hook for manual triggering
  const [
    triggerGetCommissions,
    { isLoading: queryLoading, error: queryError },
  ] = commissionApi.useLazyGetCommissionsQuery();

  // AbortController ref for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Load next page of commissions
   * No-op if already loading or no more pages available
   * Resolves instantly when offline
   */
  const loadNext = useCallback(async (): Promise<void> => {
    // Guard: Check if we can load more
    if (!canLoadMore) {
      console.log('🚫 loadNext: No more pages available');
      return;
    }

    // Guard: Check if already loading
    if (loadingState.isAnyLoading) {
      console.log('🚫 loadNext: Already loading');
      return;
    }

    // Guard: Check if offline - resolve instantly as required
    if (!isOnline) {
      console.log('📱 loadNext: Offline, resolving instantly');
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    const currentPage = nextPage;
    const offset = (currentPage - 1) * pageSize;

    console.log(
      `💰 Loading page ${currentPage} (offset: ${offset}, limit: ${pageSize})`
    );

    // Start loading state
    dispatch(startNextPageLoad());

    try {
      const result = await triggerGetCommissions(
        { offset, limit: pageSize },
        { signal: abortControllerRef.current.signal }
      ).unwrap();

      // Calculate total pages from result
      const totalPages = Math.ceil((result.data?.total || 0) / pageSize);

      // Finish loading state - success
      dispatch(
        finishNextPageLoad({
          page: currentPage,
          totalPages,
          success: true,
        })
      );

      console.log(`✅ Page ${currentPage} loaded successfully`);
    } catch (error: any) {
      // Don't treat abort as an error
      if (error.name === 'AbortError') {
        console.log('🚫 Request aborted');
        return;
      }

      const errorMessage =
        error.message || error.error || 'Failed to load next page';

      // Finish loading state - error
      dispatch(
        finishNextPageLoad({
          page: currentPage,
          totalPages: paginationMeta.totalPages,
          success: false,
          error: errorMessage,
        })
      );

      console.error(`❌ Page ${currentPage} failed:`, errorMessage);
      throw error; // Re-throw for caller to handle if needed
    } finally {
      // Clear abort controller
      abortControllerRef.current = null;
    }
  }, [
    canLoadMore,
    loadingState.isAnyLoading,
    isOnline,
    nextPage,
    pageSize,
    dispatch,
    triggerGetCommissions,
    paginationMeta.totalPages,
  ]);

  /**
   * Reload commissions from the beginning
   * Resets pagination state and loads first page
   */
  const reload = useCallback(async (): Promise<void> => {
    console.log('🔄 Reloading commissions from beginning');

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset pagination state
    dispatch(resetPagination());
    nextPageRef.current = 1;

    // Load first page
    await loadNext();
  }, [dispatch, loadNext]);

  // Auto-reload when coming online if cache is empty
  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    const wasOffline = !prevOnlineRef.current;
    const isNowOnline = isOnline;
    prevOnlineRef.current = isOnline;

    if (
      wasOffline &&
      isNowOnline &&
      autoReloadOnline &&
      commissions.length === 0
    ) {
      console.log('🌐 Back online with empty cache, auto-reloading...');
      reload();
    }
  }, [isOnline, autoReloadOnline, commissions.length, reload]);

  // Load initial page if no data and online
  useEffect(() => {
    if (
      commissions.length === 0 &&
      isOnline &&
      !loadingState.isAnyLoading &&
      paginationMeta.pagesLoaded.length === 0
    ) {
      console.log('🚀 Initial load - no data found, loading first page');
      loadNext();
    }
  }, [
    commissions.length,
    isOnline,
    loadingState.isAnyLoading,
    paginationMeta.pagesLoaded.length,
    loadNext,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        console.log('🧹 Component unmounting, aborting requests');
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Determine current error state
  const currentError = useMemo(() => {
    if (paginationMeta.error) return paginationMeta.error;
    if (queryError) {
      if (typeof queryError === 'string') return queryError;
      if ('message' in queryError) return queryError.message as string;
      if ('error' in queryError) return queryError.error as string;
      return 'Failed to load commissions';
    }
    return null;
  }, [paginationMeta.error, queryError]);

  return {
    items: commissions,
    loadNext,
    refreshing: loadingState.isLoading,
    error: currentError,
    reload,
  };
}

/**
 * Default export for convenience
 */
export default usePaginatedCommissions;
