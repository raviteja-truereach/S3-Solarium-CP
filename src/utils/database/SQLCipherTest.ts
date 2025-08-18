/**
 * SQLCipher Integration Test
 * Verifies that react-native-sqlcipher-storage can be imported and basic functionality works
 */
import SQLiteStorage from 'react-native-sqlcipher-storage';

/**
 * Test basic SQLCipher functionality
 * Opens an encrypted database to verify the library works correctly
 */
export async function testSQLCipherIntegration(): Promise<boolean> {
  try {
    // Test database configuration
    const dbName = 'test_integration.db';
    const dbVersion = '1.0';
    const dbDisplayName = 'Test Integration DB';
    const dbSize = 200000;
    const password = 'test_password_123';

    // Attempt to open encrypted database
    const db = SQLiteStorage.openDatabase({
      name: dbName,
      version: dbVersion,
      displayName: dbDisplayName,
      size: dbSize,
      password,
    });

    // Test basic SQL execution
    return new Promise((resolve) => {
      db.transaction((tx) => {
        // Create a simple test table
        tx.executeSql(
          'CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT)',
          [],
          () => {
            console.log(
              'SQLCipher integration test: SUCCESS - Database opened and table created'
            );
            resolve(true);
          },
          (error) => {
            console.error(
              'SQLCipher integration test: FAILED - SQL execution error:',
              error
            );
            resolve(false);
          }
        );
      });
    });
  } catch (error) {
    console.error(
      'SQLCipher integration test: FAILED - Library import or database open error:',
      error
    );
    return false;
  }
}
