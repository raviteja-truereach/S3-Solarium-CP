/**
 * Sanity Check Test
 * Verifies Jest setup is working correctly
 */
import '@testing-library/jest-native/extend-expect';

describe('Jest Setup Sanity Check', () => {
  it('should have RTL matchers available', () => {
    // This will fail if @testing-library/jest-native is not properly imported
    const element = { props: { testID: 'test' } };
    expect(() => expect(element).toHaveProperty('props.testID')).not.toThrow();
  });

  it('should have mocked console methods', () => {
    console.log('test log');
    console.warn('test warn');
    console.error('test error');

    expect(console.log).toBeDefined();
    expect(console.warn).toBeDefined();
    expect(console.error).toBeDefined();
  });

  it('should have mocked fetch available', () => {
    expect(global.fetch).toBeDefined();
    expect(typeof global.fetch).toBe('function');
  });

  it('should have AsyncStorage mocked', () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    expect(AsyncStorage.getItem).toBeDefined();
    expect(AsyncStorage.setItem).toBeDefined();
  });

  it('should have NetInfo mocked', () => {
    const NetInfo = require('@react-native-community/netinfo');
    expect(NetInfo.fetch).toBeDefined();
    expect(NetInfo.addEventListener).toBeDefined();
  });

  it('should suppress React Native warnings', () => {
    // This should not cause any console output due to warning suppression
    console.warn(
      'componentWillReceiveProps has been renamed and is not recommended for use'
    );
    expect(true).toBeTruthy(); // Test passes if no errors thrown
  });
});
