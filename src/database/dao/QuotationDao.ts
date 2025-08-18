/**
 * Quotation Data Access Object
 * Handles database operations for Quotation entities
 */
import { BaseDao } from './BaseDao';
import type { Quotation, CreateQuotationRequest } from '../models/Quotation';
import type { SQLiteDatabase } from '../database';

/**
 * Quotation DAO implementation
 */
export class QuotationDao extends BaseDao<Quotation> {
  protected tableName = 'quotations';

  constructor(db: SQLiteDatabase) {
    super(db);
  }

  /**
   * Build upsert query for quotation records - FIXED to match actual schema
   */
  protected buildUpsertQuery(record: Partial<Quotation>): {
    sql: string;
    params: any[];
  } {
    // Add default values
    const quotationRecord = {
      ...record,
      sync_status: record.sync_status || 'pending',
      local_changes: record.local_changes || '{}',
      status: record.status || 'draft',
    };

    // Add timestamps
    this.addTimestamps(quotationRecord, !!record.id);

    // Generate ID if not provided
    if (!quotationRecord.id) {
      quotationRecord.id = this.generateId();
    }

    // ✅ FIX - Use actual database columns
    const sql = `
    INSERT OR REPLACE INTO quotations (
      id, lead_id, customer_id, amount, status, items, terms,
      created_at, updated_at, sync_status, local_changes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

    const params = [
      quotationRecord.id,
      quotationRecord.lead_id,
      quotationRecord.customer_id,
      quotationRecord.total_amount || 0, // Map total_amount to amount
      quotationRecord.status,
      quotationRecord.items || null, // Use items instead of product_details
      quotationRecord.terms || null, // Use terms instead of terms_conditions
      quotationRecord.created_at,
      quotationRecord.updated_at,
      quotationRecord.sync_status,
      quotationRecord.local_changes,
    ];

    return { sql, params };
  }

  /**
   * Find quotations by lead ID
   * @param leadId - Lead ID
   * @returns Promise<Quotation[]>
   */
  async findByLeadId(leadId: string): Promise<Quotation[]> {
    return this.findAll('lead_id = ?', [leadId]);
  }

  /**
   * Find quotations by customer ID
   * @param customerId - Customer ID
   * @returns Promise<Quotation[]>
   */
  async findByCustomerId(customerId: string): Promise<Quotation[]> {
    return this.findAll('customer_id = ?', [customerId]);
  }

  /**
   * Find quotations by status
   * @param status - Quotation status
   * @returns Promise<Quotation[]>
   */
  async findByStatus(status: string): Promise<Quotation[]> {
    return this.findAll('status = ?', [status]);
  }

  /**
   * Find quotation by quotation number
   * @param quotationNumber - Quotation number
   * @returns Promise<Quotation | undefined>
   */
  async findByQuotationNumber(
    quotationNumber: string
  ): Promise<Quotation | undefined> {
    const quotations = await this.findAll('quotation_number = ?', [
      quotationNumber,
    ]);
    return quotations.length > 0 ? quotations[0] : undefined;
  }

  /**
   * Find expired quotations
   * @param currentDate - Current date in ISO format
   * @returns Promise<Quotation[]>
   */
  async findExpired(currentDate: string): Promise<Quotation[]> {
    return this.findAll('valid_until < ? AND status NOT IN (?, ?, ?)', [
      currentDate,
      'accepted',
      'rejected',
      'expired',
    ]);
  }

  /**
   * Find quotations pending sync
   * @returns Promise<Quotation[]>
   */
  async findPendingSync(): Promise<Quotation[]> {
    return this.findAll('sync_status = ?', ['pending']);
  }

  /**
   * Get quotations by amount range
   * @param minAmount - Minimum amount
   * @param maxAmount - Maximum amount
   * @returns Promise<Quotation[]>
   */
  async findByAmountRange(
    minAmount: number,
    maxAmount: number
  ): Promise<Quotation[]> {
    return this.findAll('final_amount BETWEEN ? AND ?', [minAmount, maxAmount]);
  }

  /**
   * Create a new quotation
   * @param quotationRequest - Quotation creation data
   * @returns Promise<string> - Created quotation ID
   */
  async create(quotationRequest: CreateQuotationRequest): Promise<string> {
    const id = quotationRequest.id || this.generateId();
    const quotation: Partial<Quotation> = {
      ...quotationRequest,
      id,
      sync_status: 'pending',
      local_changes: '{}',
      status: quotationRequest.status || 'draft',
      subsidy_amount: quotationRequest.subsidy_amount || 0,
    };

    await this.upsertAll([quotation]);
    return id;
  }

  /**
   * Update quotation status
   * @param quotationId - Quotation ID
   * @param status - New status
   * @returns Promise<void>
   */
  async updateStatus(
    quotationId: string,
    status: Quotation['status']
  ): Promise<void> {
    const existingQuotation = await this.findById(quotationId);
    if (!existingQuotation) {
      throw new Error(`Quotation with ID ${quotationId} not found`);
    }

    const updatedQuotation: Partial<Quotation> = {
      ...existingQuotation,
      status,
      sync_status: 'pending',
      local_changes: JSON.stringify({ status }),
    };

    await this.upsertAll([updatedQuotation]);
  }

  /**
   * Mark quotation as expired
   * @param quotationId - Quotation ID
   * @returns Promise<void>
   */
  async markExpired(quotationId: string): Promise<void> {
    await this.updateStatus(quotationId, 'expired');
  }

  /**
   * Get total quotation value for a customer
   * @param customerId - Customer ID
   * @returns Promise<number>
   */
  async getTotalValueByCustomer(customerId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(
          'SELECT SUM(final_amount) as total FROM quotations WHERE customer_id = ?',
          [customerId],
          (_, result) => {
            const total = result.rows.item(0).total || 0;
            resolve(total);
          },
          (_, error) => {
            console.error('Failed to get total quotation value:', error);
            reject(new Error(`Query failed: ${error.message}`));
          }
        );
      });
    });
  }

  /**
   * Get quotation statistics
   * @returns Promise<{total: number, draft: number, sent: number, accepted: number, rejected: number}>
   */
  async getStatistics(): Promise<{
    total: number;
    draft: number;
    sent: number;
    accepted: number;
    rejected: number;
  }> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(
          `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
            SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
            SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
          FROM quotations`,
          [],
          (_, result) => {
            const stats = result.rows.item(0);
            resolve({
              total: stats.total || 0,
              draft: stats.draft || 0,
              sent: stats.sent || 0,
              accepted: stats.accepted || 0,
              rejected: stats.rejected || 0,
            });
          },
          (_, error) => {
            console.error('Failed to get quotation statistics:', error);
            reject(new Error(`Statistics query failed: ${error.message}`));
          }
        );
      });
    });
  }
}

// Singleton instance
let quotationDaoInstance: QuotationDao | null = null;

/**
 * Get singleton instance of QuotationDao
 * @param db - Database instance
 * @returns QuotationDao instance
 */
export function getInstance(db: SQLiteDatabase): QuotationDao {
  if (!quotationDaoInstance) {
    quotationDaoInstance = new QuotationDao(db);
  }
  return quotationDaoInstance;
}

/**
 * Reset singleton instance (for testing)
 */
export function resetInstance(): void {
  quotationDaoInstance = null;
}
