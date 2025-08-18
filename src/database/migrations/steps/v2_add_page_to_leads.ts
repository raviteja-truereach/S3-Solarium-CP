/**
 * Migration Step: v1 → v2
 * Add page_number column to leads table for pagination support
 */
import type { SQLiteDatabase } from 'react-native-sqlite-storage';
import { executeSqlPromise } from '../../utils/sqliteHelpers';

/**
 * Migration to add page_number column to leads table
 * @param db - SQLite database instance
 * @returns Promise<void>
 */
export async function migrateTo2_addPageNumber(
  db: SQLiteDatabase
): Promise<void> {
  console.log(
    '🔄 Starting migration v1 → v2: Adding page_number to leads table'
  );

  try {
    await executeSqlPromise(db, 'BEGIN TRANSACTION;');

    // Check if page_number column already exists
    const tableInfo = await executeSqlPromise(db, 'PRAGMA table_info(leads);');
    const columns = tableInfo.rows.raw();
    const hasPageNumberColumn = columns.some(
      (col: any) => col.name === 'page_number'
    );

    if (hasPageNumberColumn) {
      console.log(
        '⚠️ page_number column already exists, migration already applied'
      );
      await executeSqlPromise(db, 'COMMIT;');
      return;
    }

    // Add page_number column
    await executeSqlPromise(
      db,
      `ALTER TABLE leads ADD COLUMN page_number INTEGER DEFAULT 1;`
    );

    // Back-fill existing records
    const updateResult = await executeSqlPromise(
      db,
      `UPDATE leads SET page_number = 1 WHERE page_number IS NULL;`
    );
    console.log(
      `📊 Updated ${updateResult.rowsAffected} existing lead records`
    );

    // Create indexes
    await executeSqlPromise(
      db,
      `CREATE INDEX IF NOT EXISTS idx_leads_page_number ON leads(page_number);`
    );
    await executeSqlPromise(
      db,
      `CREATE INDEX IF NOT EXISTS idx_leads_page_status ON leads(page_number, status);`
    );

    // Verify migration
    const verifyResult = await executeSqlPromise(
      db,
      `
      SELECT COUNT(*) as total_leads,
             COUNT(page_number) as leads_with_page,
             MIN(page_number) as min_page,
             MAX(page_number) as max_page
      FROM leads;
    `
    );

    const stats = verifyResult.rows.item(0);
    if (stats.total_leads !== stats.leads_with_page) {
      throw new Error(
        `Migration incomplete: ${stats.total_leads} total leads but only ${stats.leads_with_page} have page_number`
      );
    }

    await executeSqlPromise(db, 'COMMIT;');
    console.log('✅ Migration v1 → v2 completed successfully');
  } catch (error) {
    console.error('❌ Migration v1 → v2 failed:', error);
    try {
      await executeSqlPromise(db, 'ROLLBACK;');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError);
    }
    throw error;
  }
}

/**
 * Validation function to check if migration was successful
 * @param db - SQLite database instance
 * @returns Promise<boolean>
 */
export async function validateV2Migration(
  db: SQLiteDatabase
): Promise<boolean> {
  try {
    const tableInfo = await executeSqlPromise(db, 'PRAGMA table_info(leads);');
    const columns = tableInfo.rows.raw();
    const hasPageNumberColumn = columns.some(
      (col: any) => col.name === 'page_number'
    );

    if (!hasPageNumberColumn) {
      console.error(
        '❌ Migration validation failed: page_number column missing'
      );
      return false;
    }

    const indexInfo = await executeSqlPromise(
      db,
      `SELECT name FROM sqlite_master WHERE type='index' AND name='idx_leads_page_number';`
    );
    if (indexInfo.rows.length === 0) {
      console.error(
        '❌ Migration validation failed: page_number index missing'
      );
      return false;
    }

    const countResult = await executeSqlPromise(
      db,
      `SELECT COUNT(*) as total, COUNT(page_number) as with_page_number FROM leads;`
    );
    const counts = countResult.rows.item(0);
    if (counts.total !== counts.with_page_number) {
      console.error(
        '❌ Migration validation failed: Some leads missing page_number'
      );
      return false;
    }

    console.log('✅ Migration v2 validation successful');
    return true;
  } catch (error) {
    console.error('❌ Migration validation error:', error);
    return false;
  }
}
