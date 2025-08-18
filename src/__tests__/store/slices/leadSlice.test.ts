/**
 * Lead Slice Tests
 * Comprehensive tests for pagination and upsert functionality
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
  selectLeadsLoading,
  selectLeadsError,
  type LeadState,
  type UpsertLeadsPayload,
} from '../../../store/slices/leadSlice';
import type { Lead } from '../../../database/models/Lead';

// Mock lead data
const mockLead1: Lead = {
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
};

const mockLead2: Lead = {
  id: 'LEAD-002',
  status: 'In Discussion',
  priority: 'medium',
  created_at: '2023-01-02T00:00:00Z',
  updated_at: '2023-01-02T00:00:00Z',
  sync_status: 'synced',
  local_changes: '{}',
  customerName: 'Jane Smith',
  phone: '0987654321',
  address: '456 Oak Ave',
  assignedTo: 'CP-001',
  services: ['SRV002'],
  follow_up_date: '2023-12-01T00:00:00Z',
};

const mockLead3: Lead = {
  id: 'LEAD-003',
  status: 'Won',
  priority: 'low',
  created_at: '2023-01-03T00:00:00Z',
  updated_at: '2023-01-03T00:00:00Z',
  sync_status: 'pending',
  local_changes: '{}',
  customerName: 'Bob Johnson',
  phone: '5555555555',
  address: '789 Pine Rd',
  assignedTo: 'CP-001',
  services: ['SRV001', 'SRV002'],
};

// Test store setup
const createTestStore = () => {
  return configureStore({
    reducer: {
      lead: leadSlice,
    },
  });
};

describe('Lead Slice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
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

  describe('upsertLeads', () => {
    it('should upsert leads for first page', () => {
      const payload: UpsertLeadsPayload = {
        items: [mockLead1, mockLead2],
        page: 1,
        totalPages: 3,
        totalCount: 50,
      };

      store.dispatch(upsertLeads(payload));
      const state = store.getState().lead;

      expect(state.items).toEqual({
        [mockLead1.id]: mockLead1,
        [mockLead2.id]: mockLead2,
      });
      expect(state.pagesLoaded).toEqual([1]);
      expect(state.totalPages).toBe(3);
      expect(state.totalCount).toBe(50);
      expect(state.lastSync).toBeTruthy();
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('should merge leads from multiple pages', () => {
      // Add page 1
      store.dispatch(
        upsertLeads({
          items: [mockLead1, mockLead2],
          page: 1,
          totalPages: 3,
          totalCount: 50,
        })
      );

      // Add page 2 with new lead and updated existing lead
      const updatedLead1 = { ...mockLead1, status: 'In Discussion' };
      store.dispatch(
        upsertLeads({
          items: [updatedLead1, mockLead3],
          page: 2,
          totalPages: 3,
          totalCount: 50,
        })
      );

      const state = store.getState().lead;

      expect(Object.keys(state.items)).toHaveLength(3);
      expect(state.items[mockLead1.id].status).toBe('In Discussion'); // Updated
      expect(state.items[mockLead2.id]).toEqual(mockLead2); // Preserved
      expect(state.items[mockLead3.id]).toEqual(mockLead3); // New
      expect(state.pagesLoaded).toEqual([1, 2]);
    });

    it('should not duplicate pages in pagesLoaded', () => {
      const payload: UpsertLeadsPayload = {
        items: [mockLead1],
        page: 1,
        totalPages: 3,
      };

      // Add same page twice
      store.dispatch(upsertLeads(payload));
      store.dispatch(upsertLeads(payload));

      const state = store.getState().lead;
      expect(state.pagesLoaded).toEqual([1]);
    });

    it('should keep pagesLoaded sorted', () => {
      // Add pages out of order
      store.dispatch(
        upsertLeads({
          items: [mockLead3],
          page: 3,
          totalPages: 3,
        })
      );

      store.dispatch(
        upsertLeads({
          items: [mockLead1],
          page: 1,
          totalPages: 3,
        })
      );

      store.dispatch(
        upsertLeads({
          items: [mockLead2],
          page: 2,
          totalPages: 3,
        })
      );

      const state = store.getState().lead;
      expect(state.pagesLoaded).toEqual([1, 2, 3]);
    });

    it('should handle invalid leads gracefully', () => {
      const invalidLead = { status: 'Test' } as Lead; // Missing id

      store.dispatch(
        upsertLeads({
          items: [mockLead1, invalidLead, mockLead2],
          page: 1,
          totalPages: 1,
        })
      );

      const state = store.getState().lead;
      expect(Object.keys(state.items)).toHaveLength(2); // Only valid leads
      expect(state.items[mockLead1.id]).toEqual(mockLead1);
      expect(state.items[mockLead2.id]).toEqual(mockLead2);
    });
  });

  describe('clearPages', () => {
    it('should clear all pages and reset state', () => {
      // First add some data
      store.dispatch(
        upsertLeads({
          items: [mockLead1, mockLead2],
          page: 1,
          totalPages: 2,
          totalCount: 30,
        })
      );

      // Then clear
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

  describe('Individual item operations', () => {
    beforeEach(() => {
      // Pre-populate state
      store.dispatch(
        upsertLeads({
          items: [mockLead1, mockLead2],
          page: 1,
          totalPages: 2,
        })
      );
    });

    it('should add new item', () => {
      store.dispatch(addItem(mockLead3));

      const state = store.getState().lead;
      expect(state.items[mockLead3.id]).toEqual(mockLead3);
      expect(state.totalCount).toBe(3);
    });

    it('should update existing item', () => {
      const updatedLead = { ...mockLead1, status: 'Updated Status' };
      store.dispatch(updateItem(updatedLead));

      const state = store.getState().lead;
      expect(state.items[mockLead1.id].status).toBe('Updated Status');
    });

    it('should not update non-existent item', () => {
      const nonExistentLead = { ...mockLead3, id: 'NON-EXISTENT' };
      store.dispatch(updateItem(nonExistentLead));

      const state = store.getState().lead;
      expect(state.items['NON-EXISTENT']).toBeUndefined();
    });

    it('should remove item', () => {
      store.dispatch(removeItem(mockLead1.id));

      const state = store.getState().lead;
      expect(state.items[mockLead1.id]).toBeUndefined();
      expect(state.totalCount).toBe(1);
    });
  });

  describe('Selectors', () => {
    beforeEach(() => {
      store.dispatch(
        upsertLeads({
          items: [mockLead1, mockLead2, mockLead3],
          page: 1,
          totalPages: 2,
          totalCount: 40,
        })
      );
    });

    it('should select all leads', () => {
      const leads = selectLeads(store.getState());
      expect(leads).toHaveLength(3);
      expect(leads.map((l) => l.id)).toContain(mockLead1.id);
      expect(leads.map((l) => l.id)).toContain(mockLead2.id);
      expect(leads.map((l) => l.id)).toContain(mockLead3.id);
    });

    it('should select total count', () => {
      const totalCount = selectLeadsTotalCount(store.getState());
      expect(totalCount).toBe(40);
    });

    it('should select loading state', () => {
      const isLoading = selectLeadsLoading(store.getState());
      expect(isLoading).toBe(false);
    });

    it('should select error state', () => {
      const error = selectLeadsError(store.getState());
      expect(error).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty items array', () => {
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
          items: [mockLead1],
          page: 1,
          totalPages: 1,
          // totalCount not provided
        })
      );

      const state = store.getState().lead;
      expect(state.totalCount).toBe(0); // Should remain unchanged
    });
  });
});
