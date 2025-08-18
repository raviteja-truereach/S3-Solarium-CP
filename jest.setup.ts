/**
 * Jest Setup Configuration
 * Global test setup and mocks
 */
import 'react-native-gesture-handler/jestSetup';
import '@testing-library/jest-native/extend-expect';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Declare global for TypeScript
declare const global: any;

// Mock React Native Paper dependencies
// Mock React Native Paper dependencies
jest.mock('react-native-paper', () => {
  const React = require('react');
  return {
    PaperProvider: ({ children }: { children: React.ReactNode }) => children,
    useTheme: jest.fn(() => ({
      colors: {
        primary: '#007AFF',
        background: '#FFFFFF',
        surface: '#F2F2F2',
        error: '#FF3B30',
        onBackground: '#000000',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
        onSecondaryContainer: '#333333',
        secondary: '#5856D6',
        secondaryContainer: '#E5E5EA',
      },
    })),
    ActivityIndicator: ({ size, color, ...props }: any) => 
      React.createElement('div', { ...props, testID: 'activity-indicator', 'data-size': size, 'data-color': color }),
    Text: ({ children, style, onPress, ...props }: any) => 
      React.createElement('div', { ...props, onClick: onPress, style }, children),
    Button: ({ children, onPress, ...props }: any) =>
      React.createElement('button', { ...props, onClick: onPress }, children),
    Card: ({ children, ...props }: any) =>
      React.createElement('div', { ...props }, children),
    Title: ({ children, ...props }: any) =>
      React.createElement('h2', { ...props }, children),
    Paragraph: ({ children, ...props }: any) =>
      React.createElement('p', { ...props }, children),
  };
});

// Mock React Native core components used by Paper
jest.mock('react-native', () => {
  const React = require('react');
  return {
    View: ({ children, style, ...props }: any) =>
      React.createElement('div', { ...props, style }, children),
    Text: ({ children, style, onPress, ...props }: any) =>
      React.createElement(
        'div',
        { ...props, onClick: onPress, style },
        children
      ),
    ActivityIndicator: ({ size, color, ...props }: any) =>
      React.createElement('div', {
        ...props,
        'data-size': size,
        'data-color': color,
      }),
    StyleSheet: {
      create: (styles: any) => styles,
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    Appearance: {
      getColorScheme: jest.fn(() => 'light'),
      addChangeListener: jest.fn(),
      removeChangeListener: jest.fn(),
    },
    Platform: {
      OS: 'ios',
      select: jest.fn((config) => config.ios || config.default),
    },
  };
});

// Mock SQLiteStorage globally to prevent import errors
jest.mock('react-native-sqlite-storage', () => ({
  __esModule: true,
  default: {
    openDatabase: jest.fn(() => ({
      transaction: jest.fn((callback) => {
        const mockTx = {
          executeSql: jest.fn((sql, params, success) => {
            setTimeout(() => {
              if (sql.includes('PRAGMA user_version')) {
                success &&
                  success(null, {
                    rows: { item: () => ({ user_version: 1 }) },
                  });
              } else if (sql.includes('COUNT(*)')) {
                success &&
                  success(null, { rows: { item: () => ({ count: 0 }) } });
              } else {
                success &&
                  success(null, { rows: { length: 0, item: () => null } });
              }
            }, 0);
          }),
        };
        callback(mockTx);
      }),
    })),
    deleteDatabase: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock react-native-config
jest.mock('react-native-config', () => ({
  REACT_APP_BASE_URL: 'http://localhost:3001/api/v1',
  REACT_APP_ENV: 'test',
  REACT_APP_API_TIMEOUT: '15000',
  REACT_APP_API_RETRY: '1',
}));

// Mock NetInfo
jest.mock(
  '@react-native-community/netinfo',
  () => require('./__tests__/mocks/NetInfoMock').default
);

// Mock Toast
jest.mock(
  'react-native-toast-message',
  () => require('./__tests__/mocks/ToastMock').default
);

// Mock RNRestart
jest.mock(
  'react-native-restart',
  () => require('./__tests__/mocks/RNRestartMock').default
);

// Mock Navigation Ref
jest.mock('@navigation/navigationRef', () =>
  require('./__tests__/mocks/navigationRefMock')
);

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const RealModule = jest.requireActual('react-native-paper');
  const MockedModule = {
    ...RealModule,
    Portal: ({ children }: { children: React.ReactNode }) => children,
    Modal: ({
      children,
      visible,
    }: {
      children: React.ReactNode;
      visible: boolean;
    }) => (visible ? children : null),
  };
  return MockedModule;
});

// Mock Keychain - ensure it works with the existing __mocks__ file
// Mock Keychain - inline mock to ensure jest functions are available
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn().mockResolvedValue(true),
  getInternetCredentials: jest.fn().mockResolvedValue(false),
  resetInternetCredentials: jest.fn().mockResolvedValue(true),
  ACCESS_CONTROL: {
    WHEN_UNLOCKED: 'WhenUnlocked',
  },
  ACCESSIBLE: {
    WHEN_UNLOCKED: 'WhenUnlocked',
  },
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
};

// Mock global fetch
import MockFetch from './__tests__/mocks/fetchMock';
global.fetch = MockFetch.fetch;

// Mock AccessibilityInfo
jest.mock(
  'react-native/Libraries/Components/AccessibilityInfo/AccessibilityInfo',
  () => ({
    announceForAccessibility: jest.fn(),
    setAccessibilityFocus: jest.fn(),
  })
);

// Mock Animated for testing
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock Dimensions
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn(() => ({ width: 375, height: 667 })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock InteractionManager
jest.mock('react-native/Libraries/Interaction/InteractionManager', () => ({
  runAfterInteractions: jest.fn((callback) => callback()),
  createInteractionHandle: jest.fn(),
  clearInteractionHandle: jest.fn(),
}));

// Mock Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
  prompt: jest.fn(),
}));

// Suppress specific React Native warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('componentWillReceiveProps has been renamed')
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

// Setup global test environment
beforeEach(() => {
  jest.clearAllMocks();
  MockFetch.clearMocks();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock crypto.getRandomValues for testing
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn().mockImplementation((array: Uint8Array) => {
      // Fill with predictable values for testing
      for (let i = 0; i < array.length; i++) {
        array[i] = i % 256;
      }
      return array;
    }),
  },
  writable: true,
});
