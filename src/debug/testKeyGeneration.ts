/**
 * Debug script to test key generation
 */
import { getDbKey } from '../utils/secureStorage/SQLiteKeyHelper';

export async function testKeyGeneration() {
  try {
    console.log('=== Testing SQLite Key Generation ===');

    const key = await getDbKey();
    console.log('Key generated successfully!');
    console.log('Key length:', key.length);
    console.log('Key format valid:', /^[0-9a-f]+$/i.test(key));

    return true;
  } catch (error) {
    console.error('Key generation test failed:', error);
    return false;
  }
}
