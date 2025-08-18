/**
 * Enhanced SyncManager with Cache Consistency & Change Filtering
 * Handles background sync scheduling and unchanged record filtering for ST-06-6
 */

import { Store } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';
import {
  setSyncStarted,
  setSyncFinished,
  setSyncFailed,
  setNextAllowedSyncAt,
  setUnreadNotificationCount,
  setLastSyncTimestamp,
  selectSyncInProgress,
  selectNextAllowedSyncAt,
} from '../store/slices/networkSlice';
import { RootState } from '../store/store';
import { Lead } from '../database/models/Lead';
import {
  AUTO_SYNC_INTERVAL_MS,
  MIN_SYNC_GAP_MS,
  SYNC_TIMEOUT_MS,
  SYNC_THROTTLE_MESSAGE,
  SYNC_CONCURRENT_MESSAGE,
  SyncSource,
} from '../constants/sync';

export interface SyncConfig {
  syncCooldown: number;
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
}

export interface SyncEntity {
  name: string;
  endpoint: string;
  lastSyncKey: string;
  processor?: (data: any[]) => Promise<void>;
}

// Mutex implementation using Promise
class SyncMutex {
  private locked = false;
  private waiting: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];

  async acquire(): Promise<() => void> {
    return new Promise((resolve, reject) => {
      if (!this.locked) {
        this.locked = true;
        resolve(() => this.release());
      } else {
        this.waiting.push({
          resolve: () => resolve(() => this.release()),
          reject,
        });
      }
    });
  }

  private release(): void {
    const next = this.waiting.shift();
    if (next) {
      next.resolve();
    } else {
      this.locked = false;
    }
  }

  isLocked(): boolean {
    return this.locked;
  }

  // Cancel all waiting operations
  cancelAll(): void {
    const waitingCopy = [...this.waiting];
    this.waiting = [];
    waitingCopy.forEach(({ reject }) => {
      reject(new Error('Sync mutex cancelled'));
    });
    this.locked = false;
  }
}

export class SyncManager {
  private store: Store<RootState>;
  private config: SyncConfig;
  private entities: SyncEntity[];
  private static lastSyncAt: number | null = null; // Single source of truth
  private static syncMutex = new SyncMutex();
  private lastUnreadCountFetch: number = 0;
  private readonly UNREAD_COUNT_CACHE_DURATION = 30000;
  private static instance: SyncManager | null = null;

