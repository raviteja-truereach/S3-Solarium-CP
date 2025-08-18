/**
 * Auth Bootstrap Integration Test
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { store } from '../../src/store';
import { DatabaseProvider } from '../../src/database/DatabaseProvider';
import { AuthBootstrap } from '../../src/components/common/AuthBootstrap';

// Mock database
jest.mock('../../src/database/database');
jest.mock('../../src/database/migrations');
jest.mock('../../src/database/dao');

// Mock auth thunks
jest.mock('../../src/store/thunks/authThunks', () => ({
  bootstrapFromKeychain: jest.fn(() => ({
    type: 'auth/bootstrap',
    payload: {},
  })),
}));

const TestApp: React.FC = () => (
  <Provider store={store}>
    <PaperProvider>
      <DatabaseProvider>
        <AuthBootstrap>
          <div testID="app-ready">App Ready</div>
        </AuthBootstrap>
      </DatabaseProvider>
    </PaperProvider>
  </Provider>
);

describe('AuthBootstrap Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful database initialization
    const { openEncryptedDb } = require('../../src/database/database');
    openEncryptedDb.mockResolvedValue({});

    const { verifySchema } = require('../../src/database/migrations');
    verifySchema.mockResolvedValue(true);
  });

  it('should complete bootstrap sequence', async () => {
    const { getByTestId } = render(<TestApp />);

    // Should eventually show app ready
    await waitFor(
      () => {
        expect(getByTestId('app-ready')).toBeTruthy();
      },
      { timeout: 5000 }
    );
  });

  it('should show loading states during bootstrap', () => {
    const { getByText } = render(<TestApp />);

    // Should show database loading initially
    expect(getByText('Preparing secure database...')).toBeTruthy();
  });

  it('should handle database errors', async () => {
    const { openEncryptedDb } = require('../../src/database/database');
    openEncryptedDb.mockRejectedValue(new Error('Database init failed'));

    const { getByText } = render(<TestApp />);

    await waitFor(() => {
      expect(getByText('Startup Error')).toBeTruthy();
    });
  });
});
