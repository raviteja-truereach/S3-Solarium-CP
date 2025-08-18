/**
 * SQLite Key Helper Tests
 * Tests secure key generation, storage, and retrieval
 */
import * as Keychain from 'react-native-keychain';
import {
  getDbKey,
  resetDbKey,
  hasDbKey,
} from '../../../src/utils/secureStorage/SQLiteKeyHelper';

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  ACCESS_CONTROL: {
    BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE:
      'BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE',
  },
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  },
  setInternetCredentials: jest.fn(),
  getInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn(),
}));

// Mock crypto.getRandomValues
const mockGetRandomValues = jest.fn();
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: mockGetRandomValues,
  },
  writable: true,
});

const mockedKeychain = Keychain as jest.Mocked<typeof Keychain>;

describe('SQLiteKeyHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default crypto mock
    mockGetRandomValues.mockImplementation((array: Uint8Array) => {
      // Fill with predictable values for testing
      for (let i = 0; i < array.length; i++) {
        array[i] = i % 256;
      }
      return array;
    });
  });

  describe('getDbKey', () => {
    it('should generate new key when none exists', async () => {
      // Mock no existing key
      mockedKeychain.getInternetCredentials.mockResolvedValue(false);
      mockedKeychain.setInternetCredentials.mockResolvedValue();

      const key = await getDbKey();

      // Should be 128 hex characters (64 bytes)
      expect(key).toHaveLength(128);
      expect(/^[0-9a-f]+$/i.test(key)).toBe(true);

      // Should have stored the key
      expect(mockedKeychain.setInternetCredentials).toHaveBeenCalledWith(
        'sqlite_encryption_key',
        'sqlite_encryption_key',
        key,
        expect.objectContaining({
          service: 'SolariumCP-SQLCipher',
        })
      );
    });

    it('should return existing valid key', async () => {
      const existingKey = 'a'.repeat(128);

      mockedKeychain.getInternetCredentials.mockResolvedValue({
        username: 'sqlite_encryption_key',
        password: existingKey,
        service: 'SolariumCP-SQLCipher',
      });

      const key = await getDbKey();

      expect(key).toBe(existingKey);
      expect(mockedKeychain.setInternetCredentials).not.toHaveBeenCalled();
    });

    it('should regenerate key if existing key is invalid', async () => {
      const invalidKey = 'invalid_key';

      mockedKeychain.getInternetCredentials.mockResolvedValue({
        username: 'sqlite_encryption_key',
        password: invalidKey,
        service: 'SolariumCP-SQLCipher',
      });

      mockedKeychain.resetInternetCredentials.mockResolvedValue();
      mockedKeychain.setInternetCredentials.mockResolvedValue();

      const key = await getDbKey();

      expect(key).toHaveLength(128);
      expect(/^[0-9a-f]+$/i.test(key)).toBe(true);
      expect(mockedKeychain.resetInternetCredentials).toHaveBeenCalled();
      expect(mockedKeychain.setInternetCredentials).toHaveBeenCalled();
    });

    it('should handle keychain errors gracefully', async () => {
      mockedKeychain.getInternetCredentials.mockRejectedValue(
        new Error('Keychain error')
      );

      await expect(getDbKey()).rejects.toThrow(
        'Failed to access database encryption key'
      );
    });

    it('should handle user cancellation', async () => {
      mockedKeychain.getInternetCredentials.mockRejectedValue(
        new Error('UserCancel')
      );

      await expect(getDbKey()).rejects.toThrow(
        'Database key access was cancelled by user'
      );
    });
  });

  describe('resetDbKey', () => {
    it('should clear key from keychain', async () => {
      mockedKeychain.resetInternetCredentials.mockResolvedValue();

      await resetDbKey();

      expect(mockedKeychain.resetInternetCredentials).toHaveBeenCalledWith(
        'sqlite_encryption_key',
        expect.objectContaining({
          service: 'SolariumCP-SQLCipher',
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockedKeychain.resetInternetCredentials.mockRejectedValue(
        new Error('Reset error')
      );

      // Should not throw
      await expect(resetDbKey()).resolves.toBeUndefined();
    });
  });

  describe('hasDbKey', () => {
    it('should return true for valid existing key', async () => {
      const validKey = 'a'.repeat(128);

      mockedKeychain.getInternetCredentials.mockResolvedValue({
        username: 'sqlite_encryption_key',
        password: validKey,
        service: 'SolariumCP-SQLCipher',
      });

      const result = await hasDbKey();

      expect(result).toBe(true);
    });

    it('should return false for invalid key', async () => {
      mockedKeychain.getInternetCredentials.mockResolvedValue({
        username: 'sqlite_encryption_key',
        password: 'invalid',
        service: 'SolariumCP-SQLCipher',
      });

      const result = await hasDbKey();

      expect(result).toBe(false);
    });

    it('should return false when no key exists', async () => {
      mockedKeychain.getInternetCredentials.mockResolvedValue(false);

      const result = await hasDbKey();

      expect(result).toBe(false);
    });

    it('should return false on keychain error', async () => {
      mockedKeychain.getInternetCredentials.mockRejectedValue(
        new Error('Keychain error')
      );

      const result = await hasDbKey();

      expect(result).toBe(false);
    });
  });

  describe('Key Generation Security', () => {
    it('should generate different keys on multiple calls', async () => {
      mockedKeychain.getInternetCredentials.mockResolvedValue(false);
      mockedKeychain.setInternetCredentials.mockResolvedValue();

      // Mock different random values each time
      let callCount = 0;
      mockGetRandomValues.mockImplementation((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = (i + callCount) % 256;
        }
        callCount++;
        return array;
      });

      const key1 = await getDbKey();

      // Reset mocks to simulate fresh start
      mockedKeychain.getInternetCredentials.mockResolvedValue(false);

      const key2 = await getDbKey();

      expect(key1).not.toBe(key2);
      expect(key1).toHaveLength(128);
      expect(key2).toHaveLength(128);
    });
  });
});
