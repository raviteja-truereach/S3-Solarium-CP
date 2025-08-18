/**
 * SQLite Transform Tests
 */

// Mock database modules BEFORE importing transform
jest.mock('../../../src/database/database', () => ({
  openEncryptedDb: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../../src/database/dao', () => ({
  getLeadDao: jest.fn(),
  getCustomerDao: jest.fn(),
  getSyncDao: jest.fn(),
}));

// Now import the transform after mocks are set up
import {
  createSQLiteTransform,
  preloadCacheData,
} from '../../../src/store/transforms/sqliteTransform';

const mockLeads = [
  { id: 'lead-1', status: 'new', sync_status: 'synced', local_changes: '{}' },
];

const mockCustomers = [
  {
    id: 'customer-1',
    name: 'John',
    phone: '123',
    kyc_status: 'pending',
    sync_status: 'synced',
    local_changes: '{}',
  },
];

describe('SQLite Transform', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup DAO mocks
    const {
      getLeadDao,
      getCustomerDao,
      getSyncDao,
    } = require('../../../src/database/dao');

    getLeadDao.mockReturnValue({
      findAll: jest.fn().mockResolvedValue(mockLeads),
    });

    getCustomerDao.mockReturnValue({
      findAll: jest.fn().mockResolvedValue(mockCustomers),
    });

    getSyncDao.mockReturnValue({
      getByTableName: jest.fn().mockResolvedValue({
        last_sync_timestamp: '2023-01-01T00:00:00.000Z',
      }),
    });
  });

  describe('Transform Structure', () => {
    it('should create transform with correct structure', () => {
      const transform = createSQLiteTransform();

      expect(transform).toHaveProperty('name', 'sqliteTransform');
      expect(transform).toHaveProperty('in');
      expect(transform).toHaveProperty('out');
      expect(typeof transform.in).toBe('function');
      expect(typeof transform.out).toBe('function');
    });
  });

  describe('Inbound Transform', () => {
    it('should filter large arrays for leads', () => {
      const transform = createSQLiteTransform();

      const leadState = {
        items: mockLeads,
        lastSync: Date.now(),
        filters: { status: 'new' },
      };

      const result = transform.in(leadState, 'leads');

      expect(result).not.toHaveProperty('items');
      expect(result).toHaveProperty('lastSync');
      expect(result).toHaveProperty('filters');
    });

    it('should filter large arrays for customers', () => {
      const transform = createSQLiteTransform();

      const customerState = {
        items: mockCustomers,
        lastSync: Date.now(),
        searchTerm: 'John',
        filters: { kycStatus: 'pending' },
      };

      const result = transform.in(customerState, 'customers');

      expect(result).not.toHaveProperty('items');
      expect(result).toHaveProperty('lastSync');
      expect(result).toHaveProperty('searchTerm');
      expect(result).toHaveProperty('filters');
    });

    it('should pass through other slices unchanged', () => {
      const transform = createSQLiteTransform();

      const authState = { token: 'abc123', user: {} };
      const result = transform.in(authState, 'auth');

      expect(result).toEqual(authState);
    });
  });

  describe('Outbound Transform', () => {
    it('should load data for leads', async () => {
      const transform = createSQLiteTransform();

      const persistedState = { lastSync: null, filters: {} };
      const result = await transform.out(persistedState, 'leads');

      expect(result.items).toEqual(mockLeads);
      expect(result.totalCount).toBe(mockLeads.length);
      expect(result.isLoading).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should load data for customers', async () => {
      const transform = createSQLiteTransform();

      const persistedState = { lastSync: null, searchTerm: '', filters: {} };
      const result = await transform.out(persistedState, 'customers');

      expect(result.items).toEqual(mockCustomers);
      expect(result.totalCount).toBe(mockCustomers.length);
      expect(result.isLoading).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should handle transform errors gracefully', async () => {
      const { getLeadDao } = require('../../../src/database/dao');
      getLeadDao.mockReturnValue({
        findAll: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      const transform = createSQLiteTransform();
      const persistedState = { items: [], lastSync: null, filters: {} };

      const result = await transform.out(persistedState, 'leads');

      // When there's an error, the transform should still return a valid state structure
      expect(result).toEqual({
        ...persistedState,
        items: [], // Empty array due to error
        lastSync: null,
        totalCount: 0,
        isLoading: false,
        error: null,
      });
    });

    it('should pass through other slices unchanged', async () => {
      const transform = createSQLiteTransform();

      const authState = { token: 'abc123', user: {} };
      const result = await transform.out(authState, 'auth');

      expect(result).toEqual(authState);
    });
  });

  describe('Preload Cache Data', () => {
    it('should preload leads and customers', async () => {
      const result = await preloadCacheData();

      expect(result.leads.items).toEqual(mockLeads);
      expect(result.customers.items).toEqual(mockCustomers);
    });

    it('should handle preload errors', async () => {
      const { openEncryptedDb } = require('../../../src/database/database');
      openEncryptedDb.mockRejectedValue(new Error('DB error'));

      const result = await preloadCacheData();

      expect(result.leads.items).toEqual([]);
      expect(result.customers.items).toEqual([]);
    });
  });
});
