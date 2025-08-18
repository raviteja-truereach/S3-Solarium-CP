import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';

export interface DashboardSummary {
  total: number;
  todayPending: number;
  overdue: number;
  inProgress?: number;
  newLeads?: number;
}

export interface NetworkState {
  syncInProgress: boolean;
  lastSyncAt: number | null;
  nextAllowedSyncAt: number;
  dashboardSummary: DashboardSummary | null;
  lastError: string | null;
  unreadNotificationCount: number;
  lastSyncTs: string | undefined;
}

const initialState: NetworkState = {
  syncInProgress: false,
  lastSyncAt: null,
  nextAllowedSyncAt: 0,
  dashboardSummary: null,
  lastError: null,
  unreadNotificationCount: 0,
  lastSyncTs: undefined,
};

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setSyncStarted: (state) => {
      state.syncInProgress = true;
      state.lastError = null;
    },
    setSyncFinished: (state, action: PayloadAction<number>) => {
      state.syncInProgress = false;
      state.lastSyncAt = action.payload;
      state.lastError = null;
    },
    setSyncFailed: (state, action: PayloadAction<string>) => {
      state.syncInProgress = false;
      state.lastError = action.payload;
    },
    setNextAllowedSyncAt: (state, action: PayloadAction<number>) => {
      state.nextAllowedSyncAt = action.payload;
    },
    setDashboardSummary: (state, action: PayloadAction<DashboardSummary>) => {
      state.dashboardSummary = action.payload;
    },
    clearError: (state) => {
      state.lastError = null;
    },
    setUnreadNotificationCount: (state, action: PayloadAction<number>) => {
      state.unreadNotificationCount = Math.max(0, action.payload); // Ensure non-negative
    },
    setLastSyncTimestamp: (state, action: PayloadAction<string>) => {
      state.lastSyncTs = action.payload;
    },
  },
});

export const {
  setSyncStarted,
  setSyncFinished,
  setSyncFailed,
  setNextAllowedSyncAt,
  setDashboardSummary,
  clearError,
  setUnreadNotificationCount,
  setLastSyncTimestamp,
} = networkSlice.actions;

export const selectSyncInProgress = (state: RootState) =>
  state.network.syncInProgress;
export const selectLastSyncAt = (state: RootState) => state.network.lastSyncAt;
export const selectNextAllowedSyncAt = (state: RootState) =>
  state.network.nextAllowedSyncAt;
export const selectDashboardSummary = (state: RootState) =>
  state.network.dashboardSummary;
export const selectNetworkError = (state: RootState) => state.network.lastError;
export const selectUnreadCount = (state: RootState) =>
  state.network.unreadNotificationCount;
export const selectLastSyncTs = (state: RootState) => state.network.lastSyncTs;

export default networkSlice.reducer;
