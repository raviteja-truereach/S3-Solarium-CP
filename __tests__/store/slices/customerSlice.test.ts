/**
 * Customer Slice Tests
 */
import customerReducer, {
  setItems,
  addItem,
  updateKycStatus,
  clear,
  rehydrate,
  CustomerState,
} from '../../../src/store/slices/customerSlice';
import type { Customer } from '../../../src/database/models/Customer';

describe('customerSlice', () => {
  const initialState: CustomerState = {
    items: [],
    lastSync: null,
    isLoading: false,
    error: null,
    totalCount: 0,
    searchTerm: '',
    filters: {},
  };

  const mockCustomer: Customer = {
    id: 'customer-1',
    name: 'John Doe',
    phone: '1234567890',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
    kyc_status: 'pending',
    sync_status: 'synced',
    local_changes: '{}',
  };

  it('should return initial state', () => {
    expect(customerReducer(undefined, { type: 'unknown' })).toEqual(
      initialState
    );
  });

  it('should handle setItems', () => {
    const customers = [mockCustomer];
    const actual = customerReducer(initialState, setItems(customers));

    expect(actual.items).toEqual(customers);
    expect(actual.totalCount).toBe(1);
  });

  it('should handle addItem', () => {
    const actual = customerReducer(initialState, addItem(mockCustomer));

    expect(actual.items).toHaveLength(1);
    expect(actual.items[0]).toEqual(mockCustomer);
  });

  it('should handle updateKycStatus', () => {
    const stateWithCustomer = { ...initialState, items: [mockCustomer] };

    const actual = customerReducer(
      stateWithCustomer,
      updateKycStatus({ customerIds: [mockCustomer.id], status: 'approved' })
    );

    expect(actual.items[0].kyc_status).toBe('approved');
    expect(actual.items[0].sync_status).toBe('pending');
  });

  it('should handle rehydrate', () => {
    const rehydrateData = {
      items: [mockCustomer],
      lastSync: Date.now(),
    };

    const actual = customerReducer(initialState, rehydrate(rehydrateData));

    expect(actual.items).toEqual(rehydrateData.items);
    expect(actual.lastSync).toBe(rehydrateData.lastSync);
  });
});
