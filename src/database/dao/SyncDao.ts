/**
 * Sync Metadata Data Access Object
 * Handles database operations for sync tracking
 */
import { BaseDao } from './BaseDao';
import type {
  SyncMetadata,
  UpdateSyncMetadataRequest,
} from '../models/SyncMetadata';
import type { SQLiteDatabase } from '../database';

/**
 * Sync Metadata DAO implementation
 */
export class SyncDao extends BaseDao<SyncMetadata> {
  protected tableName = 'sync_metadata';

  constructor(db: SQLiteDatabase) {
    super(db);
  }

  /**
   * Build upsert query for sync metadata records
   */
  protected buildUpsertQuery(record: Partial<SyncMetadata>): {
    sql: string;
    params: any[];
  } {
    // Add default values
    const syncRecord = {
      ...record,
      sync_status: record.sync_status || 'completed',
      last_sync_version: record.last_sync_version || 0,
      record_count: record.record_count || 0,
    };

    // Add timestamps
    this.addTimestamps(syncRecord, !!record.table_name);

    const sql = `
      INSERT OR REPLACE INTO sync_metadata (
        table_name, last_sync_timestamp, last_sync_version, sync_status,
        error_message, record_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      syncRecord.table_name,
      syncRecord.last_sync_timestamp,
      syncRecord.last_sync_version,
      syncRecord.sync_status,
      syncRecord.error_message || null,
      syncRecord.record_count,
      syncRecord.created_at,
      syncRecord.updated_at,
    ];

    return { sql, params };
  }

  /**
   * Get sync metadata by table name
   * @param tableName - Table name
   * @returns Promise<SyncMetadata | undefined>
   */
  async getByTableName(tableName: string): Promise<SyncMetadata | undefined> {
    const records = await this.findAll('table_name = ?', [tableName]);
    return records.length > 0 ? records[0] : undefined;
  }

  /**
   * Get all sync metadata records
   * @returns Promise<SyncMetadata[]>
   */
  async getAllSyncMetadata(): Promise<SyncMetadata[]> {
    return this.findAll();
  }

  /**
   * Get sync metadata for tables with pending sync
   * @returns Promise<SyncMetadata[]>
   */
  async getPendingSync(): Promise<SyncMetadata[]> {
    return this.findAll('sync_status = ?', ['in_progress']);
  }

  /**
   * Get sync metadata for tables with failed sync
   * @returns Promise<SyncMetadata[]>
   */
  async getFailedSync(): Promise<SyncMetadata[]> {
    return this.findAll('sync_status = ?', ['failed']);
  }

  /**
   * Get last sync timestamp for a table
   * @param tableName - Table name
   * @returns Promise<string | null>
   */
  async getLastSyncTimestamp(tableName: string): Promise<string | null> {
    const metadata = await this.getByTableName(tableName);
    return metadata ? metadata.last_sync_timestamp : null;
  }

  /**
   * Update sync metadata for a table
   * @param updateRequest - Sync metadata update data
   * @returns Promise<void>
   */
  async updateSyncMetadata(
    updateRequest: UpdateSyncMetadataRequest
  ): Promise<void> {
    const existing = await this.getByTableName(updateRequest.table_name);

    const syncRecord: Partial<SyncMetadata> = existing
      ? { ...existing, ...updateRequest }
      : {
          table_name: updateRequest.table_name,
          last_sync_timestamp:
            updateRequest.last_sync_timestamp || new Date().toISOString(),
          last_sync_version: updateRequest.last_sync_version || 0,
          sync_status: updateRequest.sync_status || 'completed',
          error_message: updateRequest.error_message,
          record_count: updateRequest.record_count || 0,
        };

    await this.upsertAll([syncRecord]);
  }

  /**
   * Mark sync as started for a table
   * @param tableName - Table name
   * @returns Promise<void>
   */
  async markSyncStarted(tableName: string): Promise<void> {
    await this.updateSyncMetadata({
      table_name: tableName,
      sync_status: 'in_progress',
      last_sync_timestamp: new Date().toISOString(),
    });
  }

  /**
   * Mark sync as completed for a table
   * @param tableName - Table name
   * @param recordCount - Number of records synced
   * @param version - Sync version
   * @returns Promise<void>
   */
  async markSyncCompleted(
    tableName: string,
    recordCount: number,
    version: number = 1
  ): Promise<void> {
    await this.updateSyncMetadata({
      table_name: tableName,
      sync_status: 'completed',
      last_sync_timestamp: new Date().toISOString(),
      last_sync_version: version,
      record_count: recordCount,
      error_message: undefined, // Clear any previous error
    });
  }

  /**
   * Mark sync as failed for a table
   * @param tableName - Table name
   * @param errorMessage - Error message
   * @returns Promise<void>
   */
  async markSyncFailed(tableName: string, errorMessage: string): Promise<void> {
    await this.updateSyncMetadata({
      table_name: tableName,
      sync_status: 'failed',
      error_message: errorMessage,
      last_sync_timestamp: new Date().toISOString(),
    });
  }

  /**
   * Reset sync status for a table (clear errors)
   * @param tableName - Table name
   * @returns Promise<void>
   */
  async resetSyncStatus(tableName: string): Promise<void> {
    await this.updateSyncMetadata({
      table_name: tableName,
      sync_status: 'completed',
      error_message: undefined,
    });
  }

  /**
   * Get sync statistics
   * @returns Promise<{completed: number, in_progress: number, failed: number}>
   */
  async getSyncStatistics(): Promise<{
    completed: number;
    in_progress: number;
    failed: number;
  }> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(
          `SELECT 
            SUM(CASE WHEN sync_status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN sync_status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
            SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed
          FROM sync_metadata`,
          [],
          (_, result) => {
            const stats = result.rows.item(0);
            resolve({
              completed: stats.completed || 0,
              in_progress: stats.in_progress || 0,
              failed: stats.failed || 0,
            });
          },
          (_, error) => {
            console.error('Failed to get sync statistics:', error);
            reject(new Error(`Sync statistics query failed: ${error.message}`));
          }
        );
      });
    });
  }

  /**
   * Check if sync is needed for a table
   * @param tableName - Table name
   * @param maxAgeMinutes - Maximum age in minutes before sync is needed
   * @returns Promise<boolean>
   */
  async isSyncNeeded(
    tableName: string,
    maxAgeMinutes: number = 60
  ): Promise<boolean> {
    const metadata = await this.getByTableName(tableName);

    if (!metadata) {
      return true; // No sync record means sync is needed
    }

    if (metadata.sync_status === 'failed') {
      return true; // Failed sync needs retry
    }

    // Check if last sync is older than maxAgeMinutes
    const lastSync = new Date(metadata.last_sync_timestamp);
    const now = new Date();
    const ageMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);

    return ageMinutes > maxAgeMinutes;
  }

  /**
   * Get tables that need sync
   * @param maxAgeMinutes - Maximum age in minutes
   * @returns Promise<string[]> - Array of table names
   */
  async getTablesNeedingSync(maxAgeMinutes: number = 60): Promise<string[]> {
    const allMetadata = await this.getAllSyncMetadata();
    const tablesNeedingSync: string[] = [];

    for (const metadata of allMetadata) {
      const isNeeded = await this.isSyncNeeded(
        metadata.table_name,
        maxAgeMinutes
      );
      if (isNeeded) {
        tablesNeedingSync.push(metadata.table_name);
      }
    }

    return tablesNeedingSync;
  }
}

// Singleton instance
let syncDaoInstance: SyncDao | null = null;

/**
 * Get singleton instance of SyncDao
 * @param db - Database instance
 * @returns SyncDao instance
 */
export function getInstance(db: SQLiteDatabase): SyncDao {
  if (!syncDaoInstance) {
    syncDaoInstance = new SyncDao(db);
  }
  return syncDaoInstance;
}

/**
 * Reset singleton instance (for testing)
 */
export function resetInstance(): void {
  syncDaoInstance = null;
}
