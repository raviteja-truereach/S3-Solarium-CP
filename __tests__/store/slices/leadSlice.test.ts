/**
 * Lead Slice Tests
 */
import leadReducer, {
  setItems,
  addItem,
  updateItem,
  removeItem,
  setLoading,
  setError,
  clear,
  rehydrate,
  LeadState,
} from '../../../src/store/slices/leadSlice';
import type { Lead } from '../../../src/database/models/Lead';

describe('leadSlice', () => {
  const initialState: LeadState = {
    items: [],
    lastSync: null,
    isLoading: false,
    error: null,
    totalCount: 0,
    filters: {},
  };

  const mockLead: Lead = {
    id: 'lead-1',
    status: 'new',
    priority: 'high',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
    sync_status: 'synced',
    local_changes: '{}',
  };

  it('should return initial state', () => {
    expect(leadReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setItems', () => {
    const leads = [mockLead];
    const actual = leadReducer(initialState, setItems(leads));

    expect(actual.items).toEqual(leads);
    expect(actual.totalCount).toBe(1);
    expect(actual.error).toBeNull();
  });

  it('should handle addItem', () => {
    const actual = leadReducer(initialState, addItem(mockLead));

    expect(actual.items).toHaveLength(1);
    expect(actual.items[0]).toEqual(mockLead);
    expect(actual.totalCount).toBe(1);
  });

  it('should handle updateItem', () => {
    const stateWithLead = { ...initialState, items: [mockLead], totalCount: 1 };
    const updatedLead = { ...mockLead, status: 'contacted' };

    const actual = leadReducer(stateWithLead, updateItem(updatedLead));

    expect(actual.items[0].status).toBe('contacted');
  });

  it('should handle removeItem', () => {
    const stateWithLead = { ...initialState, items: [mockLead], totalCount: 1 };

    const actual = leadReducer(stateWithLead, removeItem(mockLead.id));

    expect(actual.items).toHaveLength(0);
    expect(actual.totalCount).toBe(0);
  });

  it('should handle setLoading', () => {
    const actual = leadReducer(initialState, setLoading(true));

    expect(actual.isLoading).toBe(true);
    expect(actual.error).toBeNull();
  });

  it('should handle setError', () => {
    const errorMessage = 'Test error';
    const actual = leadReducer(initialState, setError(errorMessage));

    expect(actual.error).toBe(errorMessage);
    expect(actual.isLoading).toBe(false);
  });

  it('should handle clear', () => {
    const stateWithData = {
      ...initialState,
      items: [mockLead],
      lastSync: Date.now(),
      error: 'Some error',
      totalCount: 1,
    };

    const actual = leadReducer(stateWithData, clear());

    expect(actual).toEqual(initialState);
  });

  it('should handle rehydrate', () => {
    const rehydrateData = {
      items: [mockLead],
      lastSync: Date.now(),
    };

    const actual = leadReducer(initialState, rehydrate(rehydrateData));

    expect(actual.items).toEqual(rehydrateData.items);
    expect(actual.lastSync).toBe(rehydrateData.lastSync);
    expect(actual.totalCount).toBe(1);
    expect(actual.isLoading).toBe(false);
    expect(actual.error).toBeNull();
  });
});
