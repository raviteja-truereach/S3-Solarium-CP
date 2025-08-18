/**
 * Crypto Polyfill for React Native
 * Ensures crypto.getRandomValues is available for secure key generation
 */

// Import the polyfill if needed
import 'react-native-get-random-values';

// Verify crypto is available
if (typeof crypto === 'undefined') {
  console.warn('crypto.getRandomValues polyfill may not be loaded correctly');
}

export {};
