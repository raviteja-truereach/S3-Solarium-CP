import 'jest-axe/extend-expect';
import { configure } from '@testing-library/react-native';

// Configure testing library
configure({
  testIdAttribute: 'testID',
});

// Mock react-native-paper components if needed
jest.mock('react-native-paper', () => {
  const RNPaper = jest.requireActual('react-native-paper');
  return {
    ...RNPaper,
    // Add any specific mocks if needed
  };
});
