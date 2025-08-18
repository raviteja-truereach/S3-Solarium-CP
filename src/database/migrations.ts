/**
 * Database Migrations
 * Handles schema version upgrades
 */
import type { SQLiteDatabase } from 'react-native-sqlite-storage';
import { CURRENT_SCHEMA_VERSION } from './schema';
import {
  migrateTo2_addPageNumber,
  validateV2Migration,
} from './migrations/steps/v2_add_page_to_leads';
import {
  migrateTo3_addDocumentsTable,
  validateV3Migration,
} from './migrations/steps/v3_add_documents_table';
import {
  migrateTo4_enhanceCustomerAndDocuments,
  validateV4Migration,
} from './migrations/steps/v4_enhance_customer_and_documents';
import { executeSqlPromise } from './utils/sqliteHelpers';
import {
  migrateTo5_fixDocumentsConstraints,
  validateV5Migration,
} from './migrations/steps/v5_fix_documents_constraints';
import {
  migrateTo6_addCommissionsTable,
  validateV6Migration,
} from './migrations/steps/v6_add_commissions_table';
import {
  migrateTo1_createInitialTables,
  validateV1Migration,
} from './migrations/steps/v1_create_initial_tables';

/**
 * Migration step interface
 */
interface MigrationStep {
  version: number;
  description: string;
  migrate: (db: SQLiteDatabase) => Promise<void>;
  validate?: (db: SQLiteDatabase) => Promise<boolean>;
}

/**
 * All migration steps in order
 */
const MIGRATION_STEPS: MigrationStep[] = [
  {
    version: 1,
    description: 'Create initial database tables (leads, customers)',
    migrate: migrateTo1_createInitialTables,
    validate: validateV1Migration,
  },
  {
    version: 2,
    description: 'Add page_number column to leads table for pagination support',
    migrate: migrateTo2_addPageNumber,
    validate: validateV2Migration,
  },
  {
    version: 3,
    description:
      'Add documents table for document metadata persistence and offline viewing',
    migrate: migrateTo3_addDocumentsTable,
    validate: validateV3Migration,
  },
  {
    version: 4,
    description:
      'Enhance customers table with KYC fields and add customer documents support',
    migrate: migrateTo4_enhanceCustomerAndDocuments,
    validate: validateV4Migration,
  },
  {
    version: 5,
    description: 'Fix documents table constraints to allow KYC documents',
    migrate: migrateTo5_fixDocumentsConstraints,
    validate: validateV5Migration,
  },
  {
    version: 6,
    description:
      'Add commissions table with performance indexes for commission/earnings tracking',
    migrate: migrateTo6_addCommissionsTable,
    validate: validateV6Migration,
  },
];

/**
 * Get current schema version from database
 * @param db - SQLite database instance
 * @returns Promise<number> - Current schema version
 */
export async function getCurrentSchemaVersion(
  db: SQLiteDatabase
): Promise<number> {
  try {
    const result = await executeSqlPromise(db, 'PRAGMA user_version;');
    return result.rows.item(0).user_version;
  } catch (error) {
    console.error('Error getting schema version:', error);
    return 0;
  }
}

/**
 * Set schema version in database
 * @param db - SQLite database instance
 * @param version - Version number to set
 */
export async function setSchemaVersion(
  db: SQLiteDatabase,
  version: number
): Promise<void> {
  await executeSqlPromise(db, `PRAGMA user_version = ${version};`);
}

/**
 * Run all pending migrations
 * @param db - SQLite database instance
 * @returns Promise<void>
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const currentVersion = await getCurrentSchemaVersion(db);

  console.log(
    `🔍 Database schema version: ${currentVersion} (target: ${CURRENT_SCHEMA_VERSION})`
  );

  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    console.log('✅ Database schema is up to date');
    return;
  }

  console.log(
    `🔄 Running migrations from v${currentVersion} to v${CURRENT_SCHEMA_VERSION}`
  );

  // Find migrations to run
  const migrationsToRun = MIGRATION_STEPS.filter(
    (step) =>
      step.version > currentVersion && step.version <= CURRENT_SCHEMA_VERSION
  ).sort((a, b) => a.version - b.version);

  if (migrationsToRun.length === 0) {
    console.log('⚠️ No migrations found to run');
    return;
  }

  console.log(
    `📋 Found ${migrationsToRun.length} migration(s) to run:`,
    migrationsToRun.map((m) => `v${m.version}: ${m.description}`)
  );

  // Run each migration
  for (const migration of migrationsToRun) {
    console.log(
      `🔄 Running migration v${migration.version}: ${migration.description}`
    );

    const startTime = Date.now();

    try {
      await migration.migrate(db);

      // Validate migration if validator provided
      if (migration.validate) {
        const isValid = await migration.validate(db);
        if (!isValid) {
          throw new Error(`Migration v${migration.version} validation failed`);
        }
      }

      // Update schema version
      await setSchemaVersion(db, migration.version);

      const duration = Date.now() - startTime;
      console.log(
        `✅ Migration v${migration.version} completed in ${duration}ms`
      );
    } catch (error) {
      console.error(`❌ Migration v${migration.version} failed:`, error);
      throw new Error(`Migration v${migration.version} failed: ${error}`);
    }
  }

  console.log(
    `✅ All migrations completed successfully. Database is now at v${CURRENT_SCHEMA_VERSION}`
  );
}

/**
 * Check if migrations are needed
 * @param db - SQLite database instance
 * @returns Promise<boolean>
 */
export async function needsMigrations(db: SQLiteDatabase): Promise<boolean> {
  const currentVersion = await getCurrentSchemaVersion(db);
  return currentVersion < CURRENT_SCHEMA_VERSION;
}

/**
 * Get pending migrations info
 * @param db - SQLite database instance
 * @returns Promise<MigrationStep[]>
 */
export async function getPendingMigrations(
  db: SQLiteDatabase
): Promise<MigrationStep[]> {
  const currentVersion = await getCurrentSchemaVersion(db);

  return MIGRATION_STEPS.filter(
    (step) =>
      step.version > currentVersion && step.version <= CURRENT_SCHEMA_VERSION
  ).sort((a, b) => a.version - b.version);
}

/**
 * Legacy migration support - for backwards compatibility
 * This can be removed in future versions
 */
export async function runLegacyMigrations(db: SQLiteDatabase): Promise<void> {
  console.log('🔄 Running legacy migration compatibility check');

  // Check if this is a completely new database
  const currentVersion = await getCurrentSchemaVersion(db);
  if (currentVersion === 0) {
    console.log('📝 New database detected, setting initial schema version');
    await setSchemaVersion(db, CURRENT_SCHEMA_VERSION);
    return;
  }

  // Run standard migrations
  await runMigrations(db);
}
