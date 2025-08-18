/**
 * SQLite Transform for Redux Persist
 * Loads cached data from encrypted SQLite database during rehydration
 */
import { Transform } from 'redux-persist';
import { openDatabase } from '../../database/database';
import {
  getLeadDao,
  getCustomerDao,
  getQuotationDao,
  getSyncDao,
} from '../../database/dao'; // ✅ ADD getQuotationDao
import type { Lead } from '../../database/models/Lead';
import type { Customer } from '../../database/models/Customer';
import type { Quotation } from '../../database/models/Quotation'; // ✅ ADD

/**
 * Performance tracking for rehydration
 */
interface RehydrationMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  recordCount: number;
}

/**
 * Log rehydration performance
 */
function logRehydrationMetrics(
  tableName: string,
  metrics: RehydrationMetrics
): void {
  const { duration, recordCount } = metrics;
  console.log(
    `SQLite rehydration [${tableName}]: ${recordCount} records in ${duration}ms`
  );

  // Warn if performance is slower than expected
  if (duration > 500 && recordCount > 100) {
    console.warn(
      `Slow rehydration detected for ${tableName}: ${duration}ms for ${recordCount} records`
    );
  }
}

/**
 * Load leads from SQLite cache
 */
async function loadLeadsFromCache(): Promise<{
  items: Lead[];
  lastSync: number | null;
}> {
  const startTime = Date.now();

  try {
    const db = await openDatabase();
    const leadDao = getLeadDao(db);
    const syncDao = getSyncDao(db);

    // Load leads and sync metadata in parallel
    const [leads, syncMetadata] = await Promise.all([
      leadDao.findAll(),
      syncDao.getByTableName('leads'),
    ]);

    const lastSync = syncMetadata?.last_sync_timestamp
      ? new Date(syncMetadata.last_sync_timestamp).getTime()
      : null;

    const endTime = Date.now();
    logRehydrationMetrics('leads', {
      startTime,
      endTime,
      duration: endTime - startTime,
      recordCount: leads.length,
    });

    return { items: leads, lastSync };
  } catch (error) {
    console.error('Failed to load leads from cache:', error);
    return { items: [], lastSync: null };
  }
}

/**
 * Load customers from SQLite cache
 */
async function loadCustomersFromCache(): Promise<{
  items: Customer[];
  lastSync: number | null;
}> {
  const startTime = Date.now();

  try {
    const db = await openDatabase();
    const customerDao = getCustomerDao(db);
    const syncDao = getSyncDao(db);

    // Load customers and sync metadata in parallel
    const [customers, syncMetadata] = await Promise.all([
      customerDao.findAll(),
      syncDao.getByTableName('customers'),
    ]);

    const lastSync = syncMetadata?.last_sync_timestamp
      ? new Date(syncMetadata.last_sync_timestamp).getTime()
      : null;

    const endTime = Date.now();
    logRehydrationMetrics('customers', {
      startTime,
      endTime,
      duration: endTime - startTime,
      recordCount: customers.length,
    });

    return { items: customers, lastSync };
  } catch (error) {
    console.error('Failed to load customers from cache:', error);
    return { items: [], lastSync: null };
  }
}

/**
 * ✅ ADD - Load quotations from SQLite cache
 */
async function loadQuotationsFromCache(): Promise<{
  items: Quotation[];
  lastSync: number | null;
}> {
  const startTime = Date.now();

  try {
    const db = await openDatabase();
    const quotationDao = getQuotationDao(db);
    const syncDao = getSyncDao(db);

    // Load quotations and sync metadata in parallel
    const [quotations, syncMetadata] = await Promise.all([
      quotationDao.findAll(),
      syncDao.getByTableName('quotations'),
    ]);

    const lastSync = syncMetadata?.last_sync_timestamp
      ? new Date(syncMetadata.last_sync_timestamp).getTime()
      : null;

    const endTime = Date.now();
    logRehydrationMetrics('quotations', {
      startTime,
      endTime,
      duration: endTime - startTime,
      recordCount: quotations.length,
    });

    return { items: quotations, lastSync };
  } catch (error) {
    console.error('Failed to load quotations from cache:', error);
    return { items: [], lastSync: null };
  }
}

