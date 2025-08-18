/**
 * Keychain Helper Tests
 * Tests for secure token storage functionality
 */
import * as KeychainHelper from '../../src/utils/secureStorage/KeychainHelper';

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(),
  getInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn(),
}));

const mockKeychain = require('react-native-keychain');

describe('KeychainHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveToken', () => {
    it('should save token with expiry successfully', async () => {
      mockKeychain.setInternetCredentials.mockResolvedValue(true);

      const token = 'test-jwt-token';
      const expiresAt = Date.now() + 3600000; // 1 hour from now

      await expect(
        KeychainHelper.saveToken(token, expiresAt)
      ).resolves.toBeUndefined();

      expect(mockKeychain.setInternetCredentials).toHaveBeenCalledWith(
        'auth_token',
        'auth_token',
        JSON.stringify({ token, expiresAt }),
        expect.any(Object)
      );
    });

    it('should throw error when keychain save fails', async () => {
      mockKeychain.setInternetCredentials.mockRejectedValue(
        new Error('Keychain error')
      );

      await expect(
        KeychainHelper.saveToken('token', Date.now())
      ).rejects.toThrow('Failed to save authentication token');
    });
  });

  describe('getToken', () => {
    it('should return token when valid and not expired', async () => {
      const token = 'valid-token';
      const expiresAt = Date.now() + 3600000; // 1 hour from now

      mockKeychain.getInternetCredentials.mockResolvedValue({
        username: 'auth_token',
        password: JSON.stringify({ token, expiresAt }),
      });

      const result = await KeychainHelper.getToken();

      expect(result).toEqual({ token, expiresAt });
    });

    it('should return undefined when token is expired', async () => {
      const token = 'expired-token';
      const expiresAt = Date.now() - 3600000; // 1 hour ago

      mockKeychain.getInternetCredentials.mockResolvedValue({
        username: 'auth_token',
        password: JSON.stringify({ token, expiresAt }),
      });
      mockKeychain.resetInternetCredentials.mockResolvedValue(true);

      const result = await KeychainHelper.getToken();

      expect(result).toBeUndefined();
      expect(mockKeychain.resetInternetCredentials).toHaveBeenCalled();
    });

    it('should return undefined when no credentials exist', async () => {
      mockKeychain.getInternetCredentials.mockResolvedValue(false);

      const result = await KeychainHelper.getToken();

      expect(result).toBeUndefined();
    });
  });

  describe('deleteToken', () => {
    it('should delete token successfully', async () => {
      mockKeychain.resetInternetCredentials.mockResolvedValue(true);

      await expect(KeychainHelper.deleteToken()).resolves.toBeUndefined();

      expect(mockKeychain.resetInternetCredentials).toHaveBeenCalledWith(
        'auth_token',
        expect.any(Object)
      );
    });

    it('should handle deletion errors gracefully', async () => {
      mockKeychain.resetInternetCredentials.mockRejectedValue(
        new Error('Delete error')
      );

      await expect(KeychainHelper.deleteToken()).resolves.toBeUndefined();
    });
  });
});
