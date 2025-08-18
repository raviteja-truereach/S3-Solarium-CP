/**
 * SQLite Key Generation Integration Test
 * Tests actual key generation and storage functionality
 */
import {
  getDbKey,
  resetDbKey,
  hasDbKey,
} from '../../src/utils/secureStorage/SQLiteKeyHelper';

describe('SQLite Key Generation Integration', () => {
  it('should generate and store encryption key', async () => {
    // Clear any existing key
    await resetDbKey();

    // Should not have key initially
    expect(await hasDbKey()).toBe(false);

    // Generate key
    const key = await getDbKey();

    // Verify key properties
    expect(key).toHaveLength(128);
    expect(/^[0-9a-f]+$/i.test(key)).toBe(true);

    // Should now have key
    expect(await hasDbKey()).toBe(true);

    // Should return same key on subsequent calls
    const key2 = await getDbKey();
    expect(key2).toBe(key);

    // Clean up
    await resetDbKey();
  });
});
