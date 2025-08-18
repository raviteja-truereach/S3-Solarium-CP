/**
 * Keychain Helper
 * Secure token storage using react-native-keychain
 * Provides JWT storage with automatic expiry checking
 */
import * as Keychain from 'react-native-keychain';

// Keychain service identifier for our app
const KEYCHAIN_SERVICE = 'SolariumCPApp';
const TOKEN_KEY = 'auth_token';

/**
 * Token storage interface
 */
interface StoredToken {
  token: string;
  expiresAt: number;
}

/**
 * Keychain configuration for enhanced security
 */
const keychainOptions: Keychain.Options = {
  service: KEYCHAIN_SERVICE,
};

/**
 * Save JWT token with expiration time to keychain
 * @param token - JWT token string
 * @param expiresAt - Unix timestamp when token expires
 */
export async function saveToken(
  token: string,
  expiresAt: number
): Promise<void> {
  try {
    const tokenData: StoredToken = {
      token,
      expiresAt,
    };

    await Keychain.setInternetCredentials(
      TOKEN_KEY,
      TOKEN_KEY,
      JSON.stringify(tokenData),
      keychainOptions
    );
  } catch (error) {
    // Log error but don't throw to prevent app crashes
    console.warn('Failed to save token to keychain:', error);
    throw new Error('Failed to save authentication token');
  }
}

/**
 * Retrieve JWT token from keychain
 * Returns undefined if token doesn't exist or is expired
 * @returns Token data or undefined
 */
export async function getToken(): Promise<StoredToken | undefined> {
  try {
    const credentials = await Keychain.getInternetCredentials(
      TOKEN_KEY,
      keychainOptions
    );

    if (!credentials || typeof credentials === 'boolean') {
      return undefined;
    }

    const tokenData: StoredToken = JSON.parse(credentials.password);

    // Check if token is expired
    const now = Date.now();
    if (tokenData.expiresAt <= now) {
      // Token expired, clean it up
      await deleteToken();
      return undefined;
    }

    return tokenData;
  } catch (error) {
    // Handle user cancellation or other keychain errors
    if (error instanceof Error && error.message.includes('UserCancel')) {
      return undefined;
    }

    console.warn('Failed to retrieve token from keychain:', error);
    return undefined;
  }
}

/**
 * Delete JWT token from keychain
 * Always resolves successfully, even if token doesn't exist
 */
export async function deleteToken(): Promise<void> {
  try {
    await Keychain.resetInternetCredentials(TOKEN_KEY, keychainOptions);
  } catch (error) {
    // Ignore errors during deletion - token may not exist
    console.warn('Failed to delete token from keychain:', error);
  }
}

/**
 * Check if a valid (non-expired) token exists
 * @returns true if valid token exists
 */
export async function hasValidToken(): Promise<boolean> {
  const tokenData = await getToken();
  return tokenData !== undefined;
}
