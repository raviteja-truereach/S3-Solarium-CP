/**
 * Commission DAO
 * Data Access Object for Commission entities (following LeadDao pattern)
 */
import type { SQLiteDatabase } from 'react-native-sqlite-storage';
import type {
  Commission,
  CommissionFilters,
  CommissionKPIStats,
  CreateCommissionRequest,
  UpdateCommissionRequest,
} from '../models/Commission';

// Singleton instance
let instance: CommissionDao | null = null;

export class CommissionDao {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Get singleton instance
   */
  static getInstance(db: SQLiteDatabase): CommissionDao {
    if (!instance) {
      instance = new CommissionDao(db);
      console.log('✅ CommissionDao instance created');
    }
    return instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    instance = null;
    console.log('🔄 CommissionDao instance reset');
  }

  /**
   * Helper function to promisify SQLite operations
   */
  private executeSql(query: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.executeSql(
        query,
        params,
        (result) => {
          console.log(
            `✅ CommissionDao SQL Success: ${query.substring(0, 50)}...`
          );
          resolve(result);
        },
        (error) => {
          console.error(
            `❌ CommissionDao SQL Error: ${query.substring(0, 50)}...`,
            error
          );
          reject(error);
        }
      );
    });
  }

  /**
   * Find commissions by date range (as required in specifications)
   */
  async findByDateRange(
    startDate: string,
    endDate: string
  ): Promise<Commission[]> {
    console.log(`🔍 Finding commissions between ${startDate} and ${endDate}`);

    const startTime = Date.now();

    try {
      const query = `
        SELECT * FROM commissions
        WHERE created_at >= ? AND created_at <= ?
        ORDER BY created_at DESC;
      `;

      const result = await this.executeSql(query, [startDate, endDate]);
      const commissions: Commission[] = [];

      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        commissions.push(this.mapRowToEntity(row));
      }

      const duration = Date.now() - startTime;
      console.log(
        `✅ Retrieved ${commissions.length} commissions by date range in ${duration}ms`
      );

      return commissions;
    } catch (error) {
      console.error('❌ Error finding commissions by date range:', error);
      throw error;
    }
  }

  /**
   * Find commissions by status (as required in specifications)
   */
  async findByStatus(status: string): Promise<Commission[]> {
    console.log(`🔍 Finding commissions with status: ${status}`);

    const startTime = Date.now();

    try {
      const query = `
        SELECT * FROM commissions
        WHERE status = ?
        ORDER BY created_at DESC;
      `;

      const result = await this.executeSql(query, [status]);
      const commissions: Commission[] = [];

      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        commissions.push(this.mapRowToEntity(row));
      }

      const duration = Date.now() - startTime;
      console.log(
        `✅ Retrieved ${commissions.length} commissions by status in ${duration}ms`
      );

      return commissions;
    } catch (error) {
      console.error(`❌ Error finding commissions by status ${status}:`, error);
      throw error;
    }
  }

  /**
   * Get KPI statistics with filters (as required in specifications)
   */
  async getKPIStats(
    filters: CommissionFilters = {}
  ): Promise<CommissionKPIStats> {
    console.log('📊 Getting commission KPI stats with filters:', filters);

    const startTime = Date.now();

    try {
      // Build WHERE clause based on filters
      let whereClause = '1=1';
      const params: any[] = [];

      if (filters.dateRange) {
        whereClause += ' AND created_at >= ? AND created_at <= ?';
        params.push(filters.dateRange.startDate, filters.dateRange.endDate);
      }

      if (filters.status) {
        whereClause += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters.cp_id) {
        whereClause += ' AND cp_id = ?';
        params.push(filters.cp_id);
      }

      if (filters.lead_id) {
        whereClause += ' AND lead_id = ?';
        params.push(filters.lead_id);
      }

      const query = `
        SELECT 
          COUNT(*) as total_count,
          SUM(amount) as total_commission,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_commission,
          SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_commission,
          SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_commission,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count
        FROM commissions
        WHERE ${whereClause};
      `;

      const result = await this.executeSql(query, params);
      const row = result.rows.item(0);

      const stats: CommissionKPIStats = {
        totalCommission: row.total_commission || 0,
        paidCommission: row.paid_commission || 0,
        pendingCommission: row.pending_commission || 0,
        approvedCommission: row.approved_commission || 0,
        totalCount: row.total_count || 0,
        paidCount: row.paid_count || 0,
        pendingCount: row.pending_count || 0,
        approvedCount: row.approved_count || 0,
      };

      const duration = Date.now() - startTime;
      console.log(`✅ Retrieved KPI stats in ${duration}ms:`, stats);

      return stats;
    } catch (error) {
      console.error('❌ Error getting KPI stats:', error);
      throw error;
    }
  }

  /**
   * Upsert multiple commissions (for API sync)
   */
  async upsertMany(commissions: Commission[]): Promise<void> {
    if (!commissions || commissions.length === 0) {
      console.log('⚠️ No commissions to upsert');
      return;
    }

    const startTime = Date.now();
    console.log(`🔄 Upserting ${commissions.length} commissions`);

    try {
      // Begin transaction
      await this.executeSql('BEGIN TRANSACTION;');

      // Insert each commission individually for better error handling
      for (const commission of commissions) {
        await this.executeSql(
          `
          INSERT OR REPLACE INTO commissions (
            id, cp_id, lead_id, customer_id, amount, status, created_at, updated_at,
            payment_date, description, sync_status, local_changes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
          `,
          [
            commission.id,
            commission.cp_id,
            commission.lead_id || null,
            commission.customer_id || null,
            commission.amount,
            commission.status,
            commission.created_at,
            commission.updated_at,
            commission.payment_date || null,
            commission.description || null,
            commission.sync_status || 'synced',
            commission.local_changes || '{}',
          ]
        );
      }

      // Commit transaction
      await this.executeSql('COMMIT;');

      const duration = Date.now() - startTime;
      console.log(
        `✅ Upserted ${commissions.length} commissions in ${duration}ms`
      );

      // Performance check
      if (duration > 200) {
        console.warn(
          `⚠️ Upsert performance warning: ${duration}ms for ${commissions.length} commissions (target: ≤200ms)`
        );
      }
    } catch (error) {
      console.error('❌ Error upserting commissions:', error);
      try {
        await this.executeSql('ROLLBACK;');
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError);
      }
      throw error;
    }
  }

  /**
   * Get all commissions with pagination
   */
  async findAll(limit: number = 25, offset: number = 0): Promise<Commission[]> {
    console.log(
      `🔍 Finding all commissions (limit: ${limit}, offset: ${offset})`
    );

    const startTime = Date.now();

    try {
      const query = `
        SELECT * FROM commissions
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?;
      `;

      const result = await this.executeSql(query, [limit, offset]);
      const commissions: Commission[] = [];

      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        commissions.push(this.mapRowToEntity(row));
      }

      const duration = Date.now() - startTime;
      console.log(
        `✅ Retrieved ${commissions.length} commissions in ${duration}ms`
      );

      return commissions;
    } catch (error) {
      console.error('❌ Error finding all commissions:', error);
      throw error;
    }
  }

  /**
   * Get commission by ID
   */
  async findById(id: string): Promise<Commission | null> {
    console.log(`🔍 Finding commission by ID: ${id}`);

    try {
      const query = 'SELECT * FROM commissions WHERE id = ? LIMIT 1;';
      const result = await this.executeSql(query, [id]);

      if (result.rows.length > 0) {
        const commission = this.mapRowToEntity(result.rows.item(0));
        console.log(`✅ Found commission: ${id}`);
        return commission;
      }

      console.log(`⚠️ Commission not found: ${id}`);
      return null;
    } catch (error) {
      console.error(`❌ Error finding commission ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get commission count
   */
  async getCount(): Promise<number> {
    try {
      const query = 'SELECT COUNT(*) as count FROM commissions;';
      const result = await this.executeSql(query);
      const count = result.rows.item(0).count;
      console.log(`📊 Total commissions count: ${count}`);
      return count;
    } catch (error) {
      console.error('❌ Error getting commission count:', error);
      throw error;
    }
  }

  /**
   * Clear all commissions (for testing)
   */
  async clearAll(): Promise<number> {
    console.log('🗑️ Clearing all commissions');

    try {
      const query = 'DELETE FROM commissions;';
      const result = await this.executeSql(query);
      console.log(`✅ Cleared ${result.rowsAffected} commissions`);
      return result.rowsAffected;
    } catch (error) {
      console.error('❌ Error clearing commissions:', error);
      throw error;
    }
  }

  /**
   * Map database row to Commission entity
   */
  private mapRowToEntity(row: any): Commission {
    return {
      id: row.id,
      cp_id: row.cp_id,
      lead_id: row.lead_id,
      customer_id: row.customer_id,
      amount: row.amount,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      payment_date: row.payment_date,
      description: row.description,
      sync_status: row.sync_status || 'synced',
      local_changes: row.local_changes || '{}',
    };
  }

  /**
   * Performance test method for benchmarking
   */
  async performanceTest(count: number = 50): Promise<{
    insertTime: number;
    selectTime: number;
    kpiTime: number;
    averageInsertTime: number;
  }> {
    console.log(`🧪 Running commission performance test with ${count} records`);

    // Generate test data
    const testCommissions: Commission[] = Array.from(
      { length: count },
      (_, i) => ({
        id: `TEST-COMM-${i.toString().padStart(3, '0')}`,
        cp_id: 'TEST-CP-001',
        lead_id: `TEST-LEAD-${i}`,
        amount: Math.floor(Math.random() * 50000) + 10000,
        status: ['pending', 'paid', 'approved'][
          Math.floor(Math.random() * 3)
        ] as any,
        created_at: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'synced' as const,
        local_changes: '{}',
      })
    );

    // Test insert performance
    const insertStart = Date.now();
    await this.upsertMany(testCommissions);
    const insertTime = Date.now() - insertStart;

    // Test select performance
    const selectStart = Date.now();
    const retrievedCommissions = await this.findAll(count);
    const selectTime = Date.now() - selectStart;

    // Test KPI performance
    const kpiStart = Date.now();
    await this.getKPIStats();
    const kpiTime = Date.now() - kpiStart;

    // Clean up test data
    await this.executeSql(
      'DELETE FROM commissions WHERE id LIKE "TEST-COMM-%";'
    );

    const averageInsertTime = insertTime / count;

    console.log(`📊 Commission performance test results:`, {
      totalCommissions: count,
      insertTime: `${insertTime}ms`,
      selectTime: `${selectTime}ms`,
      kpiTime: `${kpiTime}ms`,
      averageInsertTime: `${averageInsertTime.toFixed(2)}ms per commission`,
      retrievedCount: retrievedCommissions.filter((c) =>
        c.id.startsWith('TEST-COMM-')
      ).length,
    });

    return {
      insertTime,
      selectTime,
      kpiTime,
      averageInsertTime,
    };
  }
}

/**
 * Export singleton getter function (following existing pattern)
 */
export const getInstance = CommissionDao.getInstance;
export const resetInstance = CommissionDao.resetInstance;
