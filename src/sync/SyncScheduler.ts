import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { getSyncManager } from '../services/SyncManager';
import { store } from '../store/store';
import { AUTO_SYNC_INTERVAL_MS, AUTO_SYNC_JITTER_MS } from '../constants/sync';

export class SyncScheduler {
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private netInfoUnsubscribe: any = null;
  private isOnline = true;
  private appState: AppStateStatus = 'active';
  private syncManager = getSyncManager(store);

  constructor() {
    this.setupAppStateListener();
    this.setupNetworkListener();
    console.log('📅 SyncScheduler initialized');
  }

  /**
   * Setup app state change listener
   */
  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  /**
   * Setup network state listener
   */
  private setupNetworkListener(): void {
    this.netInfoUnsubscribe = NetInfo.addEventListener(
      this.handleNetworkStateChange.bind(this)
    );
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    console.log(`📱 App state changed: ${this.appState} -> ${nextAppState}`);

    const previousState = this.appState;
    this.appState = nextAppState;

    if (nextAppState === 'active') {
      // App came to foreground
      if (previousState !== 'active') {
        console.log('📱 App became active - resuming auto-sync');
        this.scheduleAutoSync();
      }
    } else {
      // App went to background
      console.log('📱 App went to background - pausing auto-sync');
      this.stopAutoSync();
    }
  }

  /**
   * Handle network state changes
   */
  private handleNetworkStateChange(state: any): void {
    const wasOnline = this.isOnline;
    this.isOnline = state.isConnected && state.isInternetReachable;

    console.log(`📡 Network state changed: ${wasOnline} -> ${this.isOnline}`);

    if (this.isOnline && !wasOnline && this.appState === 'active') {
      // Came back online while app is active
      console.log('📡 Back online - resuming auto-sync');
      this.scheduleAutoSync();
    } else if (!this.isOnline) {
      // Went offline
      console.log('📡 Went offline - stopping auto-sync');
      this.stopAutoSync();
    }
  }

  /**
   * Start the sync scheduler
   */
  start(): void {
    console.log('📅 Starting sync scheduler');

    if (this.appState === 'active' && this.isOnline) {
      this.scheduleAutoSync();
    } else {
      console.log('📅 Auto-sync not started - app not active or offline');
    }
  }

  /**
   * Stop the sync scheduler
   */
  stop(): void {
    console.log('📅 Stopping sync scheduler');
    this.stopAutoSync();
  }

  /**
   * Schedule auto-sync with jitter
   */
  private scheduleAutoSync(): void {
    // Clear existing interval
    this.stopAutoSync();

    // Don't schedule if app is not active or offline
    if (this.appState !== 'active' || !this.isOnline) {
      console.log('📅 Skipping auto-sync schedule - app not active or offline');
      return;
    }

    // Calculate interval with jitter (180 ± 10 seconds)
    const jitter = (Math.random() - 0.5) * 2 * AUTO_SYNC_JITTER_MS; // -10s to +10s
    const interval = AUTO_SYNC_INTERVAL_MS + jitter;

    console.log(
      `📅 Scheduling auto-sync every ${Math.round(interval / 1000)}s`
    );

    this.autoSyncInterval = setInterval(() => {
      this.executeAutoSync();
    }, interval);

    // Execute first sync after a short delay
    setTimeout(() => {
      this.executeAutoSync();
    }, 5000); // 5 second delay for initial sync
  }

  /**
   * Stop auto-sync interval
   */
  private stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
      console.log('📅 Auto-sync interval cleared');
    }
  }

  /**
   * Execute auto-sync
   */
  private async executeAutoSync(): Promise<void> {
    // Double-check conditions before executing
    if (this.appState !== 'active') {
      console.log('📅 Auto-sync skipped - app not active');
      return;
    }

    if (!this.isOnline) {
      console.log('📅 Auto-sync skipped - offline');
      return;
    }

    try {
      console.log('📅 Executing scheduled auto-sync');
      await this.syncManager.autoSync();
    } catch (error) {
      console.error('❌ Scheduled auto-sync failed:', error);
    }
  }

  /**
   * Force immediate sync (manual trigger)
   */
  async triggerManualSync(): Promise<void> {
    try {
      console.log('📅 Manual sync triggered');
      await this.syncManager.manualSync('manual');
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      throw error;
    }
  }

  /**
   * Force immediate full sync (long press trigger)
   */
  async triggerFullSync(): Promise<void> {
    try {
      console.log('📅 Full sync triggered');
      await this.syncManager.fullSync('longPress');
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isScheduled: !!this.autoSyncInterval,
      appState: this.appState,
      isOnline: this.isOnline,
      canAutoSync: this.appState === 'active' && this.isOnline,
      syncStatus: this.syncManager.getSyncStatus(),
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    console.log('📅 Destroying sync scheduler');

    this.stopAutoSync();

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }

    // Cancel any pending syncs
    this.syncManager.cancelAllSyncs();
  }
}

// Singleton instance
let schedulerInstance: SyncScheduler | null = null;

export const getSyncScheduler = (): SyncScheduler => {
  if (!schedulerInstance) {
    schedulerInstance = new SyncScheduler();
  }
  return schedulerInstance;
};

export const startSyncScheduler = (): void => {
  const scheduler = getSyncScheduler();
  scheduler.start();
};

export const stopSyncScheduler = (): void => {
  if (schedulerInstance) {
    schedulerInstance.stop();
  }
};

export const destroySyncScheduler = (): void => {
  if (schedulerInstance) {
    schedulerInstance.destroy();
    schedulerInstance = null;
  }
};

export default SyncScheduler;
