import type { Lead } from '../database/models/Lead';
import type { Customer } from '../database/models/Customer';
import type { Quotation } from '../database/models/Quotation';

/**
 * Sync Manager Types
 * Type definitions for the sync engine
 */

/**
 * Result of a sync operation
 */
export interface SyncResult {
  /** Whether the sync was successful */
  success: boolean;
  /** Error message if sync failed */
  error?: string;
  /** Number of records synced per entity type */
  recordCounts?: {
    leads?: number;
    customers?: number;
    quotations?: number;
  };
  /** Duration of sync operation in milliseconds */
  duration?: number;
  /** Timestamp when sync was completed */
  completedAt?: number;
}

/**
 * Source of sync trigger
 */
export type SyncSource = 'manual' | 'scheduler' | 'pullToRefresh';

/**
 * Sync event types for internal event system
 */
export type SyncEventType = 'syncStarted' | 'syncFinished' | 'syncFailed';

/**
 * Sync event data
 */
export interface SyncEventData {
  source: SyncSource;
  timestamp: number;
  error?: string;
  recordCounts?: SyncResult['recordCounts'];
}

/**
 * Payload for persisting fetched data to local cache
 */
export interface PersistPayload {
  leads: Lead[];
  customers: Customer[];
  quotations: Quotation[];
}

/**
 * Result of persistence operation
 */
export interface PersistResult {
  success: boolean;
  error?: string;
  tablesUpdated: string[];
  recordCounts: {
    leads: number;
    customers: number;
    quotations: number;
  };
}

/**
 * Sync failure reasons
 */
export type SyncFailureReason =
  | 'AUTH_EXPIRED'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'DATABASE_ERROR'
  | 'OFFLINE'
  | 'UNKNOWN';
