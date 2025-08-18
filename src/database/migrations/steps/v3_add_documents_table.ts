/**
 * Database Migration v3: Add Documents Table
 * Adds documents table for document metadata persistence and offline viewing
 */
import type { SQLiteDatabase } from 'react-native-sqlite-storage';
import { executeSqlPromise } from '../../utils/sqliteHelpers';

// ✅ V3-SPECIFIC SCHEMA (without customer_id)
const CREATE_DOCUMENTS_TABLE_V3 = `
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    status TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT CHECK(sync_status IN ('synced', 'pending', 'failed')) DEFAULT 'synced',
    local_changes TEXT DEFAULT '{}',
    FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE
  );
`;

// ✅ V3-SPECIFIC INDEXES (only for columns that exist in v3)
const CREATE_DOCUMENTS_INDEXES_V3 = [
  'CREATE INDEX IF NOT EXISTS idx_documents_lead_id ON documents(lead_id);',
  'CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);',
  'CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);',
  'CREATE INDEX IF NOT EXISTS idx_documents_sync_status ON documents(sync_status);',
  'CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);',
];

export async function migrateTo3_addDocumentsTable(
  db: SQLiteDatabase
): Promise<void> {
  console.log('🔄 Running migration v3: Add documents table...');

  try {
    // Create documents table with v3 schema (no customer_id yet)
    await executeSqlPromise(db, CREATE_DOCUMENTS_TABLE_V3);
    console.log('✅ Created documents table');

    // Create only v3-compatible indexes
    for (const indexStatement of CREATE_DOCUMENTS_INDEXES_V3) {
      await executeSqlPromise(db, indexStatement);
      console.log(`✅ Created index: ${indexStatement.match(/idx_\w+/)?.[0]}`);
    }

    console.log('✅ Migration v3 completed successfully');
  } catch (error) {
    console.error('❌ Migration v3 failed:', error);
    throw error;
  }
}

export async function validateV3Migration(
  db: SQLiteDatabase
): Promise<boolean> {
  try {
    console.log('🔍 Validating v3 migration...');

    // Check if documents table exists
    const result = await executeSqlPromise(
      db,
      `
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='documents';
    `
    );

    if (result.rows.length === 0) {
      console.error('❌ Documents table not found');
      return false;
    }

    // Check if v3 required columns exist (NOT including customer_id)
    const columnsResult = await executeSqlPromise(
      db,
      'PRAGMA table_info(documents);'
    );
    const columns = [];

    for (let i = 0; i < columnsResult.rows.length; i++) {
      columns.push(columnsResult.rows.item(i).name);
    }

    // V3 required columns (customer_id should NOT be present yet)
    const requiredV3Columns = [
      'id',
      'lead_id',
      'doc_type',
      'status',
      'uploaded_at',
      'uploaded_by',
      'created_at',
      'updated_at',
      'sync_status',
      'local_changes',
    ];

    for (const column of requiredV3Columns) {
      if (!columns.includes(column)) {
        console.error(`❌ Required v3 column '${column}' not found`);
        return false;
      }
    }

    // Ensure customer_id is NOT present in v3 (should be added in v4)
    if (columns.includes('customer_id')) {
      console.warn(
        '⚠️ customer_id column found in v3 - this should be added in v4'
      );
    }

    // Check if v3 indexes exist
    const indexResult = await executeSqlPromise(
      db,
      `
      SELECT name FROM sqlite_master
      WHERE type='index' AND tbl_name='documents';
    `
    );

    const expectedV3Indexes = [
      'idx_documents_lead_id',
      'idx_documents_status',
      'idx_documents_uploaded_at',
      'idx_documents_sync_status',
      'idx_documents_doc_type',
    ];

    for (const expectedIndex of expectedV3Indexes) {
      let found = false;
      for (let i = 0; i < indexResult.rows.length; i++) {
        if (indexResult.rows.item(i).name === expectedIndex) {
          found = true;
          break;
        }
      }
      if (!found) {
        console.warn(`⚠️ V3 Index '${expectedIndex}' not found`);
      }
    }

    console.log('✅ Migration v3 validation passed');
    return true;
  } catch (error) {
    console.error('❌ Migration v3 validation failed:', error);
    return false;
  }
}
