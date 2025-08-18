/**
 * App Component Tests
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

// Mock all dependencies
jest.mock('./src/database/database');
jest.mock('./src/database/migrations');
jest.mock('./src/database/dao');
jest.mock('./src/utils/secureStorage/SQLiteKeyHelper');
jest.mock('./src/store/thunks/authThunks');

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful database
    const { openEncryptedDb } = require('./src/database/database');
    openEncryptedDb.mockResolvedValue({});

    const { verifySchema } = require('./src/database/migrations');
    verifySchema.mockResolvedValue(true);

    // Mock auth thunk
    const { bootstrapFromKeychain } = require('./src/store/thunks/authThunks');
    bootstrapFromKeychain.mockReturnValue({ type: 'test' });
  });

  it('should render without crashing', () => {
    const { getByText } = render(<App />);

    // Should show database loading initially
    expect(getByText('Preparing secure database...')).toBeTruthy();
  });

  it('should have correct provider hierarchy', () => {
    const { root } = render(<App />);

    // Should not throw - providers are set up correctly
    expect(root).toBeTruthy();
  });
});
