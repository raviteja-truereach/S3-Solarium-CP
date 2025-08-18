/**
 * Redux SQLite Rehydration Integration Test
 */

// Mock all dependencies BEFORE importing anything
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('../../src/database/database', () => ({
  openEncryptedDb: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../src/database/dao', () => ({
  getLeadDao: jest.fn(),
  getCustomerDao: jest.fn(),
  getSyncDao: jest.fn(),
}));

// Now import modules after mocks are set up
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';
import leadSlice from '../../src/store/slices/leadSlice';
import customerSlice from '../../src/store/slices/customerSlice';
import { createSQLiteTransform } from '../../src/store/transforms/sqliteTransform';

describe('Redux SQLite Rehydration Integration', () => {
  const mockLeads = [
    { id: 'lead-1', status: 'new', sync_status: 'synced', local_changes: '{}' },
    {
      id: 'lead-2',
      status: 'contacted',
      sync_status: 'synced',
      local_changes: '{}',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock DAO responses
    const {
      getLeadDao,
      getCustomerDao,
      getSyncDao,
    } = require('../../src/database/dao');

    getLeadDao.mockReturnValue({
      findAll: jest.fn().mockResolvedValue(mockLeads),
    });

    getCustomerDao.mockReturnValue({
      findAll: jest.fn().mockResolvedValue([]),
    });

    getSyncDao.mockReturnValue({
      getByTableName: jest.fn().mockResolvedValue({
        last_sync_timestamp: '2023-01-01T00:00:00.000Z',
      }),
    });
  });

  it('should create store with SQLite transform', () => {
    const rootReducer = combineReducers({
      leads: leadSlice,
      customers: customerSlice,
    });

    const persistConfig = {
      key: 'test',
      storage: AsyncStorage,
      transforms: [createSQLiteTransform()],
    };

    const persistedReducer = persistReducer(persistConfig, rootReducer);

    const store = configureStore({
      reducer: persistedReducer,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: {
            ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
          },
        }),
    });

    expect(store).toBeDefined();
    expect(store.getState()).toBeDefined();
    expect(store.getState().leads).toBeDefined();
    expect(store.getState().customers).toBeDefined();
  });

  it('should handle transform performance test', async () => {
    const startTime = Date.now();

    const transform = createSQLiteTransform();
    const result = await transform.out({ items: [], lastSync: null }, 'leads');

    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(500);
    expect(result.items).toEqual(mockLeads);
  });

  it('should handle inbound transform correctly', () => {
    const transform = createSQLiteTransform();

    const leadState = {
      items: mockLeads,
      lastSync: Date.now(),
      filters: { status: 'new' },
    };

    const result = transform.in(leadState, 'leads');

    expect(result).not.toHaveProperty('items');
    expect(result).toHaveProperty('lastSync');
    expect(result).toHaveProperty('filters');
  });
});
