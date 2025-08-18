/**
 * Lead Selectors Tests
 * Test advanced selectors for pagination and sorting
 */
import { configureStore } from '@reduxjs/toolkit';
import leadSlice, { upsertLeads } from '../../../store/slices/leadSlice';
import {
  selectLeadsByPage,
  selectAllLeadsSorted,
  selectPaginationMeta,
  selectLeadsNeedingFollowUp,
  selectLeadsByStatusWithCounts,
  selectRecentlyUpdatedLeads,
  selectHighPriorityLeads,
  selectLeadsBySearchText,
  selectLeadById,
  selectLeadStatistics,
} from '../../../store/selectors/leadSelectors';
import type { Lead } from '../../../database/models/Lead';

// Mock leads with different scenarios
const mockLeads: Lead[] = [
  {
    id: 'LEAD-001',
    status: 'New Lead',
    priority: 'high',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    sync_status: 'synced',
    local_changes: '{}',
    customerName: 'John Doe',
    phone: '1234567890',
    address: '123 Main St',
    assignedTo: 'CP-001',
    services: ['SRV001'],
    follow_up_date: '2023-12-01T00:00:00Z', // Future
  },
  {
    id: 'LEAD-002',
    status: 'In Discussion',
    priority: 'medium',
    created_at: '2023-01-02T00:00:00Z',
    updated_at: new Date().toISOString(), // Recently updated
    sync_status: 'synced',
    local_changes: '{}',
    customerName: 'Jane Smith',
    phone: '0987654321',
    address: '456 Oak Ave',
    assignedTo: 'CP-001',
    services: ['SRV002'],
    follow_up_date: '2023-01-01T00:00:00Z', // Past (overdue)
  },
  {
    id: 'LEAD-003',
    status: 'Won',
    priority: 'high',
    created_at: '2023-01-03T00:00:00Z',
    updated_at: '2023-01-03T00:00:00Z',
    sync_status: 'pending',
    local_changes: '{}',
    customerName: 'Bob Johnson',
    phone: '5555555555',
    address: '789 Pine Rd',
    assignedTo: 'CP-001',
    services: ['SRV001', 'SRV002'],
    // No follow_up_date
  },
  {
    id: 'LEAD-004',
    status: 'New Lead',
    priority: 'low',
    created_at: '2023-01-04T00:00:00Z',
    updated_at: '2023-01-04T00:00:00Z',
    sync_status: 'failed',
    local_changes: '{}',
    customerName: 'Alice Brown',
    phone: '1111111111',
    address: '321 Elm St',
    assignedTo: 'CP-002',
    services: ['SRV003'],
    follow_up_date: '2023-11-01T00:00:00Z', // Near future
  },
];

const createTestStore = () => {
  return configureStore({
    reducer: {
      lead: leadSlice,
    },
  });
};

