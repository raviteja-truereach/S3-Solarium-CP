/**
 * Network Slice Tests
 * Tests for network state management, sync status, and dashboard data
 */
import networkSlice, {
  setSyncStarted,
  setSyncFinished,
  setSyncFailed,
  setNextAllowedSyncAt,
  setDashboardSummary,
  clearError,
  selectSyncInProgress,
  selectLastSyncAt,
  selectNextAllowedSyncAt,
  selectDashboardSummary,
  selectNetworkError,
  NetworkState,
} from '../../../src/store/slices/networkSlice';
import { DashboardSummary } from '../../../src/types/api';

describe('networkSlice', () => {
  const initialState: NetworkState = {
    syncInProgress: false,
    lastSyncAt: null,
    nextAllowedSyncAt: 0,
    dashboardSummary: null,
    lastError: null,
  };

  describe('reducers', () => {
    it('should handle setSyncStarted', () => {
      const action = setSyncStarted();
      const newState = networkSlice(initialState, action);

      expect(newState.syncInProgress).toBe(true);
      expect(newState.lastError).toBe(null);
    });

    it('should handle setSyncFinished', () => {
      const timestamp = Date.now();
      const action = setSyncFinished(timestamp);
      const newState = networkSlice(initialState, action);

      expect(newState.syncInProgress).toBe(false);
      expect(newState.lastSyncAt).toBe(timestamp);
      expect(newState.lastError).toBe(null);
    });

    it('should handle setSyncFailed', () => {
      const errorMessage = 'Network error';
      const action = setSyncFailed(errorMessage);
      const newState = networkSlice(initialState, action);

      expect(newState.syncInProgress).toBe(false);
      expect(newState.lastError).toBe(errorMessage);
    });

    it('should handle setNextAllowedSyncAt', () => {
      const timestamp = Date.now() + 30000;
      const action = setNextAllowedSyncAt(timestamp);
      const newState = networkSlice(initialState, action);

      expect(newState.nextAllowedSyncAt).toBe(timestamp);
    });

    it('should handle setDashboardSummary', () => {
      const dashboardSummary: DashboardSummary = {
        total: 25,
        todayPending: 5,
        overdue: 2,
        newLeads: 3,
        inProgress: 15,
        won: 20,
        lost: 5,
        lastUpdated: new Date().toISOString(),
      };

      const action = setDashboardSummary(dashboardSummary);
      const newState = networkSlice(initialState, action);

      expect(newState.dashboardSummary).toEqual(dashboardSummary);
    });

    it('should handle clearError', () => {
      const stateWithError: NetworkState = {
        ...initialState,
        lastError: 'Some error',
      };

      const action = clearError();
      const newState = networkSlice(stateWithError, action);

      expect(newState.lastError).toBe(null);
    });
  });

  describe('selectors', () => {
    const mockState = {
      network: {
        syncInProgress: true,
        lastSyncAt: 1234567890,
        nextAllowedSyncAt: 9876543210,
        dashboardSummary: {
          total: 25,
          todayPending: 5,
          overdue: 2,
        } as DashboardSummary,
        lastError: 'Test error',
      },
    };

    it('should select syncInProgress', () => {
      expect(selectSyncInProgress(mockState)).toBe(true);
    });

    it('should select lastSyncAt', () => {
      expect(selectLastSyncAt(mockState)).toBe(1234567890);
    });

    it('should select nextAllowedSyncAt', () => {
      expect(selectNextAllowedSyncAt(mockState)).toBe(9876543210);
    });

    it('should select dashboardSummary', () => {
      expect(selectDashboardSummary(mockState)).toEqual({
        total: 25,
        todayPending: 5,
        overdue: 2,
      });
    });

    it('should select networkError', () => {
      expect(selectNetworkError(mockState)).toBe('Test error');
    });

    it('should return null for dashboardSummary when not set', () => {
      const stateWithoutSummary = {
        network: {
          ...mockState.network,
          dashboardSummary: null,
        },
      };

      expect(selectDashboardSummary(stateWithoutSummary)).toBe(null);
    });
  });
});
