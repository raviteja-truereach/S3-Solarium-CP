/**
 * Test SQLCipher Library Integration
 */
export async function testSQLCipherLibrary(): Promise<void> {
  console.log('=== TESTING SQLCIPHER LIBRARY ===');

  try {
    // Test 1: Import the library
    console.log('Test 1: Importing SQLCipher library...');
    const SQLiteStorage = require('react-native-sqlcipher-storage');
    console.log(
      'Test 1 SUCCESS: Library imported, type:',
      typeof SQLiteStorage
    );
    console.log(
      'Test 1: Available methods:',
      Object.keys(SQLiteStorage.default || SQLiteStorage)
    );

    // Test 2: Check if openDatabase method exists
    console.log('Test 2: Checking openDatabase method...');
    const openDb =
      SQLiteStorage.default?.openDatabase || SQLiteStorage.openDatabase;
    console.log('Test 2: openDatabase method type:', typeof openDb);

    if (typeof openDb !== 'function') {
      throw new Error('openDatabase method not found');
    }

    // Test 3: Try opening database with different API styles
    console.log('Test 3: Testing different API formats...');

    const testConfigs = [
      // Format 1: Standard format
      {
        name: 'test1.db',
        password: 'testpass123',
      },
      // Format 2: With version
      {
        name: 'test2.db',
        version: '1.0',
        password: 'testpass123',
      },
      // Format 3: Full config
      {
        name: 'test3.db',
        version: '1.0',
        displayName: 'Test DB',
        size: 200000,
        password: 'testpass123',
      },
    ];

    for (let i = 0; i < testConfigs.length; i++) {
      try {
        console.log(`Test 3.${i + 1}: Trying config:`, {
          ...testConfigs[i],
          password: '[hidden]',
        });

        const testDb = openDb(testConfigs[i]);
        console.log(
          `Test 3.${i + 1} SUCCESS: Database opened, type:`,
          typeof testDb
        );

        if (testDb) {
          console.log('Test 3: Database methods:', Object.keys(testDb));
          return; // Success with this format
        }
      } catch (error) {
        console.warn(`Test 3.${i + 1} FAILED:`, error.message);
      }
    }

    throw new Error('All database configuration formats failed');
  } catch (error) {
    console.error('=== SQLCIPHER LIBRARY TEST FAILED ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}