/**
 * Create SQLite transform for Redux Persist
 * Handles rehydration from encrypted SQLite cache
 */
export function createSQLiteTransform(): Transform<any, any, any> {
  return {
    // Transform name for debugging
    name: 'sqliteTransform',

    /**
     * Inbound transform (serialize to storage)
     * NO-OP: We don't want to store large arrays in AsyncStorage
     */
    in: (inboundState: any, key: string) => {
      // Only persist small metadata, not large item arrays
      if (key === 'leads') {
        return {
          lastSync: inboundState.lastSync,
          filters: inboundState.filters,
          // Don't persist items array - it comes from SQLite
        };
      }

      if (key === 'customers') {
        return {
          lastSync: inboundState.lastSync,
          searchTerm: inboundState.searchTerm,
          filters: inboundState.filters,
          // Don't persist items array - it comes from SQLite
        };
      }

      // ✅ ADD - Quotation transform
      if (key === 'quotation') {
        return {
          lastSync: inboundState.lastSync,
          filters: inboundState.filters,
          wizard: inboundState.wizard, // Keep wizard state persisted
          // Don't persist items object - it comes from SQLite
        };
      }

      // For other slices, persist normally
      return inboundState;
    },

    /**
     * Outbound transform (deserialize from storage)
     * Load data from SQLite cache during rehydration
     */
    out: async (outboundState: any, key: string) => {
      try {
        // Skip SQLite loading during initial app startup to prevent race conditions
        if (key === 'leads' || key === 'customers') {
          console.log(
            `SQLite Transform: Skipping ${key} rehydration during startup`
          );

          // Return state without items - they'll be loaded later by DatabaseProvider
          return {
            ...outboundState,
            items: [], // Empty initially for lead/customer arrays
            lastSync: outboundState.lastSync,
            totalCount: 0,
            isLoading: false,
            error: null,
          };
        }

        // ✅ ADD - Handle quotation rehydration
        if (key === 'quotation') {
          console.log(
            `SQLite Transform: Skipping quotation rehydration during startup`
          );

          // Return state without items - they'll be loaded later by DatabaseProvider
          return {
            ...outboundState,
            items: {}, // Empty normalized object for quotations
            lastSync: outboundState.lastSync,
            totalCount: 0,
            isLoading: false,
            error: null,
            wizard: outboundState.wizard || {
              isActive: false,
              currentStep: 1,
              leadId: null,
              data: {},
              errors: {},
              isValid: false,
              creating: false,
            },
          };
        }

        // For other slices, return as-is
        return outboundState;
      } catch (error) {
        console.error(`SQLite transform error for ${key}:`, error);
        return outboundState;
      }
    },
  };
}

/**
 * Preload cache data for immediate availability
 * Can be called during app startup for better UX
 */
export async function preloadCacheData(): Promise<{
  leads: { items: Lead[]; lastSync: number | null };
  customers: { items: Customer[]; lastSync: number | null };
  quotations: { items: Quotation[]; lastSync: number | null }; // ✅ ADD
}> {
  console.log('🔄 Preloading cache data...');
  const startTime = Date.now();

  try {
    const [leadsData, customersData, quotationsData] = await Promise.all([
      loadLeadsFromCache(),
      loadCustomersFromCache(),
      loadQuotationsFromCache(), // ✅ ADD
    ]);

    const duration = Date.now() - startTime;
    const totalRecords =
      leadsData.items.length +
      customersData.items.length +
      quotationsData.items.length;

    console.log(
      `✅ Cache preload completed: ${totalRecords} records in ${duration}ms`
    );

    return {
      leads: leadsData,
      customers: customersData,
      quotations: quotationsData, // ✅ ADD
    };
  } catch (error) {
    console.error('❌ Failed to preload cache data:', error);
    return {
      leads: { items: [], lastSync: null },
      customers: { items: [], lastSync: null },
      quotations: { items: [], lastSync: null }, // ✅ ADD
    };
  }
}

/**
 * Clear cache transform state
 * Used during logout to ensure clean state
 */
export function clearCacheTransform(): void {
  console.log('🧹 Clearing SQLite transform cache...');
  // This function can be used to clear any in-memory caches
  // if we add them in the future
}
