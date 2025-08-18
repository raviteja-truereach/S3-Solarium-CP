/**
 * Migration v6: Add Commissions table
 * - Create commissions table with proper schema and indexes
 * - Add performance indexes for date filtering and status queries
 * - Follow existing sync_status pattern for offline support
 */
import type { SQLiteDatabase } from 'react-native-sqlite-storage';
import { executeSqlPromise } from '../../utils/sqliteHelpers';

/**
 * Execute migration to v6
 */
export async function migrateTo6_addCommissionsTable(
  db: SQLiteDatabase
): Promise<void> {
  console.log('🔄 Running migration v6: Add commissions table');

  try {
    // Begin transaction
    await executeSqlPromise(db, 'BEGIN TRANSACTION;');

    // 1. Create commissions table
    console.log('📋 Creating commissions table...');

    const createTableQuery = `
      CREATE TABLE commissions (
        id TEXT PRIMARY KEY,
        cp_id TEXT NOT NULL,
        lead_id TEXT,
        customer_id TEXT,
        amount REAL NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'paid', 'approved', 'cancelled', 'processing')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        payment_date TEXT,
        description TEXT,
        sync_status TEXT CHECK(sync_status IN ('synced', 'pending', 'failed')) DEFAULT 'synced',
        local_changes TEXT DEFAULT '{}',
        FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE SET NULL,
        FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL
      );
    `;

    await executeSqlPromise(db, createTableQuery);
    console.log('✅ Created commissions table successfully');

    // 2. Add performance indexes
    console.log('📋 Adding performance indexes...');

    const indexQueries = [
      // Primary indexes for common queries
      'CREATE INDEX IF NOT EXISTS idx_commissions_cp_id ON commissions(cp_id);',
      'CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);',
      'CREATE INDEX IF NOT EXISTS idx_commissions_created_at ON commissions(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_commissions_lead_id ON commissions(lead_id);',
      'CREATE INDEX IF NOT EXISTS idx_commissions_customer_id ON commissions(customer_id);',
      'CREATE INDEX IF NOT EXISTS idx_commissions_sync_status ON commissions(sync_status);',

      // Compound indexes for filtered queries (as specified in requirements)
      'CREATE INDEX IF NOT EXISTS idx_commissions_cp_status ON commissions(cp_id, status);',
      'CREATE INDEX IF NOT EXISTS idx_commissions_date_status ON commissions(created_at, status);',
      'CREATE INDEX IF NOT EXISTS idx_commissions_cp_date ON commissions(cp_id, created_at);',

      // Performance index for date range filtering (as specified in requirements)
      'CREATE INDEX IF NOT EXISTS idx_commissions_created_at_desc ON commissions(created_at DESC);',
    ];

    for (const indexQuery of indexQueries) {
      await executeSqlPromise(db, indexQuery);
      console.log(`✅ Created index: ${indexQuery.split(' ')[5]}`);
    }

    // 3. Add sample data for testing (optional - remove in production)
    console.log('📋 Adding sample commission data...');

    const sampleData = [
      {
        id: 'COMM-SAMPLE-001',
        cp_id: 'CP-001',
        lead_id: 'LEAD-001',
        amount: 25000,
        status: 'approved',
        created_at: '2024-01-15T10:30:00.000Z',
        updated_at: '2024-01-15T10:30:00.000Z',
      },
      {
        id: 'COMM-SAMPLE-002',
        cp_id: 'CP-001',
        lead_id: 'LEAD-002',
        amount: 18000,
        status: 'pending',
        created_at: '2024-01-20T14:15:00.000Z',
        updated_at: '2024-01-20T14:15:00.000Z',
      },
    ];

    for (const commission of sampleData) {
      await executeSqlPromise(
        db,
        `
        INSERT OR IGNORE INTO commissions (
          id, cp_id, lead_id, amount, status, created_at, updated_at, sync_status, local_changes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', '{}');
        `,
        [
          commission.id,
          commission.cp_id,
          commission.lead_id,
          commission.amount,
          commission.status,
          commission.created_at,
          commission.updated_at,
        ]
      );
    }

    console.log('✅ Added sample commission data');

    // Commit transaction
    await executeSqlPromise(db, 'COMMIT;');
    console.log('✅ Migration v6 completed successfully');
  } catch (error) {
    console.error('❌ Migration v6 failed:', error);
    try {
      await executeSqlPromise(db, 'ROLLBACK;');
      console.log('↩️ Transaction rolled back');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError);
    }
    throw error;
  }
}

export async function validateV6Migration(
  db: SQLiteDatabase
): Promise<boolean> {
  console.log('🔍 Validating migration v6...');

  try {
    // Debug: Check if table exists at all
    const tableExists = await executeSqlPromise(
      db,
      "SELECT name FROM sqlite_master WHERE type='table' AND name='commissions';"
    );
    console.log('🔍 Table exists check:', tableExists.rows.length);

    // Debug: List all tables
    const allTables = await executeSqlPromise(
      db,
      "SELECT name FROM sqlite_master WHERE type='table';"
    );
    const tableNames = [];
    for (let i = 0; i < allTables.rows.length; i++) {
      tableNames.push(allTables.rows.item(i).name);
    }
    console.log('🔍 All tables:', tableNames);

    // Check if commissions table has all required columns
    const tableInfo = await executeSqlPromise(
      db,
      'PRAGMA table_info(commissions);'
    );
    console.log('🔍 Table info rows:', tableInfo.rows.length);

    const columns = [];
    for (let i = 0; i < tableInfo.rows.length; i++) {
      const col = tableInfo.rows.item(i);
      columns.push(col.name);
      console.log(`🔍 Column ${i}:`, col.name, col.type);
    }

    const requiredColumns = [
      'id',
      'cp_id',
      'lead_id',
      'customer_id',
      'amount',
      'status',
      'created_at',
      'updated_at',
      'payment_date',
      'description',
      'sync_status',
      'local_changes',
    ];

    const missingColumns = requiredColumns.filter(
      (col) => !columns.includes(col)
    );

    console.log('🔍 Found columns:', columns);
    console.log('🔍 Required columns:', requiredColumns);
    console.log('🔍 Missing columns:', missingColumns);

    if (missingColumns.length > 0) {
      console.error('❌ Missing commission columns:', missingColumns);
      return false;
    }

    console.log('✅ Migration v6 validation successful');
    return true;
  } catch (error) {
    console.error('❌ Migration v6 validation failed:', error);
    return false;
  }
}
