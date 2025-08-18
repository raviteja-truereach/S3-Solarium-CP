/**
 * Sync Service
 * Handles automatic synchronization with auth token management
 */
import { store } from '../store';
import {
  createSyncManager,
  SyncManager,
  SyncEvents,
} from '../sync/SyncManager';
import { getSqliteDatabase } from '../database/database'; // Adjust import based on your setup

class SyncService {
  private syncManager: SyncManager | null = null;
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private readonly AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize sync service when user logs in
   */
  async initializeSync(): Promise<void> {
    try {
      const state = store.getState();
      const { auth } = state;

      if (!auth.isLoggedIn || !auth.token) {
        console.log(
          '⚠️ Cannot initialize sync: User not logged in or no token'
        );
        return;
      }

      const db = await getSqliteDatabase(); // Get your database instance
      if (!db) {
        console.error('❌ Cannot initialize sync: Database not available');
        return;
      }

      console.log('🔄 Initializing SyncService for user:', auth.user?.name);

      this.syncManager = createSyncManager(db, auth.token);

      // Set up event listeners
      this.setupSyncEventListeners();

      // Perform initial sync
      console.log('🔄 Performing initial sync...');
      await this.syncManager.performSync();

      // Start auto-sync interval
      this.startAutoSync();

      console.log('✅ SyncService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize SyncService:', error);
    }
  }

  /**
   * Clean up sync service when user logs out
   */
  cleanup(): void {
    console.log('🧹 Cleaning up SyncService...');

    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }

    if (this.syncManager) {
      this.syncManager.removeAllListeners();
      this.syncManager = null;
    }

    console.log('✅ SyncService cleanup completed');
  }

  /**
   * Manual sync trigger
   */
  async manualSync(): Promise<void> {
    if (!this.syncManager) {
      throw new Error('SyncService not initialized');
    }

    return this.syncManager.performSync();
  }

  /**
   * Force sync (bypass throttle)
   */
  async forceSync(): Promise<void> {
    if (!this.syncManager) {
      throw new Error('SyncService not initialized');
    }

    return this.syncManager.forceSync();
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    if (!this.syncManager) {
      return { isRunning: false, lastSyncTime: null, canSync: false };
    }

    return this.syncManager.getSyncStatus();
  }

  /**
   * Set up sync event listeners
   */
  private setupSyncEventListeners(): void {
    if (!this.syncManager) return;

    this.syncManager.on(SyncEvents.SYNC_STARTED, () => {
      console.log('🔄 Auto-sync started');
    });

    this.syncManager.on(SyncEvents.SYNC_FINISHED, (result) => {
      console.log(`✅ Auto-sync completed: ${result.recordCounts.leads} leads`);
    });

    this.syncManager.on(SyncEvents.SYNC_FAILED, (result) => {
      console.error(
        `❌ Auto-sync failed: ${result.failureReason} - ${result.error}`
      );
    });

    this.syncManager.on(SyncEvents.SYNC_PROGRESS, (progress) => {
      console.log(
        `📄 Auto-sync progress: Page ${progress.currentPage}/${progress.totalPages}`
      );
    });
  }

  /**
   * Start automatic sync interval
   */
  private startAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    this.autoSyncInterval = setInterval(async () => {
      try {
        console.log('⏰ Auto-sync triggered');
        if (this.syncManager) {
          const status = this.syncManager.getSyncStatus();
          if (status.canSync && !status.isRunning) {
            await this.syncManager.performSync();
          } else {
            console.log('⏭️ Auto-sync skipped (throttled or already running)');
          }
        }
      } catch (error) {
        console.error('❌ Auto-sync error:', error);
      }
    }, this.AUTO_SYNC_INTERVAL_MS);

    console.log(
      `⏰ Auto-sync scheduled every ${
        this.AUTO_SYNC_INTERVAL_MS / 1000 / 60
      } minutes`
    );
  }
}

// Singleton instance
export const syncService = new SyncService();
