/**
 * Improved Database Migrations with Fallback
 * Handles cases where PRAGMA commands might not be immediately available
 */
import type { SQLiteDatabase } from './database';

/**
 * Get current database version with fallback mechanisms
 */
export async function getCurrentVersionSafe(
  db: SQLiteDatabase
): Promise<number> {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      console.log(
        `Getting database version, attempt ${attempts + 1}/${maxAttempts}`
      );

      return await new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('getCurrentVersion timeout'));
        }, 5000);

        db.transaction(
          (tx) => {
            tx.executeSql(
              'PRAGMA user_version',
              [],
              (_, result) => {
                clearTimeout(timeout);
                const version = result.rows.item(0).user_version;
                console.log('Current database version:', version);
                resolve(version);
              },
              (_, error) => {
                clearTimeout(timeout);
                reject(
                  new Error(`PRAGMA user_version failed: ${error.message}`)
                );
              }
            );
          },
          (error) => {
            clearTimeout(timeout);
            reject(
              new Error(`Version check transaction failed: ${error.message}`)
            );
          }
        );
      });
    } catch (error) {
      attempts++;
      console.warn(
        `Database version check attempt ${attempts} failed: ${error.message}`
      );

      if (attempts >= maxAttempts) {
        console.warn(
          'All version check attempts failed, assuming version 0 (fresh database)'
        );
        return 0; // Assume fresh database
      }

      // Wait before retry
      const delay = attempts * 2000; // 2s, 4s, 6s, 8s
      console.log(`Waiting ${delay}ms before version check retry...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return 0; // Fallback
}

/**
 * Run migrations with improved error handling
 */
export async function runMigrationsSafe(
  db: SQLiteDatabase,
  targetVersion: number
): Promise<void> {
  try {
    console.log('Starting safe migration process...');

    const currentVersion = await getCurrentVersionSafe(db);

    if (currentVersion === targetVersion) {
      console.log(`Database already at target version ${targetVersion}`);
      return;
    }

    if (currentVersion > targetVersion) {
      console.warn(
        `Database version ${currentVersion} is newer than target ${targetVersion}`
      );
      return;
    }

    console.log(
      `Migrating database from version ${currentVersion} to ${targetVersion}`
    );

    // Import the migration functions
    const { runMigrationStep } = await import('./migrations');

    // Run migrations sequentially with delays
    for (let version = currentVersion; version < targetVersion; version++) {
      console.log(`Running migration step: ${version} → ${version + 1}`);

      // Add delay between migration steps
      if (version > currentVersion) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await runMigrationStep(db, version, version + 1);
      console.log(`Migration step completed: ${version} → ${version + 1}`);
    }

    console.log('All migration steps completed successfully');
  } catch (error) {
    console.error('Safe migration process failed:', error);
    throw new Error(`Safe migration failed: ${error.message}`);
  }
}
