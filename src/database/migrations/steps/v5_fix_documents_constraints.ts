/**
 * Migration v5: Fix Documents Table Constraints
 * Make lead_id nullable for KYC documents
 */
import type { SQLiteDatabase } from 'react-native-sqlite-storage';
import { executeSqlPromise } from '../../utils/sqliteHelpers';

export async function migrateTo5_fixDocumentsConstraints(
  db: SQLiteDatabase
): Promise<void> {
  console.log('🔄 Running migration v5: Fix documents table constraints');

  try {
    await executeSqlPromise(db, 'BEGIN TRANSACTION;');

    // Check if documents table exists first
    const tableCheck = await executeSqlPromise(
      db,
      "SELECT name FROM sqlite_master WHERE type='table' AND name='documents';"
    );

    if (tableCheck.rows.length === 0) {
      console.log('⚠️ Documents table does not exist, creating it first...');
      
      // Create documents table (same as v3 migration)
      await executeSqlPromise(
        db,
        `
        CREATE TABLE documents (
          id TEXT PRIMARY KEY,
          lead_id TEXT,
          customer_id TEXT,
          doc_type TEXT NOT NULL,
          status TEXT NOT NULL,
          uploaded_at TEXT NOT NULL,
          uploaded_by TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          sync_status TEXT CHECK(sync_status IN ('synced', 'pending', 'failed')) DEFAULT 'synced',
          local_changes TEXT DEFAULT '{}',
          CHECK ((lead_id IS NOT NULL AND customer_id IS NULL) OR (lead_id IS NULL AND customer_id IS NOT NULL)),
          FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE,
          FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
        );
        `
      );

      // Create indexes
      const indexQueries = [
        'CREATE INDEX IF NOT EXISTS idx_documents_lead_id ON documents(lead_id);',
        'CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON documents(customer_id);',
        'CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);',
        'CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);',
        'CREATE INDEX IF NOT EXISTS idx_documents_sync_status ON documents(sync_status);',
        'CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);',
      ];

      for (const indexQuery of indexQueries) {
        await executeSqlPromise(db, indexQuery);
      }

      console.log('✅ Created documents table with correct constraints');
    } else {
      console.log('📋 Documents table exists, updating constraints...');
      
      // Original logic: rename and recreate
      await executeSqlPromise(
        db,
        'ALTER TABLE documents RENAME TO documents_old;'
      );

      await executeSqlPromise(
        db,
        `
        CREATE TABLE documents (
          id TEXT PRIMARY KEY,
          lead_id TEXT,
          customer_id TEXT,
          doc_type TEXT NOT NULL,
          status TEXT NOT NULL,
          uploaded_at TEXT NOT NULL,
          uploaded_by TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          sync_status TEXT CHECK(sync_status IN ('synced', 'pending', 'failed')) DEFAULT 'synced',
          local_changes TEXT DEFAULT '{}',
          CHECK ((lead_id IS NOT NULL AND customer_id IS NULL) OR (lead_id IS NULL AND customer_id IS NOT NULL)),
          FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE,
          FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
        );
        `
      );

      // Copy data from old table
      await executeSqlPromise(
        db,
        `
        INSERT INTO documents (
          id, lead_id, customer_id, doc_type, status, uploaded_at, uploaded_by,
          created_at, updated_at, sync_status, local_changes
        )
        SELECT
          id, lead_id, customer_id, doc_type, status, uploaded_at, uploaded_by,
          created_at, updated_at, sync_status, local_changes
        FROM documents_old;
        `
      );

      await executeSqlPromise(db, 'DROP TABLE documents_old;');

      // Recreate indexes
      const indexQueries = [
        'CREATE INDEX IF NOT EXISTS idx_documents_lead_id ON documents(lead_id);',
        'CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON documents(customer_id);',
        'CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);',
        'CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);',
        'CREATE INDEX IF NOT EXISTS idx_documents_sync_status ON documents(sync_status);',
        'CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);',
      ];

      for (const indexQuery of indexQueries) {
        await executeSqlPromise(db, indexQuery);
      }

      console.log('✅ Updated documents table constraints');
    }

    await executeSqlPromise(db, 'COMMIT;');
    console.log('✅ Migration v5 completed successfully');
  } catch (error) {
    console.error('❌ Migration v5 failed:', error);
    try {
      await executeSqlPromise(db, 'ROLLBACK;');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError);
    }
    throw error;
  }
}

export async function validateV5Migration(
  db: SQLiteDatabase
): Promise<boolean> {
  try {
    // Check that lead_id is now nullable
    const tableInfo = await executeSqlPromise(
      db,
      'PRAGMA table_info(documents);'
    );
    const columns = [];
    for (let i = 0; i < tableInfo.rows.length; i++) {
      columns.push(tableInfo.rows.item(i));
    }

    const leadIdColumn = columns.find((col) => col.name === 'lead_id');
    const customerIdColumn = columns.find((col) => col.name === 'customer_id');

    if (!leadIdColumn || !customerIdColumn) {
      console.error('❌ Missing required columns');
      return false;
    }

    if (leadIdColumn.notnull === 1) {
      console.error('❌ lead_id is still NOT NULL');
      return false;
    }

    if (customerIdColumn.notnull === 1) {
      console.error('❌ customer_id should allow NULL');
      return false;
    }

    console.log('✅ Migration v5 validation successful');
    return true;
  } catch (error) {
    console.error('❌ Migration v5 validation failed:', error);
    return false;
  }
}
