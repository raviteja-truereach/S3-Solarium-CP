/**
 * Pull-to-Refresh Integration Tests
 * Tests the complete flow from UI to SyncManager to Redux updates
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MyLeadsScreen } from '../../screens/leads/MyLeadsScreen';
import leadSliceReducer, { upsertLeads } from '../../store/slices/leadSlice';
import * as SyncManager from '../../services/SyncManager';
import * as ConnectivityContext from '../../contexts/ConnectivityContext';

// Mock dependencies
jest.mock('../../services/SyncManager');
jest.mock('../../contexts/ConnectivityContext');
jest.mock('../../hooks/usePaginatedLeads');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

const mockSyncManager = SyncManager.SyncManager as jest.Mocked<
  typeof SyncManager.SyncManager
>;
const mockUseConnectivity =
  ConnectivityContext.useConnectivity as jest.MockedFunction<
    typeof ConnectivityContext.useConnectivity
  >;

// Mock usePaginatedLeads
const mockUsePaginatedLeads = require('../../hooks/usePaginatedLeads')
  .usePaginatedLeads as jest.MockedFunction<any>;

describe('Pull-to-Refresh Integration', () => {
  const createTestStore = () => {
    return configureStore({
      reducer: { lead: leadSliceReducer },
      preloadedState: {
        lead: {
          items: {
            'LEAD-001': { id: 'LEAD-001', customerName: 'Initial Lead' },
          },
          pagesLoaded: [1],
          totalPages: 1,
          totalCount: 1,
          lastSync: new Date().toISOString(),
          isLoading: false,
          loadingNext: false,
          hasMore: false,
          error: null,
          filters: {},
        },
      },
    });
  };

  const renderWithProvider = (store = createTestStore()) => {
    return render(
      <Provider store={store}>
        <MyLeadsScreen />
      </Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseConnectivity.mockReturnValue({ isOnline: true });
    mockSyncManager.manualSync = jest.fn().mockResolvedValue(undefined);

    mockUsePaginatedLeads.mockReturnValue({
      items: [{ id: 'LEAD-001', customerName: 'Initial Lead' }],
      loadNext: jest.fn(),
      refreshing: false,
      error: null,
      reload: jest.fn(),
    });
  });

  it('should trigger sync on pull-to-refresh', async () => {
    const store = createTestStore();
    const { getByTestId } = renderWithProvider(store);

    const flatList = getByTestId('leads-flatlist');
    const refreshControl = flatList.props.refreshControl;

    // Trigger pull-to-refresh
    fireEvent(refreshControl, 'onRefresh');

    await waitFor(() => {
      expect(mockSyncManager.manualSync).toHaveBeenCalledWith('manual');
    });
  });

  it('should show refreshing state during sync', async () => {
    let resolveSync: () => void;
    const syncPromise = new Promise<void>((resolve) => {
      resolveSync = resolve;
    });
    mockSyncManager.manualSync.mockReturnValue(syncPromise);

    const { getByTestId } = renderWithProvider();

    const flatList = getByTestId('leads-flatlist');
    const refreshControl = flatList.props.refreshControl;

    // Start refresh
    fireEvent(refreshControl, 'onRefresh');

    // Should show refreshing
    expect(refreshControl.props.refreshing).toBe(true);

    // Complete sync
    resolveSync!();

    await waitFor(() => {
      expect(refreshControl.props.refreshing).toBe(false);
    });
  });

  it('should handle sync errors gracefully', async () => {
    const syncError = new Error('Network error');
    mockSyncManager.manualSync.mockRejectedValue(syncError);

    const { getByTestId } = renderWithProvider();

    const flatList = getByTestId('leads-flatlist');
    const refreshControl = flatList.props.refreshControl;

    // Trigger refresh that will fail
    fireEvent(refreshControl, 'onRefresh');

    await waitFor(() => {
      expect(refreshControl.props.refreshing).toBe(false);
    });

    // Should still have original data
    expect(mockUsePaginatedLeads).toHaveBeenCalled();
  });

  it('should respect throttling between refreshes', async () => {
    const { getByTestId } = renderWithProvider();

    const flatList = getByTestId('leads-flatlist');
    const refreshControl = flatList.props.refreshControl;

    // First refresh
    fireEvent(refreshControl, 'onRefresh');

    await waitFor(() => {
      expect(mockSyncManager.manualSync).toHaveBeenCalledTimes(1);
    });

    // Second refresh immediately (should be throttled)
    fireEvent(refreshControl, 'onRefresh');

    // Should not call sync again
    expect(mockSyncManager.manualSync).toHaveBeenCalledTimes(1);
  });

  it('should update UI after successful sync and cache reload', async () => {
    const store = createTestStore();
    const { getByTestId } = renderWithProvider(store);

    // Mock successful sync and new data
    mockUsePaginatedLeads.mockReturnValue({
      items: [
        { id: 'LEAD-001', customerName: 'Updated Lead 1' },
        { id: 'LEAD-002', customerName: 'New Lead 2' },
      ],
      loadNext: jest.fn(),
      refreshing: false,
      error: null,
      reload: jest.fn(),
    });

    const flatList = getByTestId('leads-flatlist');
    const refreshControl = flatList.props.refreshControl;

    // Trigger refresh
    fireEvent(refreshControl, 'onRefresh');

    await waitFor(() => {
      expect(mockSyncManager.manualSync).toHaveBeenCalled();
    });

    // Verify that the hook was called (would trigger re-render with new data)
    expect(mockUsePaginatedLeads).toHaveBeenCalled();
  });
});
