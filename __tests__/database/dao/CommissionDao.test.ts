/**
 * CommissionDao Unit Tests
 * Testing Commission data access operations
 */
import { CommissionDao } from '../../../src/database/dao/CommissionDao';
import type {
  Commission,
  CommissionFilters,
  CommissionKPIStats,
} from '../../../src/database/models/Commission';

// Mock SQLite Database
const mockDb = {
  executeSql: jest.fn(),
  transaction: jest.fn(),
};

describe('CommissionDao', () => {
  let commissionDao: CommissionDao;
  const mockCommissions: Commission[] = [
    {
      id: 'COMM-001',
      cp_id: 'CP-001',
      lead_id: 'LEAD-001',
      amount: 25000,
      status: 'approved',
      created_at: '2024-01-15T10:30:00.000Z',
      updated_at: '2024-01-15T10:30:00.000Z',
      sync_status: 'synced',
      local_changes: '{}',
    },
    {
      id: 'COMM-002',
      cp_id: 'CP-001',
      lead_id: 'LEAD-002',
      amount: 18000,
      status: 'pending',
      created_at: '2024-01-20T14:15:00.000Z',
      updated_at: '2024-01-20T14:15:00.000Z',
      sync_status: 'synced',
      local_changes: '{}',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    CommissionDao.resetInstance();
    commissionDao = CommissionDao.getInstance(mockDb as any);
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = CommissionDao.getInstance(mockDb as any);
      const instance2 = CommissionDao.getInstance(mockDb as any);
      expect(instance1).toBe(instance2);
    });

    it('should reset instance correctly', () => {
      const instance1 = CommissionDao.getInstance(mockDb as any);
      CommissionDao.resetInstance();
      const instance2 = CommissionDao.getInstance(mockDb as any);
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('findByDateRange', () => {
    it('should find commissions by date range successfully', async () => {
      const mockResult = {
        rows: {
          length: 2,
          item: (index: number) => mockCommissions[index],
        },
      };

      mockDb.executeSql.mockImplementation((query, params, successCallback) => {
        successCallback(mockResult);
      });

      const startDate = '2024-01-01T00:00:00.000Z';
      const endDate = '2024-01-31T23:59:59.999Z';
      const result = await commissionDao.findByDateRange(startDate, endDate);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('COMM-001');
      expect(result[1].id).toBe('COMM-002');
      expect(mockDb.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE created_at >= ? AND created_at <= ?'),
        [startDate, endDate],
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should handle database errors properly', async () => {
      const error = new Error('Database error');
      mockDb.executeSql.mockImplementation(
        (query, params, successCallback, errorCallback) => {
          errorCallback(error);
        }
      );

      await expect(
        commissionDao.findByDateRange('2024-01-01', '2024-01-31')
      ).rejects.toThrow('Database error');
    });
  });

  describe('findByStatus', () => {
    it('should find commissions by status successfully', async () => {
      const mockResult = {
        rows: {
          length: 1,
          item: () => mockCommissions[0],
        },
      };

      mockDb.executeSql.mockImplementation((query, params, successCallback) => {
        successCallback(mockResult);
      });

      const result = await commissionDao.findByStatus('approved');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('approved');
      expect(mockDb.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = ?'),
        ['approved'],
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('getKPIStats', () => {
    it('should calculate KPI stats correctly', async () => {
      const mockResult = {
        rows: {
          item: () => ({
            total_count: 10,
            total_commission: 250000,
            paid_commission: 100000,
            pending_commission: 75000,
            approved_commission: 75000,
            paid_count: 4,
            pending_count: 3,
            approved_count: 3,
          }),
        },
      };

      mockDb.executeSql.mockImplementation((query, params, successCallback) => {
        successCallback(mockResult);
      });

      const result = await commissionDao.getKPIStats();

      expect(result).toEqual({
        totalCommission: 250000,
        paidCommission: 100000,
        pendingCommission: 75000,
        approvedCommission: 75000,
        totalCount: 10,
        paidCount: 4,
        pendingCount: 3,
        approvedCount: 3,
      });
    });

    it('should apply filters correctly', async () => {
      const mockResult = {
        rows: {
          item: () => ({
            total_count: 5,
            total_commission: 125000,
            paid_commission: 50000,
            pending_commission: 75000,
            approved_commission: 0,
            paid_count: 2,
            pending_count: 3,
            approved_count: 0,
          }),
        },
      };

      mockDb.executeSql.mockImplementation((query, params, successCallback) => {
        successCallback(mockResult);
      });

      const filters: CommissionFilters = {
        dateRange: {
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-01-31T23:59:59.999Z',
        },
        status: 'pending',
        cp_id: 'CP-001',
      };

      const result = await commissionDao.getKPIStats(filters);

      expect(mockDb.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('AND created_at >= ? AND created_at <= ?'),
        expect.arrayContaining([
          filters.dateRange.startDate,
          filters.dateRange.endDate,
          'pending',
          'CP-001',
        ]),
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('upsertMany', () => {
    it('should upsert commissions successfully', async () => {
      mockDb.executeSql
        .mockImplementationOnce((query, params, successCallback) => {
          // BEGIN TRANSACTION
          successCallback();
        })
        .mockImplementationOnce((query, params, successCallback) => {
          // INSERT OR REPLACE (first commission)
          successCallback();
        })
        .mockImplementationOnce((query, params, successCallback) => {
          // INSERT OR REPLACE (second commission)
          successCallback();
        })
        .mockImplementationOnce((query, params, successCallback) => {
          // COMMIT
          successCallback();
        });

      await commissionDao.upsertMany(mockCommissions);

      expect(mockDb.executeSql).toHaveBeenCalledTimes(4); // BEGIN + 2 INSERTs + COMMIT
      expect(mockDb.executeSql).toHaveBeenNthCalledWith(
        1,
        'BEGIN TRANSACTION;',
        [],
        expect.any(Function),
        expect.any(Function)
      );
      expect(mockDb.executeSql).toHaveBeenNthCalledWith(
        4,
        'COMMIT;',
        [],
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should handle empty array gracefully', async () => {
      await commissionDao.upsertMany([]);
      expect(mockDb.executeSql).not.toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      const error = new Error('Insert failed');
      mockDb.executeSql
        .mockImplementationOnce((query, params, successCallback) => {
          // BEGIN TRANSACTION
          successCallback();
        })
        .mockImplementationOnce(
          (query, params, successCallback, errorCallback) => {
            // INSERT OR REPLACE (fails)
            errorCallback(error);
          }
        )
        .mockImplementationOnce((query, params, successCallback) => {
          // ROLLBACK
          successCallback();
        });

      await expect(commissionDao.upsertMany(mockCommissions)).rejects.toThrow(
        'Insert failed'
      );
      expect(mockDb.executeSql).toHaveBeenCalledWith(
        'ROLLBACK;',
        [],
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('findAll', () => {
    it('should find all commissions with pagination', async () => {
      const mockResult = {
        rows: {
          length: 2,
          item: (index: number) => mockCommissions[index],
        },
      };

      mockDb.executeSql.mockImplementation((query, params, successCallback) => {
        successCallback(mockResult);
      });

      const result = await commissionDao.findAll(10, 0);

      expect(result).toHaveLength(2);
      expect(mockDb.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ? OFFSET ?'),
        [10, 0],
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('findById', () => {
    it('should find commission by ID successfully', async () => {
      const mockResult = {
        rows: {
          length: 1,
          item: () => mockCommissions[0],
        },
      };

      mockDb.executeSql.mockImplementation((query, params, successCallback) => {
        successCallback(mockResult);
      });

      const result = await commissionDao.findById('COMM-001');

      expect(result).toEqual(mockCommissions[0]);
      expect(mockDb.executeSql).toHaveBeenCalledWith(
        'SELECT * FROM commissions WHERE id = ? LIMIT 1;',
        ['COMM-001'],
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should return null when commission not found', async () => {
      const mockResult = {
        rows: { length: 0 },
      };

      mockDb.executeSql.mockImplementation((query, params, successCallback) => {
        successCallback(mockResult);
      });

      const result = await commissionDao.findById('NON-EXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('getCount', () => {
    it('should return commission count', async () => {
      const mockResult = {
        rows: {
          item: () => ({ count: 42 }),
        },
      };

      mockDb.executeSql.mockImplementation((query, params, successCallback) => {
        successCallback(mockResult);
      });

      const result = await commissionDao.getCount();

      expect(result).toBe(42);
      expect(mockDb.executeSql).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM commissions;',
        [],
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('clearAll', () => {
    it('should clear all commissions', async () => {
      const mockResult = { rowsAffected: 5 };

      mockDb.executeSql.mockImplementation((query, params, successCallback) => {
        successCallback(mockResult);
      });

      const result = await commissionDao.clearAll();

      expect(result).toBe(5);
      expect(mockDb.executeSql).toHaveBeenCalledWith(
        'DELETE FROM commissions;',
        [],
        expect.any(Function),
        expect.any(Function)
      );
    });
  });
});
