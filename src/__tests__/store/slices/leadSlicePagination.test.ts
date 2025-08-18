/**
 * Lead Slice Pagination Tests - Comprehensive Coverage
 * Tests normalized structure, pagination metadata, upsert operations, and selectors
 */
import { configureStore } from '@reduxjs/toolkit';
import leadSlice, {
  upsertLeads,
  clearPages,
  addItem,
  updateItem,
  removeItem,
  selectLeads,
  selectLeadsTotalCount,
  selectPaginationMeta,
  type LeadState,
  type UpsertLeadsPayload,
} from '../../../store/slices/leadSlice';
import {
  selectLeadsByPage,
  selectAllLeadsSorted,
  selectLeadsNeedingFollowUp,
  selectLeadsByStatusWithCounts,
  selectRecentlyUpdatedLeads,
  selectHighPriorityLeads,
  selectLeadsBySearchText,
  selectLeadById,
  selectLeadStatistics,
} from '../../../store/selectors/leadSelectors';
import { leadApi } from '../../../store/api/leadApi';
import type { Lead } from '../../../database/models/Lead';
import type { ApiLead } from '../../../types/api';

// Mock leads for testing
const createMockLead = (id: string, overrides: Partial<Lead> = {}): Lead => ({
  id,
  status: 'New Lead',
  priority: 'medium',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  sync_status: 'synced',
  local_changes: '{}',
  customerName: `Customer ${id}`,
  phone: `+91${id.replace(/\D/g, '').padStart(10, '0')}`,
  address: `Address ${id}`,
  assignedTo: 'CP-001',
  services: ['SRV001'],
  ...overrides,
});

const createMockApiLead = (
  id: string,
  overrides: Partial<ApiLead> = {}
): ApiLead => ({
  leadId: id,
  customerName: `API Customer ${id}`,
  phone: `+91${id.replace(/\D/g, '').padStart(10, '0')}`,
  address: `API Address ${id}`,
  status: 'New Lead',
  services: ['SRV001'],
  assignedTo: 'CP-001',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  ...overrides,
});

