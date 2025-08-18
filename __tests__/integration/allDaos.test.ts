/**
 * All DAOs Integration Test
 */

// Mock SQLCipher BEFORE importing database modules
jest.mock('react-native-sqlcipher-storage', () => ({
  __esModule: true,
  default: {
    openDatabase: jest.fn(() => ({
      transaction: jest.fn((callback, errorCallback, successCallback) => {
        const mockTx = {
          executeSql: jest.fn((sql, params, success) => {
            setTimeout(() => {
              let mockResult = {};

              if (sql.includes('PRAGMA user_version')) {
                mockResult = { rows: { item: () => ({ user_version: 1 }) } };
              } else if (sql.includes('COUNT(*)')) {
                // Mock count query response
                mockResult = {
                  rows: {
                    length: 1,
                    item: (index: number) => ({ count: 5 }),
                  },
                };
              } else if (sql.includes('SELECT')) {
                // Mock select query response
                mockResult = {
                  rows: {
                    length: 0,
                    item: (index: number) => null,
                  },
                };
              } else {
                // Mock insert/update/delete response
                mockResult = { rowsAffected: 1 };
              }

              if (success) {
                success(mockTx, mockResult);
              }
            }, 0);
          }),
        };
        callback(mockTx);

        // Call success callback to resolve transaction
        if (successCallback) {
          setTimeout(successCallback, 0);
        }
      }),
    })),
  },
}));

// Mock keychain BEFORE importing database modules
jest.mock('../../src/utils/secureStorage/SQLiteKeyHelper', () => ({
  getDbKey: jest.fn().mockResolvedValue('a'.repeat(128)),
}));

// NOW import the modules after mocks are set up
import { openEncryptedDb } from '../../src/database/database';
import {
  getLeadDao,
  getCustomerDao,
  getQuotationDao,
  getSyncDao,
} from '../../src/database/dao';

describe('All DAOs Integration', () => {
  it('should create all DAO instances with database', async () => {
    const db = await openEncryptedDb();

    const leadDao = getLeadDao(db);
    const customerDao = getCustomerDao(db);
    const quotationDao = getQuotationDao(db);
    const syncDao = getSyncDao(db);

    expect(leadDao).toBeDefined();
    expect(customerDao).toBeDefined();
    expect(quotationDao).toBeDefined();
    expect(syncDao).toBeDefined();

    // Test that all have required methods
    expect(typeof leadDao.findAll).toBe('function');
    expect(typeof customerDao.create).toBe('function');
    expect(typeof quotationDao.updateStatus).toBe('function');
    expect(typeof syncDao.markSyncCompleted).toBe('function');
  });

  it('should allow DAO method calls', async () => {
    const db = await openEncryptedDb();
    const leadDao = getLeadDao(db);

    // Test that methods can be called without errors
    const count = await leadDao.count();
    expect(typeof count).toBe('number');
    expect(count).toBe(5);

    const leads = await leadDao.findAll();
    expect(Array.isArray(leads)).toBe(true);
  }, 15000); // Increase timeout to 15 seconds
});