  constructor(store: Store<RootState>, config?: Partial<SyncConfig>) {
    this.store = store;
    this.config = {
      syncCooldown: AUTO_SYNC_INTERVAL_MS,
      maxRetries: 3,
      retryDelay: 1000,
      batchSize: 100,
      ...config,
    };

    this.entities = [
      {
        name: 'leads',
        endpoint: '/api/v1/leads',
        lastSyncKey: 'lastLeadsSync',
        processor: this.processLeadsData.bind(this),
      },
      {
        name: 'notifications',
        endpoint:
          '/api/v1/notifications?page=1&limit=20&status=unread&sortBy=createdAt&sortOrder=desc',
        lastSyncKey: 'lastNotificationsSync',
      },
    ];

    console.log('🔄 Enhanced SyncManager initialized with change filtering');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SyncManager | null {
    return SyncManager.instance;
  }

  /**
   * Set singleton instance
   */
  public static setInstance(instance: SyncManager): void {
    SyncManager.instance = instance;
  }

  /**
   * Get auth headers for API requests
   */
  private getAuthHeaders(): Record<string, string> {
    const state = this.store.getState();
    const token = state.auth?.token;

    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  /**
   * Get existing leads from Redux state for comparison
   */
  private getExistingLeadsFromRedux(): Lead[] {
    try {
      const state = this.store.getState() as RootState;
      return Object.values(state.lead?.items || {});
    } catch (error) {
      console.warn('⚠️ Could not get existing leads from Redux:', error);
      return [];
    }
  }

  /**
   * Filter out unchanged records to prevent sync thrashing
   */
  private filterChangedLeads(newLeads: any[], existingLeads: Lead[]): any[] {
    if (!Array.isArray(newLeads) || newLeads.length === 0) {
      console.log('📊 No new leads to filter');
      return [];
    }

    const existingMap = new Map(existingLeads.map((lead) => [lead.id, lead]));

    const changedLeads = newLeads.filter((newLead) => {
      const leadId = newLead.leadId || newLead.id;
      const existingLead = existingMap.get(leadId);

      if (!existingLead) {
        console.log(
          `📝 New lead detected: ${leadId} (${newLead.customerName})`
        );
        return true;
      }

      // Check if important fields have changed
      const importantFields = {
        status: newLead.status,
        remarks: newLead.remarks || '',
        nextFollowUpDate: newLead.nextFollowUpDate || newLead.followUpDate,
        updatedAt: newLead.updatedAt,
        customerName: newLead.customerName,
      };

      const hasChanges = Object.entries(importantFields).some(
        ([field, newValue]) => {
          let existingValue;

          // Map field names to Lead interface
          switch (field) {
            case 'nextFollowUpDate':
              existingValue = existingLead.follow_up_date;
              break;
            case 'updatedAt':
              existingValue = existingLead.updated_at;
              break;
            case 'customerName':
              existingValue = existingLead.customerName;
              break;
            default:
              existingValue = existingLead[field as keyof Lead];
          }

          const changed =
            String(newValue || '') !== String(existingValue || '');

          if (changed) {
            console.log(
              `🔄 Lead ${leadId} changed: ${field} "${existingValue}" → "${newValue}"`
            );
          }

          return changed;
        }
      );

      if (!hasChanges) {
        console.log(`⏭️ Lead ${leadId} unchanged, skipping sync`);
      }

      return hasChanges;
    });

    console.log(
      `📊 Filtered ${newLeads.length} leads to ${changedLeads.length} changed leads`
    );
    return changedLeads;
  }

  /**
   * Transform API lead format to Redux lead format
   */
  private transformApiLeadToRedux(apiLead: any): Lead {
    return {
      id: apiLead.leadId || apiLead.id,
      customer_id: undefined,
      status: apiLead.status || 'New Lead',
      priority: 'medium' as const,
      source: 'CP',
      product_type: apiLead.services?.join(', ') || '',
      estimated_value: undefined,
      follow_up_date: apiLead.nextFollowUpDate || apiLead.followUpDate,
      created_at: apiLead.createdAt || new Date().toISOString(),
      updated_at: apiLead.updatedAt || new Date().toISOString(),
      remarks: apiLead.remarks || '',
      address: apiLead.address || '',
      phone: apiLead.phone || '',
      email: apiLead.email || '',
      sync_status: 'synced' as const,
      local_changes: '{}',
      customerName: apiLead.customerName || '',
      assignedTo: apiLead.assignedTo || '',
      services: apiLead.services || [],
    };
  }

  /**
   * Process leads data with change filtering
   */
  private async processLeadsData(leadsData: any[]): Promise<void> {
    try {
      console.log(`🔄 Processing ${leadsData.length} leads from API...`);

      // Get existing leads for comparison
      const existingLeads = this.getExistingLeadsFromRedux();

      // Filter out unchanged leads
      const changedLeads = this.filterChangedLeads(leadsData, existingLeads);

      if (changedLeads.length === 0) {
        console.log('✅ No changed leads to process');
        return;
      }

      // Transform API leads to Redux format
      const transformedLeads = changedLeads.map(
        this.transformApiLeadToRedux.bind(this)
      );

      // Update Redux state
      this.store.dispatch({
        type: 'leads/upsertLeads',
        payload: transformedLeads,
      });

      console.log(
        `✅ Processed ${transformedLeads.length} changed leads into Redux state`
      );

      // TODO: Persist to SQLite if needed
      // await this.persistLeadsToSQLite(transformedLeads);
    } catch (error) {
      console.error('❌ Error processing leads data:', error);
      throw error;
    }
  }

  /**
   * Persist leads to SQLite (placeholder for your existing SQLite logic)
   */
  private async persistLeadsToSQLite(leads: Lead[]): Promise<void> {
    try {
      console.log(`💾 Persisting ${leads.length} leads to SQLite...`);

      // TODO: Implement your existing SQLite persistence logic here
      // This is where you would save the leads to your local SQLite database

      console.log('✅ Leads persisted to SQLite successfully');
    } catch (error) {
      console.error('❌ Error persisting leads to SQLite:', error);
      throw error;
    }
  }

  /**
   * Check if sync is throttled
   */
  private isSyncThrottled(): boolean {
    if (!SyncManager.lastSyncAt) {
      return false;
    }

    const timeSinceLastSync = Date.now() - SyncManager.lastSyncAt;
    const isThrottled = timeSinceLastSync < MIN_SYNC_GAP_MS;

    if (isThrottled) {
      const remainingTime = Math.ceil(
        (MIN_SYNC_GAP_MS - timeSinceLastSync) / 1000
      );
      console.log(`⏳ Sync throttled. Next sync allowed in ${remainingTime}s`);
    }

    return isThrottled;
  }

  /**
   * Enhanced manual sync with change filtering and background scheduling
   */
  async manualSync(source: SyncSource = 'manual'): Promise<void> {
    const startTime = Date.now();
    console.log(`🔄 Starting enhanced sync (source: ${source})...`);

    // Check if already syncing
    if (SyncManager.syncMutex.isLocked()) {
      const message =
        source === 'auto'
          ? SYNC_CONCURRENT_MESSAGE
          : 'Sync already in progress';
      console.log(`⚠️ ${message}`);

      if (source !== 'auto') {
        Toast.show({
          type: 'info',
          text1: 'Sync In Progress',
          text2: message,
          position: 'bottom',
        });
      }
      return;
    }

    // Check throttling
    if (this.isSyncThrottled() && source !== 'statusUpdate') {
      const message = SYNC_THROTTLE_MESSAGE;
      console.log(`⏳ ${message}`);

      if (source === 'manual') {
        Toast.show({
          type: 'info',
          text1: 'Sync Throttled',
          text2: message,
          position: 'bottom',
        });
      }
      return;
    }

    // Check network connectivity
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      const message = 'No internet connection available';
      console.log(`📱 ${message}`);

      if (source === 'manual') {
        Toast.show({
          type: 'error',
          text1: 'No Internet',
          text2: message,
          position: 'bottom',
        });
      }
      return;
    }

    const release = await SyncManager.syncMutex.acquire();

    try {
      // Update sync state
      this.store.dispatch(setSyncStarted(source));
      SyncManager.lastSyncAt = Date.now();

      console.log('🔄 Enhanced sync started with change filtering...');

      // Sync each entity with change filtering
      for (const entity of this.entities) {
        try {
          console.log(`🔄 Syncing ${entity.name}...`);

          const response = await fetch(entity.endpoint, {
            method: 'GET',
            headers: this.getAuthHeaders(),
            timeout: SYNC_TIMEOUT_MS,
          });

          if (!response.ok) {
            throw new Error(
              `${entity.name} sync failed: ${response.status} ${response.statusText}`
            );
          }

          const data = await response.json();

          // Handle different response structures
          let entityData = [];
          if (entity.name === 'leads') {
            entityData = data.data?.leads || data.leads || [];
          } else if (entity.name === 'notifications') {
            entityData = data.data?.notifications || data.notifications || [];
          }

          console.log(
            `📥 Received ${entityData.length} ${entity.name} from API`
          );

          // Process with change filtering
          if (entity.processor) {
            await entity.processor(entityData);
          }

          // Update last sync timestamp for this entity
          await AsyncStorage.setItem(entity.lastSyncKey, Date.now().toString());

          console.log(`✅ ${entity.name} sync completed`);
        } catch (error) {
          console.error(`❌ Error syncing ${entity.name}:`, error);
          // Continue with other entities
        }
      }

      // Update notification count
      await this.updateUnreadNotificationCount();

      // Update global sync state
      this.store.dispatch(setSyncFinished());
      this.store.dispatch(setLastSyncTimestamp(Date.now()));
      this.store.dispatch(setNextAllowedSyncAt(Date.now() + MIN_SYNC_GAP_MS));

      const duration = Date.now() - startTime;
      console.log(`✅ Enhanced sync completed successfully in ${duration}ms`);

      if (source === 'manual') {
        Toast.show({
          type: 'success',
          text1: 'Sync Complete',
          text2: `Data updated successfully in ${Math.round(duration / 1000)}s`,
          position: 'bottom',
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      console.error('❌ Enhanced sync failed:', error);

      this.store.dispatch(
        setSyncFailed(error instanceof Error ? error.message : 'Unknown error')
      );

      if (source === 'manual') {
        Toast.show({
          type: 'error',
          text1: 'Sync Failed',
          text2:
            error instanceof Error ? error.message : 'Unknown error occurred',
          position: 'bottom',
        });
      }

      throw error;
    } finally {
      release();
    }
  }

  /**
   * Auto sync (called by scheduler)
   */
  async autoSync(): Promise<void> {
    try {
      const state = this.store.getState();
      const isInProgress = selectSyncInProgress(state);

      if (isInProgress) {
        console.log('⏭️ Auto sync skipped - manual sync in progress');
        return;
      }

      const nextAllowedAt = selectNextAllowedSyncAt(state);
      if (nextAllowedAt && Date.now() < nextAllowedAt) {
        console.log('⏭️ Auto sync skipped - throttled');
        return;
      }

      await this.manualSync('auto');
    } catch (error) {
      console.error('❌ Auto sync failed:', error);
    }
  }

  /**
   * Force sync (bypasses throttling)
   */
  async forceSync(): Promise<void> {
    try {
      SyncManager.lastSyncAt = null; // Reset throttling
      await this.manualSync('manual');
    } catch (error) {
      console.error('❌ Force sync failed:', error);
      throw error;
    }
  }

  /**
   * Update unread notification count
   */
  private async updateUnreadNotificationCount(): Promise<void> {
    try {
      const now = Date.now();

      // Cache unread count for performance
      if (now - this.lastUnreadCountFetch < this.UNREAD_COUNT_CACHE_DURATION) {
        return;
      }

      const response = await fetch('/api/v1/notifications/unread-count', {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        const unreadCount = data.data?.count || data.count || 0;

        this.store.dispatch(setUnreadNotificationCount(unreadCount));
        this.lastUnreadCountFetch = now;

        console.log(`📬 Updated unread notification count: ${unreadCount}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to update unread notification count:', error);
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    isInProgress: boolean;
    lastSyncAt: number | null;
    nextAllowedAt: number | null;
  } {
    const state = this.store.getState();
    return {
      isInProgress: selectSyncInProgress(state),
      lastSyncAt: SyncManager.lastSyncAt,
      nextAllowedAt: selectNextAllowedSyncAt(state),
    };
  }

  /**
   * Cancel all pending sync operations
   */
  cancelSync(): void {
    console.log('❌ Cancelling all sync operations');
    SyncManager.syncMutex.cancelAll();
    this.store.dispatch(setSyncFinished());
  }

  /**
   * Schedule background sync for status updates
   */
  scheduleBackgroundSync(delay: number = 3000): void {
    console.log(`📅 Scheduling background sync in ${delay}ms`);

    setTimeout(async () => {
      try {
        await this.manualSync('statusUpdate');
      } catch (error) {
        console.warn('⚠️ Scheduled background sync failed:', error);
      }
    }, delay);
  }
}

// Singleton instance management
let syncManagerInstance: SyncManager | null = null;

/**
 * Get or create SyncManager instance
 */
export function getSyncManager(store?: Store<RootState>): SyncManager {
  if (!syncManagerInstance && store) {
    syncManagerInstance = new SyncManager(store);
    SyncManager.setInstance(syncManagerInstance);
  }

  if (!syncManagerInstance) {
    throw new Error(
      'SyncManager not initialized. Call getSyncManager(store) first.'
    );
  }

  return syncManagerInstance;
}

/**
 * Initialize SyncManager with store
 */
export function initializeSyncManager(store: Store<RootState>): SyncManager {
  syncManagerInstance = new SyncManager(store);
  SyncManager.setInstance(syncManagerInstance);
  return syncManagerInstance;
}

export default SyncManager;
