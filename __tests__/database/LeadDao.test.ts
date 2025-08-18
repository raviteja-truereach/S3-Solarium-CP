/**
 * Lead DAO Tests
 * Tests Lead database operations
 */
import {
  LeadDao,
  getInstance,
  resetInstance,
} from '../../src/database/dao/LeadDao';
import type { Lead, CreateLeadRequest } from '../../src/database/models/Lead';

// Mock database
const mockExecuteSql = jest.fn();
const mockTransaction = jest.fn();
const mockDb = {
  transaction: mockTransaction,
};

describe('LeadDao', () => {
  let leadDao: LeadDao;

  beforeEach(() => {
    jest.clearAllMocks();
    resetInstance();
    leadDao = getInstance(mockDb as any);

    // Setup default successful transaction mock
    mockTransaction.mockImplementation(
      (callback, errorCallback, successCallback) => {
        const mockTx = {
          executeSql: mockExecuteSql,
        };

        mockExecuteSql.mockImplementation((sql, params, success, error) => {
          // Mock successful execution
          setTimeout(() => {
            if (sql.includes('SELECT') && sql.includes('COUNT(*)')) {
              success &&
                success(mockTx, { rows: { item: () => ({ count: 5 }) } });
            } else if (sql.includes('SELECT')) {
              const mockRows = {
                length: 1,
                item: () => ({
                  id: 'test-lead-1',
                  status: 'new',
                  priority: 'high',
                  created_at: '2023-01-01T00:00:00.000Z',
                  updated_at: '2023-01-01T00:00:00.000Z',
                  sync_status: 'synced',
                  local_changes: '{}',
                }),
              };
              success && success(mockTx, { rows: mockRows });
            } else {
              success && success(mockTx, { rowsAffected: 1 });
            }
          }, 0);
        });

        callback(mockTx);
        if (successCallback) {
          setTimeout(successCallback, 0);
        }
      }
    );
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const dao1 = getInstance(mockDb as any);
      const dao2 = getInstance(mockDb as any);

      expect(dao1).toBe(dao2);
    });

    it('should create new instance after reset', () => {
      const dao1 = getInstance(mockDb as any);
      resetInstance();
      const dao2 = getInstance(mockDb as any);

      expect(dao1).not.toBe(dao2);
    });
  });

  describe('CRUD Operations', () => {
    it('should find all leads', async () => {
      const leads = await leadDao.findAll();

      expect(Array.isArray(leads)).toBe(true);
      expect(mockTransaction).toHaveBeenCalled();
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM leads',
        [],
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should find lead by ID', async () => {
      const lead = await leadDao.findById('test-lead-1');

      expect(lead).toBeDefined();
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM leads WHERE id = ? LIMIT 1',
        ['test-lead-1'],
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should create new lead', async () => {
      const createRequest: CreateLeadRequest = {
        status: 'new',
        priority: 'high',
        phone: '1234567890',
      };

      const leadId = await leadDao.create(createRequest);

      expect(typeof leadId).toBe('string');
      expect(leadId.length).toBeGreaterThan(0);
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should upsert multiple leads', async () => {
      const leads: Partial<Lead>[] = [
        { id: '1', status: 'new', priority: 'high' },
        { id: '2', status: 'contacted', priority: 'medium' },
      ];

      await leadDao.upsertAll(leads);

      expect(mockTransaction).toHaveBeenCalled();
      expect(mockExecuteSql).toHaveBeenCalledTimes(2); // One call per lead
    });

    it('should count leads', async () => {
      const count = await leadDao.count();

      expect(count).toBe(5);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM leads',
        [],
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should delete all leads', async () => {
      const deletedCount = await leadDao.deleteAll();

      expect(deletedCount).toBe(1);
      expect(mockExecuteSql).toHaveBeenCalledWith(
        'DELETE FROM leads',
        [],
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('Lead-specific methods', () => {
    it('should find leads by status', async () => {
      const leads = await leadDao.findByStatus('new');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM leads WHERE status = ?',
        ['new'],
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should find leads by customer ID', async () => {
      await leadDao.findByCustomerId('customer-1');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM leads WHERE customer_id = ?',
        ['customer-1'],
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should find pending sync leads', async () => {
      await leadDao.findPendingSync();

      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM leads WHERE sync_status = ?',
        ['pending'],
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle SQL errors', async () => {
      // Mock SQL execution to trigger error
      mockTransaction.mockImplementation((callback, errorCallback, successCallback) => {
        const mockTx = {
          executeSql: jest.fn((sql, params, success, error) => {
            // Simulate SQL error
            setTimeout(() => {
              if (error) {
                error(mockTx, { message: 'SQL syntax error' });
              }
            }, 0);
          }),
        };
        
        callback(mockTx);
      });

      await expect(leadDao.findAll()).rejects.toThrow('Database query failed');
    });

    it('should handle transaction errors', async () => {
      mockTransaction.mockImplementation((callback, errorCallback) => {
        setTimeout(() => {
          if (errorCallback) {
            errorCallback(new Error('Transaction failed'));
          }
        }, 0);
      });

      await expect(leadDao.upsertAll([{ status: 'new' }])).rejects.toThrow('Transaction failed');
    });

    it('should handle record not found gracefully', async () => {
      // Mock empty result
      mockTransaction.mockImplementation((callback, errorCallback, successCallback) => {
        const mockTx = {
          executeSql: jest.fn((sql, params, success, error) => {
            setTimeout(() => {
              if (success) {
                success(mockTx, { rows: { length: 0, item: () => null } });
              }
            }, 0);
          }),
        };
        
        callback(mockTx);
      });

      const result = await leadDao.findById('non-existent-id');
      expect(result).toBeUndefined();
    });
  });
});
