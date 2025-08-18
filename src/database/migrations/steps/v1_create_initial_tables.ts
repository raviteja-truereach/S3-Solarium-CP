/**
 * Migration v1: Create initial database tables
 * Creates base tables that other migrations will modify
 */
import type { SQLiteDatabase } from 'react-native-sqlite-storage';
import { executeSqlPromise } from '../../utils/sqliteHelpers';

export async function migrateTo1_createInitialTables(
  db: SQLiteDatabase
): Promise<void> {
  console.log('🔄 Running migration v1: Create initial tables');

  try {
    await executeSqlPromise(db, 'BEGIN TRANSACTION;');

    // Create base leads table (without page_number - v2 will add it)
    await executeSqlPromise(
      db,
      `
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        status TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        source TEXT,
        product_type TEXT,
        estimated_value REAL,
        follow_up_date TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        remarks TEXT,
        address TEXT,
        phone TEXT,
        email TEXT,
        sync_status TEXT DEFAULT 'synced',
        local_changes TEXT DEFAULT '{}',
        customerName TEXT,
        assignedTo TEXT,
        services TEXT
      );
    `
    );

    // Create base customers table
    await executeSqlPromise(
      db,
      `
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'synced',
        local_changes TEXT DEFAULT '{}'
      );
    `
    );

    await executeSqlPromise(db, 'COMMIT;');
    console.log('✅ Migration v1 completed successfully');
  } catch (error) {
    await executeSqlPromise(db, 'ROLLBACK;');
    throw error;
  }
}

export async function validateV1Migration(
  db: SQLiteDatabase
): Promise<boolean> {
  try {
    const result = await executeSqlPromise(
      db,
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('leads', 'customers');"
    );
    return result.rows.length === 2;
  } catch (error) {
    return false;
  }
}
