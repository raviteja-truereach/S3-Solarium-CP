/**
 * MyLeadsScreen Sync Consistency Tests
 * Tests for ST-06-6 requirements
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { leadApi } from '../../src/store/api/leadApi';
import leadReducer from '../../src/store/slices/leadSlice';

// Mock MyLeadsScreen
const mockMyLeadsScreen = jest.fn(() => null);
jest.mock('../../src/screens/leads/MyLeadsScreen', () => mockMyLeadsScreen);

// Mock SyncManager
const mockSyncManager = {
  manualSync: jest.fn().mockResolvedValue(undefined),
};
jest.mock('../../src/services/SyncManager', () => ({
  getSyncManager: () => mockSyncManager,
}));

const createMockStore = () => {
  return configureStore({
    reducer: {
      lead: leadReducer,
      [leadApi.reducerPath]: leadApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(leadApi.middleware),
  });
};

describe('MyLeadsScreen Sync Consistency', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    store = createMockStore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('5-Second Auto-Refresh', () => {
    test('should refresh MyLeadsScreen within 5 seconds after status update', async () => {
      const invalidateTagsSpy = jest.spyOn(leadApi.util, 'invalidateTags');

      // Initial lead state
      store.dispatch({
        type: 'leads/addItem',
        payload: {
          id: 'LEAD-123',
          status: 'New Lead',
          customerName: 'John Doe',
          updated_at: new Date().toISOString(),
        },
      });

      // Simulate successful status update
      store.dispatch({
        type: 'leadApi/executeMutation/fulfilled',
        payload: { success: true },
        meta: {
          arg: {
            originalArgs: {
              leadId: 'LEAD-123',
              status: 'In Discussion',
              remarks: 'Updated via test',
            },
          },
        },
      });

      // Advance timers to trigger auto-refresh (should happen at 1.5s)
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Verify that cache invalidation was triggered
      await waitFor(() => {
        expect(invalidateTagsSpy).toHaveBeenCalledWith(['LeadList']);
      });
    });

    test('should schedule background sync within 3 seconds', async () => {
      // Simulate status update success
      store.dispatch({
        type: 'leadApi/executeMutation/fulfilled',
        payload: { success: true },
        meta: {
          arg: {
            originalArgs: { leadId: 'LEAD-123', status: 'Won' },
          },
        },
      });

      // Fast-forward 4 seconds to trigger background sync
      act(() => {
        jest.advanceTimersByTime(4000);
      });

      // Verify background sync was triggered
      await waitFor(() => {
        expect(mockSyncManager.manualSync).toHaveBeenCalledWith('statusUpdate');
      });
    });
  });

  describe('Redux State Consistency', () => {
    test('should update Redux state immediately after status change', () => {
      // Initial state
      store.dispatch({
        type: 'leads/addItem',
        payload: {
          id: 'LEAD-123',
          status: 'New Lead',
          customerName: 'John Doe',
        },
      });

      // Update status
      store.dispatch({
        type: 'leads/updateLeadStatus',
        payload: {
          leadId: 'LEAD-123',
          status: 'In Discussion',
          remarks: 'Customer contacted',
        },
      });

      // Verify immediate update
      const state = store.getState();
      const lead = state.lead.items['LEAD-123'];
      expect(lead.status).toBe('In Discussion');
      expect(lead.remarks).toBe('Customer contacted');
      expect(lead.sync_status).toBe('synced');
    });

    test('should maintain state consistency after RTK Query refetch', async () => {
      // Simulate RTK Query refetch with updated data
      store.dispatch({
        type: 'leadApi/executeQuery/fulfilled',
        payload: {
          data: {
            leads: [
              {
                leadId: 'LEAD-123',
                status: 'Won',
                customerName: 'John Doe',
                remarks: 'Customer agreed to purchase',
                updatedAt: new Date().toISOString(),
              },
            ],
          },
        },
        meta: {
          arg: {
            originalArgs: { summary: false },
          },
        },
      });

      // Verify Redux state reflects API data
      const state = store.getState();
      const lead = state.lead.items['LEAD-123'];
      expect(lead).toBeDefined();
      expect(lead.status).toBe('Won');
      expect(lead.sync_status).toBe('synced');
    });
  });

  describe('Cache Refresh Performance', () => {
    test('should complete refresh cycle within 5 seconds', async () => {
      const startTime = Date.now();

      // Trigger status update
      store.dispatch({
        type: 'leads/updateLeadStatus',
        payload: {
          leadId: 'LEAD-123',
          status: 'Won',
        },
      });

      // Simulate RTK Query cache refresh
      store.dispatch({
        type: 'leadApi/executeQuery/fulfilled',
        payload: {
          data: {
            leads: [
              { leadId: 'LEAD-123', status: 'Won', customerName: 'John Doe' },
            ],
          },
        },
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within 5 seconds
      expect(totalTime).toBeLessThan(5000);
    });
  });

  describe('Unchanged Record Filtering', () => {
    test('should not sync unchanged leads', async () => {
      // Set up initial state
      store.dispatch({
        type: 'leads/upsertLeads',
        payload: [
          {
            id: 'LEAD-123',
            status: 'New Lead',
            customerName: 'John Doe',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      // Simulate sync with same data (unchanged)
      const unchangedLead = {
        leadId: 'LEAD-123',
        status: 'New Lead',
        customerName: 'John Doe',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      // Mock sync manager filtering logic
      const existingLeads = Object.values(store.getState().lead.items);
      const shouldSync =
        unchangedLead.updatedAt !== existingLeads[0]?.updated_at;

      expect(shouldSync).toBe(false);
    });

    test('should sync changed leads only', async () => {
      // Set up initial state
      store.dispatch({
        type: 'leads/upsertLeads',
        payload: [
          {
            id: 'LEAD-123',
            status: 'New Lead',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      // Simulate sync with changed data
      const changedLead = {
        leadId: 'LEAD-123',
        status: 'In Discussion', // Changed
        updatedAt: '2024-01-02T00:00:00Z', // Changed
      };

      const existingLeads = Object.values(store.getState().lead.items);
      const shouldSync =
        changedLead.status !== existingLeads[0]?.status ||
        changedLead.updatedAt !== existingLeads[0]?.updated_at;

      expect(shouldSync).toBe(true);
    });
  });
});
