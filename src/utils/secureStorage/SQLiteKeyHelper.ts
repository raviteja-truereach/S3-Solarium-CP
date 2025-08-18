/**
 * SQLite Key Helper
 * Secure database encryption key storage using react-native-keychain
 * Provides 64-byte AES-256 key generation and storage for SQLCipher
 */
import * as Keychain from 'react-native-keychain';
import './cryptoPolyfill';

// Keychain service identifier for SQLite encryption key
const KEYCHAIN_SERVICE = 'SolariumCP-SQLCipher';
const DB_KEY_IDENTIFIER = 'sqlite_encryption_key';

/**
 * Keychain configuration for enhanced security
 */
const keychainOptions: Keychain.Options = {
  service: KEYCHAIN_SERVICE,
  accessControl:
    Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * Generate a cryptographically secure 64-byte key (128 hex characters)
 * Uses React Native's built-in crypto.getRandomValues for secure random generation
 * @returns 128-character hex string (64 bytes)
 */
function generateSecureKey(): string {
  try {
    console.log('SQLite Key: Starting key generation...');

    // Generate 64 random bytes
    const array = new Uint8Array(64);

    // Use React Native's crypto.getRandomValues (available via react-native-get-random-values)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      console.log('SQLite Key: Using crypto.getRandomValues');
      crypto.getRandomValues(array);
    } else {
      // Fallback using Math.random (less secure, for development/testing only)
      console.warn(
        'SQLite Key: crypto.getRandomValues not available, using Math.random fallback'
      );
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }

    // Convert to hex string
    const hexKey = Array.from(array, (byte) =>
      byte.toString(16).padStart(2, '0')
    ).join('');

    console.log('SQLite Key: Generated hex key length:', hexKey.length);

    if (hexKey.length !== 128) {
      throw new Error(
        `Generated key has wrong length: ${hexKey.length}, expected 128`
      );
    }

    return hexKey;
  } catch (error) {
    console.error('SQLite Key: Key generation failed:', error);
    throw new Error(`Key generation failed: ${error}`);
  }
}

/**
 * Get database encryption key from keychain
 * Generates and stores a new key on first call
 * @returns Promise<string> - 128-character hex key for SQLCipher
 */
export async function getDbKey(): Promise<string> {
  try {
    console.log('SQLite Key: Starting key retrieval...');

    // Try to retrieve existing key
    const credentials = await Keychain.getInternetCredentials(
      DB_KEY_IDENTIFIER,
      keychainOptions
    );

    console.log(
      'SQLite Key: Keychain credentials result:',
      typeof credentials,
      credentials !== false
    );

    if (
      credentials &&
      typeof credentials !== 'boolean' &&
      credentials.password
    ) {
      // Validate key format (must be 128 hex characters)
      const key = credentials.password;
      console.log('SQLite Key: Retrieved key length:', key.length);

      if (key.length === 128 && /^[0-9a-f]+$/i.test(key)) {
        console.log('SQLite Key: Using existing valid key');
        return key;
      }

      // Invalid key format, generate new one
      console.warn('SQLite Key: Invalid key format found, generating new key');
      await resetDbKey();
    }

    // Generate new key
    console.log('SQLite Key: Generating new key...');
    const newKey = generateSecureKey();

    if (!newKey || newKey.length !== 128) {
      throw new Error(
        `Invalid generated key: length ${newKey?.length || 'null'}`
      );
    }

    console.log('SQLite Key: Generated key length:', newKey.length);

    // Store the new key
    await Keychain.setInternetCredentials(
      DB_KEY_IDENTIFIER,
      DB_KEY_IDENTIFIER,
      newKey,
      keychainOptions
    );

    console.log(
      'SQLite Key: New encryption key generated and stored successfully'
    );
    return newKey;
  } catch (error) {
    console.error('SQLite Key: Failed to get encryption key:', error);

    // Handle keychain errors gracefully
    if (error instanceof Error && error.message.includes('UserCancel')) {
      throw new Error('Database key access was cancelled by user');
    }

    throw new Error(`Failed to access database encryption key: ${error}`);
  }
}

/**
 * Reset (delete) the database encryption key from keychain
 * This will force generation of a new key on next access
 * Used during logout to clear all cached data
 */
export async function resetDbKey(): Promise<void> {
  try {
    await Keychain.resetInternetCredentials(DB_KEY_IDENTIFIER, keychainOptions);
    console.log('SQLite encryption key cleared from keychain');
  } catch (error) {
    // Ignore errors during deletion - key may not exist
    console.warn('Failed to clear SQLite key from keychain:', error);
  }
}

/**
 * Check if a database encryption key exists in keychain
 * @returns Promise<boolean> - true if key exists and is valid
 */
export async function hasDbKey(): Promise<boolean> {
  try {
    const credentials = await Keychain.getInternetCredentials(
      DB_KEY_IDENTIFIER,
      keychainOptions
    );

    if (
      credentials &&
      typeof credentials !== 'boolean' &&
      credentials.password
    ) {
      const key = credentials.password;
      return key.length === 128 && /^[0-9a-f]+$/i.test(key);
    }

    return false;
  } catch (error) {
    return false;
  }
}
