import AsyncStorage from '@react-native-async-storage/async-storage';
import { Store } from '@reduxjs/toolkit';
import {
  setUnreadNotificationCount,
  setLastSyncTimestamp,
  setDashboardSummary,
  DashboardSummary,
} from '../store/slices/networkSlice';

export interface HydrationData {
  unreadCount?: number;
  lastSyncTs?: string;
  dashboardSummary?: DashboardSummary;
}

/**
 * Storage keys for persistence
 */
export const STORAGE_KEYS = {
  UNREAD_COUNT: '@unread_notification_count',
  LAST_SYNC_TIMESTAMP: '@last_sync_timestamp',
  DASHBOARD_SUMMARY: '@dashboard_summary',
  USER_PREFERENCES: '@user_preferences',
  APP_STATE: '@app_state',
  SYNC_ENTITIES_STATE: '@sync_entities_state',
} as const;

/**
 * Save data to AsyncStorage with error handling
 */
export const saveToStorage = async (
  key: string,
  data: any
): Promise<boolean> => {
  try {
    const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonData);
    console.log(`💾 Saved to storage: ${key}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to save to storage (${key}):`, error);
    return false;
  }
};

/**
 * Load data from AsyncStorage with error handling
 */
export const loadFromStorage = async <T = any>(
  key: string,
  defaultValue?: T
): Promise<T | null> => {
  try {
    const data = await AsyncStorage.getItem(key);
    if (data === null) {
      return defaultValue || null;
    }

    try {
      return JSON.parse(data) as T;
    } catch {
      // If JSON parsing fails, return as string
      return data as unknown as T;
    }
  } catch (error) {
    console.error(`❌ Failed to load from storage (${key}):`, error);
    return defaultValue || null;
  }
};

/**
 * Hydrate Redux slices with persisted data
 */
export const hydrateReduxSlices = async (
  store: Store,
  additionalData?: HydrationData
): Promise<void> => {
  try {
    console.log('💧 Starting Redux slices hydration...');

    // Load unread notification count
    const unreadCount =
      additionalData?.unreadCount ??
      (await loadFromStorage<number>(STORAGE_KEYS.UNREAD_COUNT, 0));

    if (unreadCount !== null && unreadCount >= 0) {
      console.log('💧 Hydrating unread count:', unreadCount);
      store.dispatch(setUnreadNotificationCount(unreadCount));
    }

    // Load last sync timestamp
    const lastSyncTs =
      additionalData?.lastSyncTs ??
      (await loadFromStorage<string>(STORAGE_KEYS.LAST_SYNC_TIMESTAMP));

    if (lastSyncTs) {
      console.log('💧 Hydrating last sync timestamp:', lastSyncTs);
      store.dispatch(setLastSyncTimestamp(lastSyncTs));
    }

    // Load dashboard summary
    const dashboardSummary =
      additionalData?.dashboardSummary ??
      (await loadFromStorage<DashboardSummary>(STORAGE_KEYS.DASHBOARD_SUMMARY));

    if (dashboardSummary) {
      console.log('💧 Hydrating dashboard summary:', dashboardSummary);
      store.dispatch(setDashboardSummary(dashboardSummary));
    }

    console.log('✅ Redux slices hydrated successfully');
  } catch (error) {
    console.error('❌ Failed to hydrate Redux slices:', error);
  }
};

/**
 * Initialize persistence system
 */
export const initializePersistence = async (store: Store): Promise<void> => {
  try {
    console.log('🏁 Initializing persistence system...');
    await hydrateReduxSlices(store);
    console.log('✅ Persistence system initialized');
  } catch (error) {
    console.error('❌ Failed to initialize persistence:', error);
  }
};

export default {
  saveToStorage,
  loadFromStorage,
  hydrateReduxSlices,
  initializePersistence,
  STORAGE_KEYS,
};
