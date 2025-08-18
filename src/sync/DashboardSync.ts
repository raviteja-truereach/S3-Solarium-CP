import { Store } from '@reduxjs/toolkit';
import { dashboardApi } from '../store/api/dashboardApi';
import { setDashboardSummary } from '../store/slices/networkSlice';
import { DashboardSummaryRequest } from '../store/types';
import type { RootState } from '../store';

/**
 * Dashboard sync utilities
 * Provides methods for manual dashboard data refreshing
 */
export class DashboardSync {
  /**
   * Manually refresh dashboard summary
   * @param store Redux store instance
   * @param params Optional request parameters
   * @returns Promise with success/error result
   */
  public static async refreshSummary(
    store: Store<RootState>,
    params?: DashboardSummaryRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('DashboardSync: Manual refresh started', params);

      const result = await store.dispatch(
        dashboardApi.endpoints.refreshSummary.initiate(params)
      );

      if (result.data) {
        console.log('DashboardSync: Manual refresh successful');
        store.dispatch(setDashboardSummary(result.data));
        return { success: true };
      } else if (result.error) {
        const errorMessage =
          'error' in result.error
            ? result.error.error
            : 'Failed to refresh dashboard';
        console.error('DashboardSync: Manual refresh failed', result.error);
        return { success: false, error: errorMessage };
      } else {
        return { success: false, error: 'Unknown error occurred' };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Refresh failed';
      console.error('DashboardSync: Manual refresh error', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check if dashboard data is stale and needs refresh
   * @param lastUpdatedAt Last update timestamp from dashboard data
   * @param maxAgeMs Maximum age in milliseconds (default: 5 minutes)
   * @returns True if data is stale
   */
  public static isDashboardStale(
    lastUpdatedAt?: string,
    maxAgeMs: number = 300_000 // 5 minutes
  ): boolean {
    if (!lastUpdatedAt) {
      return true; // No data = stale
    }

    const lastUpdate = new Date(lastUpdatedAt).getTime();
    const now = Date.now();
    const age = now - lastUpdate;

    return age > maxAgeMs;
  }
}

export default DashboardSync;
