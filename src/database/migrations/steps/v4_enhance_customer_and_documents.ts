/**
 * Migration v4: Enhance Customer table and Documents table for KYC support
 * - Add missing customer fields: city, state, pincode, kyc_status
 * - Add customer_id to documents table for KYC documents
 * - Add performance indexes for search operations
 */
import type { SQLiteDatabase } from 'react-native-sqlite-storage';
import { executeSqlPromise } from '../../utils/sqliteHelpers';

/**
 * Execute migration to v4
 */
export async function migrateTo4_enhanceCustomerAndDocuments(
  db: SQLiteDatabase
): Promise<void> {
  console.log('🔄 Running migration v4: Enhance Customer and Documents tables');

  try {
    // Begin transaction
    await db.executeSql('BEGIN TRANSACTION;');

    // 1. Add missing fields to customers table
    console.log('📋 Adding missing fields to customers table...');

    const customerAlterQueries = [
      'ALTER TABLE customers ADD COLUMN city TEXT;',
      'ALTER TABLE customers ADD COLUMN state TEXT;',
      'ALTER TABLE customers ADD COLUMN pincode TEXT;',
      "ALTER TABLE customers ADD COLUMN kyc_status TEXT CHECK(kyc_status IN ('pending', 'submitted', 'approved', 'rejected')) DEFAULT 'pending';",
    ];

    for (const query of customerAlterQueries) {
      try {
        await db.executeSql(query);
        console.log(`✅ Executed: ${query}`);
      } catch (error: any) {
        // Ignore "duplicate column name" errors (column already exists)
        if (!error.message?.includes('duplicate column name')) {
          throw error;
        }
        console.log(`⏭️  Skipped (column exists): ${query}`);
      }
    }

    // 2. Add customer_id to documents table for KYC documents
    console.log('📋 Adding customer_id to documents table...');

    try {
      await db.executeSql('ALTER TABLE documents ADD COLUMN customer_id TEXT;');
      console.log('✅ Added customer_id column to documents table');
    } catch (error: any) {
      if (!error.message?.includes('duplicate column name')) {
        throw error;
      }
      console.log('⏭️  Skipped (customer_id column already exists)');
    }

    // 3. Add performance indexes for customer searches
    console.log('📋 Adding performance indexes...');

    const indexQueries = [
      // Customer search indexes
      'CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);',
      'CREATE INDEX IF NOT EXISTS idx_customers_state ON customers(state);',
      'CREATE INDEX IF NOT EXISTS idx_customers_kyc_status ON customers(kyc_status);',
      'CREATE INDEX IF NOT EXISTS idx_customers_name_search ON customers(name COLLATE NOCASE);',
      'CREATE INDEX IF NOT EXISTS idx_customers_phone_search ON customers(phone);',
      'CREATE INDEX IF NOT EXISTS idx_customers_email_search ON customers(email COLLATE NOCASE);',

      // Document customer relationship index
      'CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON documents(customer_id);',

      // Composite indexes for common queries
      'CREATE INDEX IF NOT EXISTS idx_customers_kyc_city ON customers(kyc_status, city);',
      'CREATE INDEX IF NOT EXISTS idx_customers_kyc_state ON customers(kyc_status, state);',
    ];

    for (const indexQuery of indexQueries) {
      await db.executeSql(indexQuery);
      console.log(`✅ Created index: ${indexQuery.split(' ')[5]}`);
    }

    // 4. Update existing customers to have default kyc_status
    console.log('📋 Setting default kyc_status for existing customers...');
    await db.executeSql(
      "UPDATE customers SET kyc_status = 'pending' WHERE kyc_status IS NULL;"
    );
    console.log('✅ Updated existing customers with default kyc_status');

    // Commit transaction
    await db.executeSql('COMMIT;');
    console.log('✅ Migration v4 completed successfully');
  } catch (error) {
    console.error('❌ Migration v4 failed:', error);
    try {
      await db.executeSql('ROLLBACK;');
      console.log('↩️  Transaction rolled back');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError);
    }
    throw error;
  }
}

/**
 * Validate migration v4
 */
/**
 * Validate migration v4 - FIXED VERSION
 */
export async function validateV4Migration(
  db: SQLiteDatabase
): Promise<boolean> {
  console.log('🔍 Validating migration v4...');

  try {
    // ✅ FIXED: Use executeSqlPromise instead of destructuring
    // Check if customers table has all required columns
    const customerTableInfo = await executeSqlPromise(
      db,
      'PRAGMA table_info(customers);'
    );
    const customerColumns = [];
    for (let i = 0; i < customerTableInfo.rows.length; i++) {
      customerColumns.push(customerTableInfo.rows.item(i).name);
    }

    const requiredCustomerColumns = ['city', 'state', 'pincode', 'kyc_status'];
    const missingCustomerColumns = requiredCustomerColumns.filter(
      (col) => !customerColumns.includes(col)
    );

    if (missingCustomerColumns.length > 0) {
      console.error('❌ Missing customer columns:', missingCustomerColumns);
      return false;
    }

    // ✅ FIXED: Check if documents table has customer_id column
    const documentsTableInfo = await executeSqlPromise(
      db,
      'PRAGMA table_info(documents);'
    );
    const documentColumns = [];
    for (let i = 0; i < documentsTableInfo.rows.length; i++) {
      documentColumns.push(documentsTableInfo.rows.item(i).name);
    }

    if (!documentColumns.includes('customer_id')) {
      console.error('❌ Missing customer_id column in documents table');
      return false;
    }

    // ✅ FIXED: Check if key indexes exist
    const indexResult = await executeSqlPromise(
      db,
      "SELECT name FROM sqlite_master WHERE type='index' AND (name LIKE 'idx_customers_%' OR name LIKE 'idx_documents_customer_%');"
    );

    const indexCount = indexResult.rows.length;
    console.log(`✅ Found ${indexCount} customer/document indexes`);

    // Verify at least some key indexes exist
    if (indexCount < 5) {
      console.error('❌ Missing some required indexes');
      return false;
    }

    console.log('✅ Migration v4 validation successful');
    return true;
  } catch (error) {
    console.error('❌ Migration v4 validation failed:', error);
    return false;
  }
}
