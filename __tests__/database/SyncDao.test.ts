/**
 * Sync DAO Tests
 */
import {
  SyncDao,
  getInstance,
  resetInstance,
} from '../../src/database/dao/SyncDao';

// Mock database setup
const mockExecuteSql = jest.fn();
const mockTransaction = jest.fn();
const mockDb = { transaction: mockTransaction };

describe('SyncDao', () => {
  let syncDao: SyncDao;

  beforeEach(() => {
    jest.clearAllMocks();
    resetInstance();
    syncDao = getInstance(mockDb as any);

    // Setup successful transaction mock
    mockTransaction.mockImplementation(
      (callback, errorCallback, successCallback) => {
        const mockTx = { executeSql: mockExecuteSql };

        mockExecuteSql.mockImplementation((sql, params, success, error) => {
          setTimeout(() => {
            if (sql.includes('SELECT')) {
              const mockRows = {
                length: 1,
                item: () => ({
                  table_name: 'leads',
                  last_sync_timestamp: '2023-01-01T00:00:00.000Z',
                  sync_status: 'completed',
                  record_count: 100,
                }),
              };
              success && success(mockTx, { rows: mockRows });
            } else {
              success && success(mockTx, { rowsAffected: 1 });
            }
          }, 0);
        });

        callback(mockTx);
        if (successCallback) setTimeout(successCallback, 0);
      }
    );
  });

  describe('Sync Metadata Operations', () => {
    it('should get sync metadata by table name', async () => {
      const metadata = await syncDao.getByTableName('leads');

      expect(metadata).toBeDefined();
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM sync_metadata WHERE table_name = ?',
        ['leads'],
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should mark sync as started', async () => {
      await syncDao.markSyncStarted('leads');

      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should mark sync as completed', async () => {
      await syncDao.markSyncCompleted('leads', 50, 2);

      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should mark sync as failed', async () => {
      await syncDao.markSyncFailed('leads', 'Network error');

      expect(mockTransaction).toHaveBeenCalled();
    });
  });

  describe('Sync Status Checks', () => {
    it('should check if sync is needed', async () => {
      const isNeeded = await syncDao.isSyncNeeded('leads', 60);

      expect(typeof isNeeded).toBe('boolean');
    });

    it('should get tables needing sync', async () => {
      const tables = await syncDao.getTablesNeedingSync(30);

      expect(Array.isArray(tables)).toBe(true);
    });
  });
});
