import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import networkSlice, {
  setSyncStarted,
  setDashboardSummary,
  selectSyncInProgress,
  selectDashboardSummary,
  clearNetworkState,
} from '../../src/store/slices/networkSlice';
import authSlice from '../../src/store/slices/authSlice';
import { DashboardSummary } from '../../src/store/types';

// Create a minimal test store without complex middleware
const createTestStore = () => {
  const rootReducer = combineReducers({
    auth: authSlice,
    network: networkSlice,
  });

  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false, // Disable for testing
      }),
  });
};

describe('networkSlice integration', () => {
  let testStore: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    testStore = createTestStore();
  });

  it('should be included in store and work with dispatch', () => {
    // Verify initial state
    expect(selectSyncInProgress(testStore.getState())).toBe(false);

    // Dispatch an action to verify slice is connected
    testStore.dispatch(setSyncStarted());

    // Verify state changed
    const state = testStore.getState();
    expect(selectSyncInProgress(state)).toBe(true);
  });

  it('should handle dashboard summary updates', () => {
    const mockDashboard: DashboardSummary = {
      totalLeads: 100,
      leadsWon: 20,
      customerAccepted: 5,
      followUpPending: 30,
      activeQuotations: 15,
      totalCommission: 50000,
      pendingCommission: 10000,
      lastUpdatedAt: '2024-01-15T10:30:00Z',
    };

    // Initially should be null
    expect(selectDashboardSummary(testStore.getState())).toBe(null);

    // Set dashboard data
    testStore.dispatch(setDashboardSummary(mockDashboard));

    // Verify data is set
    expect(selectDashboardSummary(testStore.getState())).toEqual(mockDashboard);
  });

  it('should clear network state properly', () => {
    const mockDashboard: DashboardSummary = {
      totalLeads: 100,
      leadsWon: 20,
      customerAccepted: 5,
      followUpPending: 30,
      activeQuotations: 15,
      totalCommission: 50000,
      pendingCommission: 10000,
      lastUpdatedAt: '2024-01-15T10:30:00Z',
    };

    // Set some state
    testStore.dispatch(setSyncStarted());
    testStore.dispatch(setDashboardSummary(mockDashboard));

    // Verify state is set
    expect(selectSyncInProgress(testStore.getState())).toBe(true);
    expect(selectDashboardSummary(testStore.getState())).toEqual(mockDashboard);

    // Clear state
    testStore.dispatch(clearNetworkState());

    // Verify state is cleared
    const clearedState = testStore.getState();
    expect(selectSyncInProgress(clearedState)).toBe(false);
    expect(selectDashboardSummary(clearedState)).toBe(null);
  });

  it('should maintain separate network state from auth state', () => {
    // Dispatch to network slice
    testStore.dispatch(setSyncStarted());

    const state = testStore.getState();

    // Verify both slices exist and are independent
    expect(state.network).toBeDefined();
    expect(state.auth).toBeDefined();

    // Network state should be updated
    expect(selectSyncInProgress(state)).toBe(true);

    // Auth and network should be separate objects
    expect(state.network).not.toBe(state.auth);
    expect(typeof state.network).toBe('object');
    expect(typeof state.auth).toBe('object');
  });
});
