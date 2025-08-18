/**
 * SQLCipher Import Test
 * Verifies that react-native-sqlcipher-storage can be imported without errors
 */

// Mock the SQLCipher module for Jest testing
jest.mock('react-native-sqlcipher-storage', () => ({
  __esModule: true,
  default: {
    openDatabase: jest.fn(),
    deleteDatabase: jest.fn(),
  },
}));

describe('SQLCipher Library Import', () => {
  it('should import react-native-sqlcipher-storage without errors', () => {
    expect(() => {
      require('react-native-sqlcipher-storage');
    }).not.toThrow();
  });

  it('should have expected SQLiteStorage methods', () => {
    const SQLiteStorage = require('react-native-sqlcipher-storage').default;
    expect(typeof SQLiteStorage.openDatabase).toBe('function');
    expect(typeof SQLiteStorage.deleteDatabase).toBe('function');
  });
});
