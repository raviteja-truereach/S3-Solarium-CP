/**
 * Database Integration Tests
 * Tests database connection, schema creation, and migrations
 */
import {
  openEncryptedDb,
  closeDatabase,
  resetDbInstance,
} from '../../src/database/database';
import {
  getCurrentVersion,
  runMigrations,
} from '../../src/database/migrations';
import { CURRENT_SCHEMA_VERSION } from '../../src/database/schema';

// Mock the SQLite key helper
jest.mock('../../src/utils/secureStorage/SQLiteKeyHelper', () => ({
  getDbKey: jest.fn().mockResolvedValue('a'.repeat(128)),
}));

// Create a simple mock database that resolves promises correctly
const mockExecuteSql = jest.fn();
const mockTransaction = jest.fn();

jest.mock('react-native-sqlcipher-storage', () => ({
  __esModule: true,
  default: {
    openDatabase: jest.fn(() => ({
      transaction: mockTransaction,
    })),
  },
}));

describe('Database Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbInstance();

    // Setup mock to resolve transactions immediately
    mockTransaction.mockImplementation(
      (transactionCallback, errorCallback, successCallback) => {
        const mockTx = {
          executeSql: mockExecuteSql,
        };

        mockExecuteSql.mockImplementation((sql, params, success, error) => {
          // Mock responses for different SQL types
          if (sql.includes('PRAGMA user_version') && !sql.includes('=')) {
            success &&
              success(mockTx, { rows: { item: () => ({ user_version: 0 }) } });
          } else if (sql.includes('sqlite_master')) {
            success && success(mockTx, { rows: { length: 1 } });
          } else {
            success && success(mockTx, {});
          }
        });

        try {
          transactionCallback(mockTx);
          // Call success callback to resolve transaction promise
          if (successCallback) {
            setTimeout(successCallback, 0);
          }
        } catch (error) {
          if (errorCallback) {
            setTimeout(() => errorCallback(error), 0);
          }
        }
      }
    );
  });

  afterEach(async () => {
    await closeDatabase();
  });

  describe('openEncryptedDb', () => {
    it('should open database with encryption key', async () => {
      const db = await openEncryptedDb();

      expect(db).toBeDefined();
      expect(typeof db.transaction).toBe('function');
    });

    it('should return same instance on multiple calls', async () => {
      const db1 = await openEncryptedDb();
      const db2 = await openEncryptedDb();

      expect(db1).toBe(db2);
    });

    it('should configure database settings', async () => {
      const db = await openEncryptedDb();

      expect(db.transaction).toBeDefined();
      expect(mockTransaction).toHaveBeenCalled();
    });
  });

  describe('Migration System', () => {
    it('should get current database version', async () => {
      const db = await openEncryptedDb();
      const version = await getCurrentVersion(db);

      expect(version).toBe(0);
    });

    it('should run migrations to target version', async () => {
      const db = await openEncryptedDb();

      await runMigrations(db, CURRENT_SCHEMA_VERSION);

      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should handle same version gracefully', async () => {
      const db = await openEncryptedDb();

      // Mock current version to be same as target
      mockExecuteSql.mockImplementation((sql, params, success) => {
        if (sql.includes('PRAGMA user_version') && !sql.includes('=')) {
          success &&
            success(null, {
              rows: { item: () => ({ user_version: CURRENT_SCHEMA_VERSION }) },
            });
        } else {
          success && success(null, {});
        }
      });

      await runMigrations(db, CURRENT_SCHEMA_VERSION);

      // Should complete without error
      expect(true).toBe(true);
    });
  });

  describe('Database Cleanup', () => {
    it('should close database connection', async () => {
      await openEncryptedDb();
      await closeDatabase();

      // Should complete without error
      expect(true).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database open errors', async () => {
      const {
        getDbKey,
      } = require('../../src/utils/secureStorage/SQLiteKeyHelper');
      getDbKey.mockRejectedValueOnce(new Error('Keychain error'));

      await expect(openEncryptedDb()).rejects.toThrow(
        'Database initialization failed'
      );
    });

    describe('Error Handling', () => {
      it('should handle database open errors', async () => {
        const {
          getDbKey,
        } = require('../../src/utils/secureStorage/SQLiteKeyHelper');
        getDbKey.mockRejectedValueOnce(new Error('Keychain error'));

        await expect(openEncryptedDb()).rejects.toThrow(
          'Database initialization failed'
        );
      });

      it('should handle invalid migration version', async () => {
        const db = await openEncryptedDb();

        // Test with invalid version - should handle gracefully
        await expect(runMigrations(db, -1)).resolves.toBeUndefined();
      });
    });
  });
});
