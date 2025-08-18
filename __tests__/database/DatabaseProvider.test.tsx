/**
 * Database Provider Tests
 */
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';

// Mock React Native Paper specifically for this test
jest.mock('react-native-paper', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      primary: '#007AFF',
      background: '#FFFFFF',
      surface: '#F2F2F2',
      error: '#FF3B30',
      onBackground: '#000000',
      onSurface: '#000000',
      onSurfaceVariant: '#666666',
    },
  })),
}));

// Mock database
jest.mock('../../src/database/database', () => ({
  openEncryptedDb: jest.fn(),
  closeDatabase: jest.fn().mockResolvedValue(undefined),
  getCurrentDbInstance: jest.fn().mockReturnValue(null),
}));

jest.mock('../../src/database/migrations', () => ({
  verifySchema: jest.fn().mockResolvedValue(true),
}));

// Import after mocks
import {
  DatabaseProvider,
  useDatabase,
} from '../../src/database/DatabaseProvider';

// Test component that uses database context
const TestComponent: React.FC = () => {
  const { database, isReady, error } = useDatabase();

  return (
    <>
      {isReady ? (
        <Text testID="database-ready">Ready</Text>
      ) : (
        <Text testID="database-loading">Loading</Text>
      )}
      {error && <Text testID="database-error">{error}</Text>}
      {database && <Text testID="database-instance">Database Available</Text>}
    </>
  );
};

describe('DatabaseProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Don't use fake timers - they interfere with async operations
  });

  it('should provide database context', async () => {
    const { openEncryptedDb } = require('../../src/database/database');
    openEncryptedDb.mockResolvedValue({});

    const { getByTestId } = render(
      <DatabaseProvider showLoading={false}>
        <TestComponent />
      </DatabaseProvider>
    );

    // Initially should show loading
    expect(getByTestId('database-loading')).toBeTruthy();
  });

  it('should show ready state when database initializes', async () => {
    const { openEncryptedDb } = require('../../src/database/database');
    const mockDb = { transaction: jest.fn() };
    openEncryptedDb.mockResolvedValue(mockDb);

    const { getByTestId } = render(
      <DatabaseProvider showLoading={false}>
        <TestComponent />
      </DatabaseProvider>
    );

    // Wait for database initialization to complete
    await waitFor(
      () => {
        expect(getByTestId('database-ready')).toBeTruthy();
      },
      { timeout: 3000 }
    );

    await waitFor(
      () => {
        expect(getByTestId('database-instance')).toBeTruthy();
      },
      { timeout: 3000 }
    );
  });

  it('should handle database initialization errors', async () => {
    const { openEncryptedDb } = require('../../src/database/database');
    openEncryptedDb.mockRejectedValue(new Error('Database connection failed'));

    const { getByTestId } = render(
      <DatabaseProvider showLoading={false}>
        <TestComponent />
      </DatabaseProvider>
    );

    // Wait for error to appear
    await waitFor(
      () => {
        expect(getByTestId('database-error')).toBeTruthy();
      },
      { timeout: 3000 }
    );
  });

  it('should throw error when useDatabase is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useDatabase must be used within a DatabaseProvider');

    consoleSpy.mockRestore();
  });

  it('should provide retry functionality', async () => {
    const { openEncryptedDb } = require('../../src/database/database');
    // First call fails, second call succeeds
    openEncryptedDb
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValue({ transaction: jest.fn() });

    const RetryTestComponent: React.FC = () => {
      const { isReady, error, retry } = useDatabase();

      return (
        <>
          {error && (
            <Text testID="has-retry" onPress={retry}>
              Retry Available
            </Text>
          )}
          {isReady && <Text testID="is-ready">Ready State</Text>}
          <Text testID="error-message">{error || 'No Error'}</Text>
        </>
      );
    };

    const { getByTestId } = render(
      <DatabaseProvider showLoading={false}>
        <RetryTestComponent />
      </DatabaseProvider>
    );

    // Wait for initial error
    await waitFor(
      () => {
        expect(getByTestId('has-retry')).toBeTruthy();
      },
      { timeout: 3000 }
    );
  });

  it('should provide close functionality', () => {
    const CloseTestComponent: React.FC = () => {
      const { close } = useDatabase();

      return (
        <Text testID="has-close" onPress={() => close()}>
          Close Available
        </Text>
      );
    };

    const { getByTestId } = render(
      <DatabaseProvider showLoading={false}>
        <CloseTestComponent />
      </DatabaseProvider>
    );

    expect(getByTestId('has-close')).toBeTruthy();
  });
});
