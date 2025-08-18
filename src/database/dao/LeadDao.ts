/**
 * Lead DAO - Fixed Version
 * Corrected to use callback-based SQLite operations instead of destructuring
 */
import type { SQLiteDatabase } from 'react-native-sqlite-storage';
import type { Lead } from '../models/Lead';

export class LeadDao {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Helper function to promisify SQLite operations
   */
  private executeSql(query: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.executeSql(
        query,
        params,
        (result) => {
          console.log(`✅ SQL Success: ${query.substring(0, 50)}...`);
          resolve(result);
        },
        (error) => {
          console.error(`❌ SQL Error: ${query.substring(0, 50)}...`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Upsert multiple leads with page number
   */
  async upsertMany(leads: Lead[], page: number): Promise<void> {
    if (!leads || leads.length === 0) {
      console.log('⚠️ No leads to upsert');
      return;
    }

    const startTime = Date.now();
    console.log(`🔄 Upserting ${leads.length} leads for page ${page}`);

    try {
      // Begin transaction
      await this.executeSql('BEGIN TRANSACTION;');

      // Insert each lead individually for better error handling
      for (const lead of leads) {
        await this.executeSql(
          `
          INSERT OR REPLACE INTO leads (
            id, customer_id, status, priority, source, product_type,
            estimated_value, follow_up_date, created_at, updated_at,
            remarks, address, phone, email, sync_status, local_changes,
            customerName, assignedTo, services, page_number
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
          [
            lead.id,
            lead.customer_id || null,
            lead.status,
            lead.priority || 'medium',
            lead.source || null,
            lead.product_type || null,
            lead.estimated_value || null,
            lead.follow_up_date || null,
            lead.created_at,
            lead.updated_at,
            lead.remarks || null,
            lead.address || null,
            lead.phone || null,
            lead.email || null,
            lead.sync_status || 'synced',
            lead.local_changes || '{}',
            lead.customerName || null,
            lead.assignedTo || null,
            lead.services ? JSON.stringify(lead.services) : null,
            page,
          ]
        );
      }

      // Commit transaction
      await this.executeSql('COMMIT;');

      const duration = Date.now() - startTime;
      console.log(
        `✅ Upserted ${leads.length} leads in ${duration}ms (page ${page})`
      );

      // Performance check
      if (duration > 200) {
        console.warn(
          `⚠️ Upsert performance warning: ${duration}ms for ${leads.length} leads (target: ≤200ms)`
        );
      }
    } catch (error) {
      console.error('❌ Error upserting leads:', error);
      try {
        await this.executeSql('ROLLBACK;');
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError);
      }
      throw error;
    }
  }

  /**
   * Get leads for specific page
   */
  async getPage(page: number, limit: number = 25): Promise<Lead[]> {
    console.log(`🔍 Getting leads for page ${page} (limit: ${limit})`);

    const startTime = Date.now();

    try {
      const query = `
        SELECT * FROM leads
        WHERE page_number = ?
        ORDER BY created_at DESC
        LIMIT ?;
      `;

      const result = await this.executeSql(query, [page, limit]);
      const leads: Lead[] = [];

      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        leads.push(this.mapRowToEntity(row));
      }

      const duration = Date.now() - startTime;
      console.log(
        `✅ Retrieved ${leads.length} leads for page ${page} in ${duration}ms`
      );

      return leads;
    } catch (error) {
      console.error(`❌ Error getting page ${page}:`, error);
      throw error;
    }
  }

  /**
   * Get all lead IDs for efficient pagination management
   */
  async getAllIds(): Promise<string[]> {
    console.log('🔍 Getting all lead IDs');

    const startTime = Date.now();

    try {
      const query = `
        SELECT id FROM leads
        ORDER BY page_number ASC, created_at DESC;
      `;

      const result = await this.executeSql(query);
      const ids: string[] = [];

      for (let i = 0; i < result.rows.length; i++) {
        ids.push(result.rows.item(i).id);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Retrieved ${ids.length} lead IDs in ${duration}ms`);

      return ids;
    } catch (error) {
      console.error('❌ Error getting all lead IDs:', error);
      throw error;
    }
  }

  /**
   * Get leads by page with pagination metadata
   */
  async getPageWithMeta(
    page: number,
    limit: number = 25
  ): Promise<{
    leads: Lead[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    console.log(`🔍 Getting page ${page} with metadata (limit: ${limit})`);

    const startTime = Date.now();

    try {
      // Get total count
      const countResult = await this.executeSql(
        `SELECT COUNT(*) as total FROM leads;`
      );
      const totalCount = countResult.rows.item(0).total;
      const totalPages = Math.ceil(totalCount / limit);

      // Get leads for specific page
      const leads = await this.getPage(page, limit);

      const duration = Date.now() - startTime;
      console.log(`✅ Retrieved page ${page} with metadata in ${duration}ms`);

      return {
        leads,
        totalCount,
        totalPages,
        currentPage: page,
      };
    } catch (error) {
      console.error(`❌ Error getting page ${page} with metadata:`, error);
      throw error;
    }
  }

  /**
   * Get leads count by page
   */
  async getLeadsCountByPage(): Promise<Record<number, number>> {
    try {
      const query = `
        SELECT page_number, COUNT(*) as count
        FROM leads
        GROUP BY page_number
        ORDER BY page_number ASC;
      `;

      const result = await this.executeSql(query);
      const counts: Record<number, number> = {};

      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        counts[row.page_number] = row.count;
      }

      return counts;
    } catch (error) {
      console.error('❌ Error getting leads count by page:', error);
      throw error;
    }
  }

  /**
   * Clear specific page
   */
  async clearPage(page: number): Promise<number> {
    console.log(`🗑️ Clearing page ${page}`);

    try {
      const query = `DELETE FROM leads WHERE page_number = ?;`;
      const result = await this.executeSql(query, [page]);

      console.log(`✅ Cleared ${result.rowsAffected} leads from page ${page}`);
      return result.rowsAffected;
    } catch (error) {
      console.error(`❌ Error clearing page ${page}:`, error);
      throw error;
    }
  }

  /**
   * Map database row to Lead entity
   */
  protected mapRowToEntity(row: any): Lead {
    return {
      id: row.id,
      customer_id: row.customer_id,
      status: row.status,
      priority: row.priority || 'medium',
      source: row.source,
      product_type: row.product_type,
      estimated_value: row.estimated_value,
      follow_up_date: row.follow_up_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
      remarks: row.remarks,
      address: row.address,
      phone: row.phone,
      email: row.email,
      sync_status: row.sync_status || 'synced',
      local_changes: row.local_changes || '{}',
      customerName: row.customerName,
      assignedTo: row.assignedTo,
      services: row.services ? JSON.parse(row.services) : [],
    };
  }

  /**
   * Performance test method for benchmarking
   */
  async performanceTest(count: number = 100): Promise<{
    insertTime: number;
    selectTime: number;
    averageInsertTime: number;
  }> {
    console.log(`🧪 Running performance test with ${count} leads`);

    // Generate test data
    const testLeads: Lead[] = Array.from({ length: count }, (_, i) => ({
      id: `TEST-LEAD-${i.toString().padStart(3, '0')}`,
      status: 'New Lead',
      priority: 'medium' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'synced' as const,
      local_changes: '{}',
      customerName: `Test Customer ${i}`,
      phone: `123456789${i}`,
      address: `Test Address ${i}`,
      assignedTo: 'TEST-CP',
      services: ['SRV001'],
    }));

    // Test insert performance
    const insertStart = Date.now();
    await this.upsertMany(testLeads, 999); // Use page 999 for testing
    const insertTime = Date.now() - insertStart;

    // Test select performance
    const selectStart = Date.now();
    const retrievedLeads = await this.getPage(999);
    const selectTime = Date.now() - selectStart;

    // Clean up test data
    await this.clearPage(999);

    const averageInsertTime = insertTime / count;

    console.log(`📊 Performance test results:`, {
      totalLeads: count,
      insertTime: `${insertTime}ms`,
      selectTime: `${selectTime}ms`,
      averageInsertTime: `${averageInsertTime.toFixed(2)}ms per lead`,
      retrievedCount: retrievedLeads.length,
    });

    return {
      insertTime,
      selectTime,
      averageInsertTime,
    };
  }
}
