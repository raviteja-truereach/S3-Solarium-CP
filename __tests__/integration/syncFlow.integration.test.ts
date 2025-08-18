/**
 * SyncManager Integration Tests
 * End-to-end testing with real database operations
 */
import { SyncManager } from '../../src/sync/SyncManager';
import { openEncryptedDb, resetDbInstance } from '../../src/database/database';
import type { SQLiteDatabase } from '../../src/database/database';

// Create test database helper
const createTestDatabase = async (): Promise<SQLiteDatabase> => {
  // Reset any existing instance
  resetDbInstance();

  // Open new database (will be in-memory for tests)
  const db = await openEncryptedDb();

  // Ensure tables exist by running migrations
  const { runMigrations } = await import('../../src/database/migrations');
  const { CURRENT_SCHEMA_VERSION } = await import('../../src/database/schema');
  await runMigrations(db, CURRENT_SCHEMA_VERSION);

  return db;
};

// Mock network as online
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    })
  ),
}));

// Mock config
jest.mock('../../src/config/Config', () => ({
  appConfig: { apiUrl: 'https://api.test.com' },
}));

jest.mock('../../src/config/Network', () => ({
  API_TIMEOUT_MS: 5000,
}));

describe('SyncManager Integration', () => {
  let syncManager: SyncManager;
  let testDb: SQLiteDatabase;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(async () => {
    // Create isolated test database
    testDb = await createTestDatabase();

    // Reset sync manager
    SyncManager.resetInstance();
    syncManager = SyncManager.getInstance();

    // Mock fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Mock store with valid token
    jest.doMock('../../src/store', () => ({
      store: {
        getState: () => ({ auth: { token: 'valid_token' } }),
        dispatch: jest.fn(),
      },
    }));

    // Mock database provider to return our test db
    jest.doMock('../../src/database/DatabaseProvider', () => ({
      useDatabase: () => ({
        database: testDb,
        isReady: true,
      }),
    }));
  });

  afterEach(async () => {
    SyncManager.resetInstance();
    resetDbInstance();
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('Happy Path - Full Sync Flow', () => {
    it('should complete full sync cycle successfully', async () => {
      // Mock API responses
      const mockLeads = [
        {
          id: '1',
          status: 'new',
          priority: 'high',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          sync_status: 'synced',
          local_changes: '{}',
        },
      ];

      const mockCustomers = [
        {
          id: 'cust1',
          name: 'John Doe',
          phone: '+1234567890',
          kyc_status: 'approved',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          sync_status: 'synced',
          local_changes: '{}',
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockLeads }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockCustomers }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] }),
        } as Response);

      // Execute sync
      const result = await syncManager.manualSync('manual');

      // Verify sync result
      expect(result.success).toBe(true);
      expect(result.recordCounts).toEqual({
        leads: 1,
        customers: 1,
        quotations: 0,
      });

      // Verify database persistence
      const { getInstance: getLeadDao } = await import(
        '../../src/database/dao/LeadDao'
      );
      const { getInstance: getCustomerDao } = await import(
        '../../src/database/dao/CustomerDao'
      );
      const { getInstance: getSyncDao } = await import(
        '../../src/database/dao/SyncDao'
      );

      const leadDao = getLeadDao(testDb);
      const customerDao = getCustomerDao(testDb);
      const syncDao = getSyncDao(testDb);

      const [leadCount, customerCount, leadSync, customerSync] =
        await Promise.all([
          leadDao.count(),
          customerDao.count(),
          syncDao.getByTableName('leads'),
          syncDao.getByTableName('customers'),
        ]);

      expect(leadCount).toBe(1);
      expect(customerCount).toBe(1);
      expect(leadSync?.sync_status).toBe('completed');
      expect(customerSync?.sync_status).toBe('completed');
    });
  });

  describe('Empty Server Array Safeguard', () => {
    it('should not delete existing data when server returns empty arrays', async () => {
      // First, populate database with existing data
      const { getInstance: getLeadDao } = await import(
        '../../src/database/dao/LeadDao'
      );
      const leadDao = getLeadDao(testDb);

      await leadDao.create({
        status: 'existing',
        priority: 'medium',
      });

      const beforeCount = await leadDao.count();
      expect(beforeCount).toBe(1);

      // Mock empty server responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] }), // Empty leads
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: [
                {
                  id: 'cust1',
                  name: 'New Customer',
                  phone: '+1111111111',
                  kyc_status: 'pending',
                  created_at: '2024-01-01T00:00:00Z',
                  updated_at: '2024-01-01T00:00:00Z',
                  sync_status: 'synced',
                  local_changes: '{}',
                },
              ],
            }), // Non-empty customers
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] }), // Empty quotations
        } as Response);

      const result = await syncManager.manualSync('manual');

      expect(result.success).toBe(true);
      expect(result.recordCounts).toEqual({
        leads: 0, // Not updated due to empty response
        customers: 1, // Updated with server data
        quotations: 0, // Not updated due to empty response
      });

      // Verify leads data was preserved
      const afterLeadCount = await leadDao.count();
      expect(afterLeadCount).toBe(1); // Should still have existing lead

      // Verify customers data was updated
      const { getInstance: getCustomerDao } = await import(
        '../../src/database/dao/CustomerDao'
      );
      const customerDao = getCustomerDao(testDb);
      const customerCount = await customerDao.count();
      expect(customerCount).toBe(1); // Should have new customer
    });
  });

  describe('Transaction Rollback on Error', () => {
    it('should rollback all changes when persistence fails', async () => {
      // First, populate with existing data
      const { getInstance: getLeadDao } = await import(
        '../../src/database/dao/LeadDao'
      );
      const leadDao = getLeadDao(testDb);

      await leadDao.create({
        status: 'existing',
        priority: 'low',
      });

      const beforeCount = await leadDao.count();
      expect(beforeCount).toBe(1);

      // Mock responses with invalid data that will cause persistence errors
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: [{ invalid: 'lead_data_missing_required_fields' }],
            }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] }),
        } as Response);

      const result = await syncManager.manualSync('manual');

      // Sync should fail due to persistence error
      expect(result.success).toBe(false);
      expect(result.error).toContain('persistence failed');

      // Verify original data is unchanged (rollback occurred)
      const afterCount = await leadDao.count();
      expect(afterCount).toBe(1); // Original data preserved
    });
  });

  describe('Event Emission During Integration', () => {
    it('should emit all events in correct order during full sync', async () => {
      const events: string[] = [];

      syncManager.onSyncEvent('syncStarted', () => events.push('started'));
      syncManager.onSyncEvent('syncFinished', () => events.push('finished'));
      syncManager.onSyncEvent('syncFailed', () => events.push('failed'));

      // Mock successful responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      } as Response);

      await syncManager.manualSync('manual');

      expect(events).toEqual(['started', 'finished']);
    });
  });
});
