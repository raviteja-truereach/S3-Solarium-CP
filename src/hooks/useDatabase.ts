/**
 * Database Hook
 * Convenient hook for accessing database functionality
 */
import {
  useDatabase,
  useDatabaseInstance,
  useDatabaseEffect,
} from '../database/DatabaseProvider';
import {
  getLeadDao,
  getCustomerDao,
  getQuotationDao,
  getSyncDao,
} from '../database/dao';
import type { SQLiteDatabase } from '../database/database';

/**
 * Database services interface
 */
interface DatabaseServices {
  /** Database instance */
  database: SQLiteDatabase;
  /** Lead DAO instance */
  leadDao: ReturnType<typeof getLeadDao>;
  /** Customer DAO instance */
  customerDao: ReturnType<typeof getCustomerDao>;
  /** Quotation DAO instance */
  quotationDao: ReturnType<typeof getQuotationDao>;
  /** Sync DAO instance */
  syncDao: ReturnType<typeof getSyncDao>;
}

/**
 * Hook to get database services (DAOs)
 * @returns Database and DAO instances
 * @throws Error if database is not ready
 */
export function useDatabaseServices(): DatabaseServices {
  const database = useDatabaseInstance();

  // Create DAO instances (these are singletons, so safe to call multiple times)
  const leadDao = getLeadDao(database);
  const customerDao = getCustomerDao(database);
  const quotationDao = getQuotationDao(database);
  const syncDao = getSyncDao(database);

  return {
    database,
    leadDao,
    customerDao,
    quotationDao,
    syncDao,
  };
}

/**
 * Hook for database status and control
 */
export function useDatabaseStatus() {
  const { isReady, error, retry, close } = useDatabase();

  return {
    isReady,
    error,
    retry,
    close,
  };
}

// Re-export database hooks from provider for convenience
export { useDatabase, useDatabaseInstance, useDatabaseEffect };