describe('Lead Selectors', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    // Populate store with test data
    store.dispatch(
      upsertLeads({
        items: mockLeads,
        page: 1,
        totalPages: 2,
        totalCount: 80,
      })
    );
  });

  describe('selectLeadsByPage', () => {
    it('should return leads for loaded page', () => {
      const leadsPage1 = selectLeadsByPage(1)(store.getState());
      expect(leadsPage1).toHaveLength(4); // All leads for now
    });

    it('should return empty array for unloaded page', () => {
      const leadsPage2 = selectLeadsByPage(2)(store.getState());
      expect(leadsPage2).toHaveLength(0);
    });
  });

  describe('selectAllLeadsSorted', () => {
    it('should sort leads by follow_up_date ascending', () => {
      const sortedLeads = selectAllLeadsSorted(store.getState());

      expect(sortedLeads).toHaveLength(4);

      // First should be overdue (earliest date)
      expect(sortedLeads[0].id).toBe('LEAD-002');
      expect(sortedLeads[0].follow_up_date).toBe('2023-01-01T00:00:00Z');

      // Then near future
      expect(sortedLeads[1].id).toBe('LEAD-004');
      expect(sortedLeads[1].follow_up_date).toBe('2023-11-01T00:00:00Z');

      // Then far future
      expect(sortedLeads[2].id).toBe('LEAD-001');
      expect(sortedLeads[2].follow_up_date).toBe('2023-12-01T00:00:00Z');

      // Last should be lead without follow_up_date
      expect(sortedLeads[3].id).toBe('LEAD-003');
      expect(sortedLeads[3].follow_up_date).toBeUndefined();
    });
  });

  describe('selectPaginationMeta', () => {
    it('should return correct pagination metadata', () => {
      const meta = selectPaginationMeta(store.getState());

      expect(meta).toEqual({
        pagesLoaded: [1],
        totalPages: 2,
        totalCount: 80,
        isPageLoaded: expect.any(Function),
      });

      expect(meta.isPageLoaded(1)).toBe(true);
      expect(meta.isPageLoaded(2)).toBe(false);
    });
  });

  describe('selectLeadsNeedingFollowUp', () => {
    it('should categorize leads by follow-up status', () => {
      const followUps = selectLeadsNeedingFollowUp(store.getState());

      expect(followUps.overdue).toHaveLength(1);
      expect(followUps.overdue[0].id).toBe('LEAD-002');

      expect(followUps.upcoming).toHaveLength(2);
      expect(followUps.upcoming.map((l) => l.id)).toContain('LEAD-001');
      expect(followUps.upcoming.map((l) => l.id)).toContain('LEAD-004');
    });
  });

  describe('selectLeadsByStatusWithCounts', () => {
    it('should group leads by status with counts', () => {
      const statusData = selectLeadsByStatusWithCounts(store.getState());

      expect(statusData.counts).toEqual({
        'New Lead': 2,
        'In Discussion': 1,
        Won: 1,
      });

      expect(statusData.groups['New Lead']).toHaveLength(2);
      expect(statusData.groups['In Discussion']).toHaveLength(1);
      expect(statusData.groups['Won']).toHaveLength(1);
      expect(statusData.total).toBe(4);
    });
  });

  describe('selectRecentlyUpdatedLeads', () => {
    it('should return recently updated leads', () => {
      const recentLeads = selectRecentlyUpdatedLeads(store.getState());

      // Only LEAD-002 has recent update date
      expect(recentLeads).toHaveLength(1);
      expect(recentLeads[0].id).toBe('LEAD-002');
    });
  });

  describe('selectHighPriorityLeads', () => {
    it('should return high priority leads sorted by creation date', () => {
      const highPriorityLeads = selectHighPriorityLeads(store.getState());

      expect(highPriorityLeads).toHaveLength(2);
      expect(highPriorityLeads[0].id).toBe('LEAD-001'); // Earlier creation date
      expect(highPriorityLeads[1].id).toBe('LEAD-003');
    });
  });

  describe('selectLeadsBySearchText', () => {
    it('should search by customer name', () => {
      const results = selectLeadsBySearchText('john')(store.getState());
      expect(results).toHaveLength(2); // John Doe and Bob Johnson
    });

    it('should search by phone', () => {
      const results = selectLeadsBySearchText('1234567890')(store.getState());
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('LEAD-001');
    });

    it('should search by address', () => {
      const results = selectLeadsBySearchText('main st')(store.getState());
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('LEAD-001');
    });

    it('should search by lead ID', () => {
      const results = selectLeadsBySearchText('LEAD-003')(store.getState());
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('LEAD-003');
    });

    it('should return all leads for empty search', () => {
      const results = selectLeadsBySearchText('')(store.getState());
      expect(results).toHaveLength(4);
    });

    it('should return empty array for no matches', () => {
      const results = selectLeadsBySearchText('nonexistent')(store.getState());
      expect(results).toHaveLength(0);
    });
  });

  describe('selectLeadById', () => {
    it('should return specific lead by ID', () => {
      const lead = selectLeadById('LEAD-002')(store.getState());
      expect(lead).toEqual(mockLeads[1]);
    });

    it('should return null for non-existent ID', () => {
      const lead = selectLeadById('NON-EXISTENT')(store.getState());
      expect(lead).toBeNull();
    });
  });

  describe('selectLeadStatistics', () => {
    it('should return comprehensive lead statistics', () => {
      const stats = selectLeadStatistics(store.getState());

      expect(stats).toEqual({
        total: 4,
        byPriority: {
          high: 2,
          medium: 1,
          low: 1,
        },
        bySyncStatus: {
          synced: 2,
          pending: 1,
          failed: 1,
        },
        withFollowUpDate: 3,
        withoutFollowUpDate: 1,
      });
    });
  });

  describe('Empty state', () => {
    it('should handle empty state gracefully', () => {
      const emptyStore = createTestStore();

      expect(selectAllLeadsSorted(emptyStore.getState())).toEqual([]);
      expect(selectLeadsNeedingFollowUp(emptyStore.getState())).toEqual({
        overdue: [],
        upcoming: [],
      });
      expect(selectLeadsByStatusWithCounts(emptyStore.getState())).toEqual({});
      expect(selectLeadStatistics(emptyStore.getState())).toEqual({
        total: 0,
        byPriority: { high: 0, medium: 0, low: 0 },
        bySyncStatus: { synced: 0, pending: 0, failed: 0 },
        withFollowUpDate: 0,
        withoutFollowUpDate: 0,
      });
    });
  });
});