const createTestStore = () => {
  return configureStore({
    reducer: {
      lead: leadSlice,
      [leadApi.reducerPath]: leadApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(leadApi.middleware),
  });
};

describe('Lead Slice Pagination - Comprehensive Tests', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('Initial State', () => {
    it('should have correct normalized initial state', () => {
      const state = store.getState().lead;

      expect(state).toEqual({
        items: {},
        pagesLoaded: [],
        totalPages: 0,
        totalCount: 0,
        lastSync: null,
        isLoading: false,
        error: null,
        filters: {},
      });
    });
  });

  describe('upsertLeads Action', () => {
    it('should upsert leads for first page correctly', () => {
      const apiLeads = [
        createMockApiLead('LEAD-001'),
        createMockApiLead('LEAD-002'),
      ];

      const payload: UpsertLeadsPayload = {
        items: apiLeads,
        page: 1,
        totalPages: 3,
        totalCount: 50,
      };

      store.dispatch(upsertLeads(payload));
      const state = store.getState().lead;

      // Verify normalized structure
      expect(Object.keys(state.items)).toHaveLength(2);
      expect(state.items['LEAD-001']).toBeDefined();
      expect(state.items['LEAD-002']).toBeDefined();

      // Verify API data transformation
      expect(state.items['LEAD-001'].customerName).toBe(
        'API Customer LEAD-001'
      );
      expect(state.items['LEAD-001'].priority).toBe('medium'); // Default
      expect(state.items['LEAD-001'].sync_status).toBe('synced');

      // Verify pagination metadata
      expect(state.pagesLoaded).toEqual([1]);
      expect(state.totalPages).toBe(3);
      expect(state.totalCount).toBe(50);
      expect(state.lastSync).toBeTruthy();
    });

    it('should merge leads from multiple pages without duplicates', () => {
      // Page 1
      const page1Leads = [
        createMockApiLead('LEAD-001'),
        createMockApiLead('LEAD-002'),
      ];

      store.dispatch(
        upsertLeads({
          items: page1Leads,
          page: 1,
          totalPages: 3,
          totalCount: 50,
        })
      );

      // Page 2 with updated lead and new lead
      const updatedLead001 = createMockApiLead('LEAD-001', {
        status: 'In Discussion',
        customerName: 'Updated Customer Name',
      });
      const page2Leads = [updatedLead001, createMockApiLead('LEAD-003')];

      store.dispatch(
        upsertLeads({
          items: page2Leads,
          page: 2,
          totalPages: 3,
          totalCount: 50,
        })
      );

      const state = store.getState().lead;

      // Should have 3 unique leads
      expect(Object.keys(state.items)).toHaveLength(3);

      // Lead 001 should be updated
      expect(state.items['LEAD-001'].status).toBe('In Discussion');
      expect(state.items['LEAD-001'].customerName).toBe(
        'Updated Customer Name'
      );

      // Other leads should be preserved
      expect(state.items['LEAD-002']).toBeDefined();
      expect(state.items['LEAD-003']).toBeDefined();

      // Pages should be tracked
      expect(state.pagesLoaded).toEqual([1, 2]);
    });

    it('should maintain sorted pagesLoaded array', () => {
      // Add pages out of order
      store.dispatch(
        upsertLeads({
          items: [createMockApiLead('LEAD-003')],
          page: 3,
          totalPages: 5,
        })
      );

      store.dispatch(
        upsertLeads({
          items: [createMockApiLead('LEAD-001')],
          page: 1,
          totalPages: 5,
        })
      );

      store.dispatch(
        upsertLeads({
          items: [createMockApiLead('LEAD-004')],
          page: 4,
          totalPages: 5,
        })
      );

      store.dispatch(
        upsertLeads({
          items: [createMockApiLead('LEAD-002')],
          page: 2,
          totalPages: 5,
        })
      );

      const state = store.getState().lead;
      expect(state.pagesLoaded).toEqual([1, 2, 3, 4]);
    });

    it('should not duplicate pages in pagesLoaded', () => {
      const payload: UpsertLeadsPayload = {
        items: [createMockApiLead('LEAD-001')],
        page: 1,
        totalPages: 2,
      };

      // Dispatch same page multiple times
      store.dispatch(upsertLeads(payload));
      store.dispatch(upsertLeads(payload));
      store.dispatch(upsertLeads(payload));

      const state = store.getState().lead;
      expect(state.pagesLoaded).toEqual([1]);
    });

    it('should handle empty items array gracefully', () => {
      store.dispatch(
        upsertLeads({
          items: [],
          page: 1,
          totalPages: 0,
          totalCount: 0,
        })
      );

      const state = store.getState().lead;
      expect(state.items).toEqual({});
      expect(state.pagesLoaded).toEqual([1]);
      expect(state.totalPages).toBe(0);
      expect(state.totalCount).toBe(0);
    });

    it('should handle totalCount not provided', () => {
      store.dispatch(
        upsertLeads({
          items: [createMockApiLead('LEAD-001')],
          page: 1,
          totalPages: 1,
          // totalCount not provided
        })
      );

      const state = store.getState().lead;
      expect(state.totalCount).toBe(0); // Should remain unchanged
    });
  });

  describe('clearPages Action', () => {
    it('should clear all pages and reset pagination state', () => {
      // Setup initial data
      store.dispatch(
        upsertLeads({
          items: [createMockApiLead('LEAD-001'), createMockApiLead('LEAD-002')],
          page: 1,
          totalPages: 2,
          totalCount: 30,
        })
      );

      // Clear pages
      store.dispatch(clearPages());

      const state = store.getState().lead;
      expect(state.items).toEqual({});
      expect(state.pagesLoaded).toEqual([]);
      expect(state.totalPages).toBe(0);
      expect(state.totalCount).toBe(0);
      expect(state.lastSync).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('Individual Item Operations', () => {
    beforeEach(() => {
      // Pre-populate state
      store.dispatch(
        upsertLeads({
          items: [createMockApiLead('LEAD-001'), createMockApiLead('LEAD-002')],
          page: 1,
          totalPages: 1,
          totalCount: 2,
        })
      );
    });

    it('should add new item to normalized structure', () => {
      const newLead = createMockLead('LEAD-003');
      store.dispatch(addItem(newLead));

      const state = store.getState().lead;
      expect(state.items['LEAD-003']).toEqual(newLead);
      expect(Object.keys(state.items)).toHaveLength(3);
    });

    it('should update existing item in normalized structure', () => {
      const existingId = 'LEAD-001';
      const updatedLead = createMockLead(existingId, {
        status: 'Won',
        customerName: 'Updated Customer Name',
      });

      store.dispatch(updateItem(updatedLead));

      const state = store.getState().lead;
      expect(state.items[existingId].status).toBe('Won');
      expect(state.items[existingId].customerName).toBe(
        'Updated Customer Name'
      );
    });

    it('should not update non-existent item', () => {
      const nonExistentLead = createMockLead('NON-EXISTENT');
      store.dispatch(updateItem(nonExistentLead));

      const state = store.getState().lead;
      expect(state.items['NON-EXISTENT']).toBeUndefined();
      expect(Object.keys(state.items)).toHaveLength(2); // Original count
    });

    it('should remove item from normalized structure', () => {
      store.dispatch(removeItem('LEAD-001'));

      const state = store.getState().lead;
      expect(state.items['LEAD-001']).toBeUndefined();
      expect(Object.keys(state.items)).toHaveLength(1);
    });
  });

  describe('Basic Selectors', () => {
    beforeEach(() => {
      const leads = [
        createMockApiLead('LEAD-001', {
          status: 'New Lead',
          priority: 'high' as any,
        }),
        createMockApiLead('LEAD-002', {
          status: 'In Discussion',
          priority: 'medium' as any,
        }),
        createMockApiLead('LEAD-003', {
          status: 'Won',
          priority: 'low' as any,
        }),
      ];

      store.dispatch(
        upsertLeads({
          items: leads,
          page: 1,
          totalPages: 1,
          totalCount: 3,
        })
      );
    });

    it('should select all leads from normalized structure', () => {
      const leads = selectLeads(store.getState());
      expect(leads).toHaveLength(3);
      expect(leads.map((l) => l.id)).toContain('LEAD-001');
      expect(leads.map((l) => l.id)).toContain('LEAD-002');
      expect(leads.map((l) => l.id)).toContain('LEAD-003');
    });

    it('should select pagination metadata', () => {
      const meta = selectPaginationMeta(store.getState());
      expect(meta).toEqual({
        pagesLoaded: [1],
        totalPages: 1,
        totalCount: 3,
        isPageLoaded: expect.any(Function),
      });

      expect(meta.isPageLoaded(1)).toBe(true);
      expect(meta.isPageLoaded(2)).toBe(false);
    });

    it('should select total count', () => {
      const totalCount = selectLeadsTotalCount(store.getState());
      expect(totalCount).toBe(3);
    });
  });

  describe('Advanced Selectors', () => {
    beforeEach(() => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      const recentUpdate = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

      const leads = [
        createMockApiLead('LEAD-001', {
          status: 'New Lead',
          priority: 'high' as any,
          follow_up_date: futureDate.toISOString(),
          updated_at: recentUpdate.toISOString(),
        }),
        createMockApiLead('LEAD-002', {
          status: 'In Discussion',
          priority: 'medium' as any,
          follow_up_date: pastDate.toISOString(), // Overdue
        }),
        createMockApiLead('LEAD-003', {
          status: 'Won',
          priority: 'high' as any,
          // No follow_up_date
        }),
        createMockApiLead('LEAD-004', {
          status: 'New Lead',
          priority: 'low' as any,
          follow_up_date: futureDate.toISOString(),
        }),
      ];

      store.dispatch(
        upsertLeads({
          items: leads,
          page: 1,
          totalPages: 1,
          totalCount: 4,
        })
      );
    });

    it('should select leads sorted by follow-up date', () => {
      const sortedLeads = selectAllLeadsSorted(store.getState());

      expect(sortedLeads).toHaveLength(4);

      // First should be overdue (earliest date)
      expect(sortedLeads[0].id).toBe('LEAD-002');

      // Leads without follow-up should be last
      expect(sortedLeads[sortedLeads.length - 1].id).toBe('LEAD-003');
    });

    it('should categorize leads needing follow-up', () => {
      const followUps = selectLeadsNeedingFollowUp(store.getState());

      expect(followUps.overdue).toHaveLength(1);
      expect(followUps.overdue[0].id).toBe('LEAD-002');

      expect(followUps.upcoming).toHaveLength(2);
      expect(followUps.upcoming.map((l) => l.id)).toContain('LEAD-001');
      expect(followUps.upcoming.map((l) => l.id)).toContain('LEAD-004');
    });

    it('should group leads by status with counts', () => {
      const statusData = selectLeadsByStatusWithCounts(store.getState());

      expect(statusData.counts).toEqual({
        'New Lead': 2,
        'In Discussion': 1,
        Won: 1,
      });

      expect(statusData.total).toBe(4);
      expect(statusData.groups['New Lead']).toHaveLength(2);
    });

    it('should select recently updated leads', () => {
      const recentLeads = selectRecentlyUpdatedLeads(store.getState());

      // Should include LEAD-001 which was updated 1 hour ago
      expect(recentLeads).toHaveLength(1);
      expect(recentLeads[0].id).toBe('LEAD-001');
    });

    it('should select high priority leads', () => {
      const highPriorityLeads = selectHighPriorityLeads(store.getState());

      expect(highPriorityLeads).toHaveLength(2);
      expect(highPriorityLeads.map((l) => l.id)).toContain('LEAD-001');
      expect(highPriorityLeads.map((l) => l.id)).toContain('LEAD-003');
    });

    it('should search leads by text', () => {
      // Search by customer name (partial match)
      const searchResults1 = selectLeadsBySearchText('Customer LEAD-001')(
        store.getState()
      );
      expect(searchResults1).toHaveLength(1);
      expect(searchResults1[0].id).toBe('LEAD-001');

      // Search by lead ID
      const searchResults2 = selectLeadsBySearchText('LEAD-002')(
        store.getState()
      );
      expect(searchResults2).toHaveLength(1);
      expect(searchResults2[0].id).toBe('LEAD-002');

      // Search with no results
      const searchResults3 = selectLeadsBySearchText('nonexistent')(
        store.getState()
      );
      expect(searchResults3).toHaveLength(0);

      // Empty search should return all
      const searchResults4 = selectLeadsBySearchText('')(store.getState());
      expect(searchResults4).toHaveLength(4);
    });

    it('should select specific lead by ID', () => {
      const lead = selectLeadById('LEAD-002')(store.getState());
      expect(lead).toBeDefined();
      expect(lead!.id).toBe('LEAD-002');

      const nonExistentLead = selectLeadById('NON-EXISTENT')(store.getState());
      expect(nonExistentLead).toBeNull();
    });

    it('should calculate comprehensive statistics', () => {
      const stats = selectLeadStatistics(store.getState());

      expect(stats).toEqual({
        total: 4,
        byPriority: {
          high: 2,
          medium: 1,
          low: 1,
        },
        bySyncStatus: {
          synced: 4,
          pending: 0,
          failed: 0,
        },
        withFollowUpDate: 3,
        withoutFollowUpDate: 1,
      });
    });
  });

  describe('Page-specific Selectors', () => {
    beforeEach(() => {
      // Setup multi-page data
      store.dispatch(
        upsertLeads({
          items: [
            createMockApiLead('LEAD-P1-001'),
            createMockApiLead('LEAD-P1-002'),
          ],
          page: 1,
          totalPages: 3,
          totalCount: 6,
        })
      );

      store.dispatch(
        upsertLeads({
          items: [
            createMockApiLead('LEAD-P2-001'),
            createMockApiLead('LEAD-P2-002'),
          ],
          page: 2,
          totalPages: 3,
          totalCount: 6,
        })
      );
    });

    it('should select leads by page (when implemented)', () => {
      // Note: Current implementation returns all leads for any loaded page
      // This test documents the current behavior
      const page1Leads = selectLeadsByPage(1)(store.getState());
      const page2Leads = selectLeadsByPage(2)(store.getState());

      // Both should return all leads since pages are loaded
      expect(page1Leads).toHaveLength(4);
      expect(page2Leads).toHaveLength(4);

      // Unloaded page should return empty
      const page3Leads = selectLeadsByPage(3)(store.getState());
      expect(page3Leads).toHaveLength(0);
    });
  });

  describe('API Integration via extraReducers', () => {
    it('should handle leadApi.getLeads.fulfilled', () => {
      const mockApiResponse = {
        items: [
          createMockApiLead('API-LEAD-001'),
          createMockApiLead('API-LEAD-002'),
        ],
        total: 2,
        page: 1,
        totalPages: 1,
        offset: 0,
        limit: 25,
      };

      // Simulate API fulfilled action
      const action = {
        type: leadApi.endpoints.getLeads.matchFulfilled.type,
        payload: mockApiResponse,
      };

      store.dispatch(action);
      const state = store.getState().lead;

      expect(Object.keys(state.items)).toHaveLength(2);
      expect(state.items['API-LEAD-001']).toBeDefined();
      expect(state.items['API-LEAD-002']).toBeDefined();
      expect(state.pagesLoaded).toEqual([1]);
      expect(state.totalCount).toBe(2);
    });

    it('should handle leadApi.getLeads.pending', () => {
      const action = {
        type: leadApi.endpoints.getLeads.matchPending.type,
      };

      store.dispatch(action);
      const state = store.getState().lead;

      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle leadApi.getLeads.rejected', () => {
      const action = {
        type: leadApi.endpoints.getLeads.matchRejected.type,
        error: { message: 'API request failed' },
      };

      store.dispatch(action);
      const state = store.getState().lead;

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('API request failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid lead data in upsertLeads', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Try to upsert with invalid payload
      const invalidPayload = {
        items: null as any,
        page: 1,
        totalPages: 1,
      };

      store.dispatch(upsertLeads(invalidPayload));

      const state = store.getState().lead;
      expect(state.error).toContain('Invalid leads data received');

      consoleSpy.mockRestore();
    });

    it('should handle transformation errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Create lead with circular reference to cause JSON.stringify to fail
      const circularLead = createMockApiLead('CIRCULAR-001');
      (circularLead as any).circular = circularLead;

      store.dispatch(
        upsertLeads({
          items: [circularLead],
          page: 1,
          totalPages: 1,
        })
      );

      // Should handle error gracefully
      const state = store.getState().lead;
      expect(state.error).toBeTruthy();

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of leads efficiently', () => {
      const largeLeadSet = Array.from({ length: 1000 }, (_, i) =>
        createMockApiLead(`LARGE-LEAD-${String(i + 1).padStart(4, '0')}`)
      );

      const startTime = Date.now();

      store.dispatch(
        upsertLeads({
          items: largeLeadSet,
          page: 1,
          totalPages: 1,
          totalCount: 1000,
        })
      );

      const duration = Date.now() - startTime;
      const state = store.getState().lead;

      expect(Object.keys(state.items)).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle selector performance with large dataset', () => {
      // Setup large dataset
      const largeLeadSet = Array.from({ length: 500 }, (_, i) =>
        createMockApiLead(`PERF-LEAD-${String(i + 1).padStart(3, '0')}`, {
          status:
            i % 3 === 0 ? 'New Lead' : i % 3 === 1 ? 'In Discussion' : 'Won',
          priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
        })
      );

      store.dispatch(
        upsertLeads({
          items: largeLeadSet,
          page: 1,
          totalPages: 1,
          totalCount: 500,
        })
      );

      // Test selector performance
      const startTime = Date.now();

      const allLeads = selectLeads(store.getState());
      const sortedLeads = selectAllLeadsSorted(store.getState());
      const statusCounts = selectLeadsByStatusWithCounts(store.getState());
      const statistics = selectLeadStatistics(store.getState());

      const duration = Date.now() - startTime;

      expect(allLeads).toHaveLength(500);
      expect(sortedLeads).toHaveLength(500);
      expect(statusCounts.total).toBe(500);
      expect(statistics.total).toBe(500);
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });
  });
});
