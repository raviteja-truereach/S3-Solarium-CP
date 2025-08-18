/**
 * Redux Store Configuration
 * Updated store setup with quotation and master data APIs
 */
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import { combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authSlice from './slices/authSlice';
import preferencesSlice from './slices/preferencesSlice';
import leadSlice from './slices/leadSlice';
import customerSlice from './slices/customerSlice';
import quotationSlice from './slices/quotationSlice'; // ✅ ADD
import { baseApi } from './api/baseApi';
import { authApi } from './api/authApi';
import { errorMiddleware } from './middleware/errorMiddleware';
import { createSQLiteTransform } from './transforms/sqliteTransform';
import networkSlice from './slices/networkSlice';
import { dashboardApi } from './api/dashboardApi';
import { leadApi } from './api/leadApi';
import { customerApi } from '@store/api/customerApi';
import { servicesApi } from '@store/api/servicesApi';
import { masterDataApi } from '@store/api/masterDataApi'; // ✅ ADD
import { quotationApi } from '@store/api/quotationApi'; // ✅ ADD
import { documentApi } from '@store/api/documentApi';
import documentCountSlice from './slices/documentCountSlice';

/**
 * Persistence configuration
 * Include quotation slice in persistence
 */
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'preferences', 'leads', 'customers', 'quotation'], // ✅ ADD quotation
  blacklist: ['network'], // Network slice should not be persisted
  // transforms: [createSQLiteTransform()], // Add SQLite transform
  // Throttle persist operations to avoid performance issues
  throttle: 1000,
};

/**
 * Root reducer combining all slices and APIs
 */
const rootReducer = combineReducers({
  auth: authSlice,
  preferences: preferencesSlice,
  lead: leadSlice,
  customers: customerSlice,
  quotation: quotationSlice, // ✅ ADD
  network: networkSlice,
  documentCount: documentCountSlice,
  // Add RTK Query API reducers
  [baseApi.reducerPath]: baseApi.reducer,
  [authApi.reducerPath]: authApi.reducer,
  [dashboardApi.reducerPath]: dashboardApi.reducer,
  [leadApi.reducerPath]: leadApi.reducer,
  [customerApi.reducerPath]: customerApi.reducer,
  [servicesApi.reducerPath]: servicesApi.reducer,
  [masterDataApi.reducerPath]: masterDataApi.reducer, // ✅ ADD
  [quotationApi.reducerPath]: quotationApi.reducer, // ✅ ADD
  [documentApi.reducerPath]: documentApi.reducer,
});

/**
 * Persisted reducer
 */
const persistedReducer = persistReducer(persistConfig, rootReducer);

/**
 * Configure the Redux store with RTK Query and persistence
 */
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'baseApi/executeQuery/pending',
          'baseApi/executeQuery/fulfilled',
          'baseApi/executeQuery/rejected',
          'dashboardApi/executeQuery/pending',
          'dashboardApi/executeQuery/fulfilled',
          'dashboardApi/executeQuery/rejected',
          'masterDataApi/executeQuery/pending', // ✅ ADD
          'masterDataApi/executeQuery/fulfilled', // ✅ ADD
          'masterDataApi/executeQuery/rejected', // ✅ ADD
          'quotationApi/executeQuery/pending', // ✅ ADD
          'quotationApi/executeQuery/fulfilled', // ✅ ADD
          'quotationApi/executeQuery/rejected', // ✅ ADD
          'documentApi/executeQuery/pending',
          'documentApi/executeQuery/fulfilled',
          'documentApi/executeQuery/rejected',
        ],
      },
    })
      .concat(baseApi.middleware)
      .concat(authApi.middleware)
      .concat(dashboardApi.middleware)
      .concat(leadApi.middleware)
      .concat(customerApi.middleware)
      .concat(servicesApi.middleware)
      .concat(masterDataApi.middleware) // ✅ ADD
      .concat(quotationApi.middleware) // ✅ ADD
      .concat(documentApi.middleware)
      .concat(errorMiddleware),
});

/**
 * Setup RTK Query listeners for cache management
 */
setupListeners(store.dispatch);

/**
 * Persistor for PersistGate
 */
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

export type AppThunk<ReturnType = void> = (
  dispatch: AppDispatch,
  getState: () => RootState
) => ReturnType;

export default store;
