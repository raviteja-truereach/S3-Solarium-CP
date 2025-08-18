/**
 * Optimistic Updates & Rollback Integration Tests
 * Testing RTK Query optimistic updates with rollback scenarios
 */

import { configureStore } from '@reduxjs/toolkit';
import { leadApi } from '../../src/store/api/leadApi';
import leadReducer from '../../src/store/slices/leadSlice';

// Mock fetch for different scenarios
global.fetch = jest.fn();

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

describe('Optimistic Updates & Rollback', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
    jest.clearAllMocks();
  });

  describe('Successful Update Flow', () => {
    test('should apply optimistic update immediately', async () => {
      // Mock successful response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Initial lead state
      store.dispatch({
        type: 'leads/addItem',
        payload: {
          id: 'LEAD-123',
          status: 'New Lead',
          customerName: 'John Doe',
        },
      });

      // Dispatch status update
      const updatePromise = store.dispatch(
        leadApi.endpoints.updateLeadStatus.initiate({
          leadId: 'LEAD-123',
          status: 'In Discussion',
          remarks: 'Customer contacted successfully',
        })
      );

      // Optimistic update should be applied immediately
      let state = store.getState();
      const leadAfterOptimistic = state.lead.items['LEAD-123'];
      expect(leadAfterOptimistic?.status).toBe('In Discussion');

      // Wait for completion
      await updatePromise;

      // State should remain consistent
      state = store.getState();
      const leadAfterSuccess = state.lead.items['LEAD-123'];
      expect(leadAfterSuccess?.status).toBe('In Discussion');
    });
  });

  describe('Rollback Scenarios', () => {
    test('should rollback optimistic update on 400 error', async () => {
      // Mock 400 error response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Invalid status transition',
        }),
      });

      // Initial lead state
      store.dispatch({
        type: 'leads/addItem',
        payload: {
          id: 'LEAD-123',
          status: 'New Lead',
          customerName: 'John Doe',
        },
      });

      const initialState = store.getState();
      const initialLead = initialState.lead.items['LEAD-123'];

      // Dispatch status update (should fail)
      try {
        await store.dispatch(
          leadApi.endpoints.updateLeadStatus.initiate({
            leadId: 'LEAD-123',
            status: 'Won', // Invalid transition
            remarks: 'Invalid jump to Won',
          })
        );
      } catch (error) {
        // Error is expected
      }

      // State should be rolled back to original
      const finalState = store.getState();
      const finalLead = finalState.lead.items['LEAD-123'];
      expect(finalLead?.status).toBe(initialLead?.status);
    });

    test('should handle network error with rollback', async () => {
      // Mock network error
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Initial lead state
      store.dispatch({
        type: 'leads/addItem',
        payload: {
          id: 'LEAD-123',
          status: 'In Discussion',
          customerName: 'Jane Doe',
        },
      });

      const initialState = store.getState();
      const initialStatus = initialState.lead.items['LEAD-123']?.status;

      // Dispatch update that will fail
      try {
        await store.dispatch(
          leadApi.endpoints.updateLeadStatus.initiate({
            leadId: 'LEAD-123',
            status: 'Physical Meeting Assigned',
            remarks: 'Meeting scheduled but network failed',
          })
        );
      } catch (error) {
        // Network error is expected
      }

      // Should rollback to initial state
      const finalState = store.getState();
      const finalStatus = finalState.lead.items['LEAD-123']?.status;
      expect(finalStatus).toBe(initialStatus);
    });

    test('should trigger refetch after rollback', async () => {
      const invalidateTagsSpy = jest.spyOn(leadApi.util, 'invalidateTags');

      // Mock 500 error
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      // Initial state
      store.dispatch({
        type: 'leads/addItem',
        payload: {
          id: 'LEAD-123',
          status: 'Customer Accepted',
        },
      });

      // Attempt update that will fail
      try {
        await store.dispatch(
          leadApi.endpoints.updateLeadStatus.initiate({
            leadId: 'LEAD-123',
            status: 'Won',
            remarks: 'Server error test',
          })
        );
      } catch (error) {
        // Error expected
      }

      // Should invalidate tags to trigger refetch
      expect(invalidateTagsSpy).toHaveBeenCalledWith([
        { type: 'Lead', id: 'LEAD-123' },
      ]);
      expect(invalidateTagsSpy).toHaveBeenCalledWith(['LeadList']);
    });
  });

  describe('Mid-Request Network Drop', () => {
    test('should handle request timeout with rollback', async () => {
      // Mock timeout error
      (fetch as jest.Mock).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        });
      });

      // Initial state
      store.dispatch({
        type: 'leads/addItem',
        payload: {
          id: 'LEAD-123',
          status: 'Physical Meeting Assigned',
          customerName: 'Test User',
        },
      });

      const initialState = store.getState();
      const initialLead = initialState.lead.items['LEAD-123'];

      // Start update request
      try {
        await store.dispatch(
          leadApi.endpoints.updateLeadStatus.initiate({
            leadId: 'LEAD-123',
            status: 'Customer Accepted',
            remarks: 'Timeout test',
          })
        );
      } catch (error) {
        // Timeout expected
      }

      // Should rollback to initial state
      const finalState = store.getState();
      const finalLead = finalState.lead.items['LEAD-123'];
      expect(finalLead?.status).toBe(initialLead?.status);
    });

    test('should handle delayed response after component unmount', async () => {
      let resolveResponse: (value: any) => void;

      // Mock delayed response
      (fetch as jest.Mock).mockImplementationOnce(() => {
        return new Promise((resolve) => {
          resolveResponse = resolve;
        });
      });

      // Initial state
      store.dispatch({
        type: 'leads/addItem',
        payload: {
          id: 'LEAD-123',
          status: 'Won',
        },
      });

      // Start request
      const updatePromise = store.dispatch(
        leadApi.endpoints.updateLeadStatus.initiate({
          leadId: 'LEAD-123',
          status: 'Under Execution',
          remarks: 'Delayed response test',
        })
      );

      // Simulate component unmount (abort request)
      updatePromise.abort();

      // Resolve the delayed response (should be ignored)
      setTimeout(() => {
        resolveResponse!({
          ok: true,
          json: async () => ({ success: true }),
        });
      }, 50);

      // Request should be aborted
      await expect(updatePromise).rejects.toThrow();
    });
  });
});
