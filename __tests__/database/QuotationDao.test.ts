/**
 * Quotation DAO Tests
 */
import {
  QuotationDao,
  getInstance,
  resetInstance,
} from '../../src/database/dao/QuotationDao';
import type { CreateQuotationRequest } from '../../src/database/models/Quotation';

// Mock database setup (same as LeadDao)
const mockExecuteSql = jest.fn();
const mockTransaction = jest.fn();
const mockDb = { transaction: mockTransaction };

describe('QuotationDao', () => {
  let quotationDao: QuotationDao;

  beforeEach(() => {
    jest.clearAllMocks();
    resetInstance();
    quotationDao = getInstance(mockDb as any);

    // Setup successful transaction mock
    mockTransaction.mockImplementation(
      (callback, errorCallback, successCallback) => {
        const mockTx = { executeSql: mockExecuteSql };

        mockExecuteSql.mockImplementation((sql, params, success, error) => {
          setTimeout(() => {
            if (sql.includes('SUM(CASE WHEN')) {
              // Mock statistics query response
              success &&
                success(mockTx, {
                  rows: {
                    item: () => ({
                      total: 10,
                      draft: 5,
                      sent: 3,
                      accepted: 1,
                      rejected: 1,
                    }),
                  },
                });
            } else if (sql.includes('SUM(final_amount)')) {
              // Mock total value query response
              success &&
                success(mockTx, { rows: { item: () => ({ total: 15000 }) } });
            } else if (sql.includes('SELECT')) {
              const mockRows = {
                length: 1,
                item: () => ({
                  id: 'test-quotation-1',
                  lead_id: 'lead-1',
                  customer_id: 'customer-1',
                  total_amount: 10000,
                  final_amount: 8500,
                  status: 'draft',
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
        if (successCallback) setTimeout(successCallback, 0);
      }
    );
  });

  describe('Basic Operations', () => {
    it('should create new quotation', async () => {
      const createRequest: CreateQuotationRequest = {
        lead_id: 'lead-1',
        customer_id: 'customer-1',
        total_amount: 10000,
        final_amount: 8500,
      };

      const quotationId = await quotationDao.create(createRequest);

      expect(typeof quotationId).toBe('string');
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should find quotations by lead ID', async () => {
      await quotationDao.findByLeadId('lead-1');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        'SELECT * FROM quotations WHERE lead_id = ?',
        ['lead-1'],
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should get statistics', async () => {
      const stats = await quotationDao.getStatistics();

      expect(stats).toEqual({
        total: 10,
        draft: 5,
        sent: 3,
        accepted: 1,
        rejected: 1,
      });

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('SUM(CASE WHEN'),
        [],
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('Status Management', () => {
    it('should update quotation status', async () => {
      await quotationDao.updateStatus('quotation-1', 'sent');

      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should mark quotation as expired', async () => {
      await quotationDao.markExpired('quotation-1');

      expect(mockTransaction).toHaveBeenCalled();
    });
  });
});
