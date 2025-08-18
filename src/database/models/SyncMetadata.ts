/**
 * Sync Metadata Entity Model
 * TypeScript interface for sync tracking records
 */

export interface SyncMetadata {
  table_name: string;
  last_sync_timestamp: string;
  last_sync_version: number;
  sync_status: 'completed' | 'in_progress' | 'failed';
  error_message?: string;
  record_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Sync metadata update interface
 */
export interface UpdateSyncMetadataRequest {
  table_name: string;
  last_sync_timestamp?: string;
  last_sync_version?: number;
  sync_status?: 'completed' | 'in_progress' | 'failed';
  error_message?: string;
  record_count?: number;
}
