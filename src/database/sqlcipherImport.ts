/**
 * SQLCipher Import Helper
 * Handles different import patterns for react-native-sqlcipher-storage2
 */

import SQLiteStorage from 'react-native-sqlite-storage';

// Enable debugging and promises
SQLiteStorage.DEBUG(true);
SQLiteStorage.enablePromise(true);

export default SQLiteStorage;
