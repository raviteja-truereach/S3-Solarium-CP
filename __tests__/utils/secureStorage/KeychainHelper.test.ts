/**
 * Comprehensive Keychain Helper Tests
 * Tests all aspects of secure token storage
 */
import * as KeychainHelper from '../../../src/utils/secureStorage/KeychainHelper';

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
    // Reset Date.now for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000); // 2022-01-01 00:00:00
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
        expect.objectContaining({
          service: 'SolariumCPApp',
        })
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

    it('should handle keychain access denied gracefully', async () => {
      mockKeychain.setInternetCredentials.mockRejectedValue(
        new Error('UserCancel')
      );

      await expect(
        KeychainHelper.saveToken('token', Date.now())
      ).rejects.toThrow();
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

    it('should handle malformed JSON gracefully', async () => {
      mockKeychain.getInternetCredentials.mockResolvedValue({
        username: 'auth_token',
        password: 'invalid-json',
      });

      const result = await KeychainHelper.getToken();

      expect(result).toBeUndefined();
    });

    it('should handle user cancellation gracefully', async () => {
      mockKeychain.getInternetCredentials.mockRejectedValue(
        new Error('UserCancel')
      );

      const result = await KeychainHelper.getToken();

      expect(result).toBeUndefined();
    });

    it('should handle other keychain errors gracefully', async () => {
      mockKeychain.getInternetCredentials.mockRejectedValue(
        new Error('Unknown error')
      );

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
        expect.objectContaining({
          service: 'SolariumCPApp',
        })
      );
    });

    it('should handle deletion errors gracefully', async () => {
      mockKeychain.resetInternetCredentials.mockRejectedValue(
        new Error('Delete error')
      );

      await expect(KeychainHelper.deleteToken()).resolves.toBeUndefined();
    });
  });

  describe('hasValidToken', () => {
    it('should return true when valid token exists', async () => {
      const token = 'valid-token';
      const expiresAt = Date.now() + 3600000;

      mockKeychain.getInternetCredentials.mockResolvedValue({
        username: 'auth_token',
        password: JSON.stringify({ token, expiresAt }),
      });

      const result = await KeychainHelper.hasValidToken();

      expect(result).toBe(true);
    });

    it('should return false when no valid token exists', async () => {
      mockKeychain.getInternetCredentials.mockResolvedValue(false);

      const result = await KeychainHelper.hasValidToken();

      expect(result).toBe(false);
    });
  });
});
