/**
 * Simple Database Test
 * Tests each step of database initialization
 */
import { getDbKey } from '../utils/secureStorage/SQLiteKeyHelper';
import SQLiteStorage from 'react-native-sqlcipher-storage';

export async function testDatabaseSteps(): Promise<void> {
  console.log('=== DATABASE STEP TEST START ===');

  try {
    // Step 1: Test key generation
    console.log('Step 1: Testing key generation...');
    const key = await getDbKey();
    console.log(`Step 1 SUCCESS: Key length ${key.length}`);

    // Step 2: Test SQLCipher library
    console.log('Step 2: Testing SQLCipher library...');
    const testConfig = {
      name: 'test_connection.db',
      version: '1.0',
      displayName: 'Test DB',
      size: 200000,
      password: key,
    };

    console.log('Step 2a: Opening test database...');
    const testDb = SQLiteStorage.openDatabase(testConfig);
    console.log('Step 2 SUCCESS: Database opened');

    // Step 3: Test basic SQL execution
    console.log('Step 3: Testing SQL execution...');
    await new Promise((resolve, reject) => {
      testDb.transaction((tx) => {
        tx.executeSql(
          'SELECT 1 as test',
          [],
          (_, result) => {
            console.log(
              'Step 3 SUCCESS: SQL executed, result:',
              result.rows.item(0)
            );
            resolve(result);
          },
          (_, error) => {
            console.error('Step 3 FAILED: SQL error:', error);
            reject(error);
          }
        );
      });
    });

    console.log('=== DATABASE STEP TEST SUCCESS ===');
  } catch (error) {
    console.error('=== DATABASE STEP TEST FAILED ===');
    console.error('Error details:', error);
    throw error;
  }
}
