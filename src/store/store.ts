import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';

// Import existing slices
import networkSlice from './slices/networkSlice';
import authSlice from './slices/authSlice';
import customerSlice from './slices/customerSlice';
import leadSlice from './slices/leadSlice';
import quotationSlice from './slices/quotationSlice';
import preferencesSlice from './slices/preferencesSlice';
import commissionSlice from './slices/commissionSlice'; // ✅ ADD - Commission slice

// Import API slices - CHECK THESE IMPORTS
import { baseApi } from './api/baseApi';
import { authApi } from './api/authApi';
import { dashboardApi } from './api/dashboardApi';
import { leadApi } from './api/leadApi';
import { simpleNotificationsApi } from './api/simpleNotificationsApi';

// Add these imports with the other API imports
import { customerApi } from './api/customerApi';
import { servicesApi } from './api/servicesApi';
import { masterDataApi } from './api/masterDataApi'; // ✅ ADD - Master Data API
import { quotationApi } from './api/quotationApi';
import { commissionApi } from './api/commissionApi';
// import { documentApi } from './api/documentApi';

// Import middleware
import { errorMiddleware } from './middleware/errorMiddleware';

// Import cache invalidation listener
import { createListenerMiddleware } from '@reduxjs/toolkit';

import documentCountSlice from './slices/documentCountSlice';

// Run debug check
import { checkApiImports } from '../debug/checkApiImports';

// Run debug check
checkApiImports();

/**
 * Cache invalidation listener for logout events
 * This handles clearing all cached data when user logs out
 */
const apiCacheListener = createListenerMiddleware();

// Set up cache invalidation on logout
// This avoids circular dependencies by setting up the listener in store.ts
apiCacheListener.startListening({
  predicate: (action) => action.type === 'auth/logout',
  effect: async (action, listenerApi) => {
    console.log('🧹 Clearing API cache on logout');
    // Clear all RTK Query caches
    if (baseApi) {
      listenerApi.dispatch(baseApi.util.resetApiState());
      console.log('  ✅ Cleared baseApi cache');
    }
    if (authApi) {
      listenerApi.dispatch(authApi.util.resetApiState());
      console.log('  ✅ Cleared authApi cache');
    }
    if (dashboardApi) {
      listenerApi.dispatch(dashboardApi.util.resetApiState());
      console.log('  ✅ Cleared dashboardApi cache');
    }
    if (leadApi) {
      listenerApi.dispatch(leadApi.util.resetApiState());
      console.log('  ✅ Cleared leadApi cache');
    }
    if (simpleNotificationsApi) {
      listenerApi.dispatch(simpleNotificationsApi.util.resetApiState());
      console.log('  ✅ Cleared simpleNotificationsApi cache');
    }
    if (customerApi) {
      listenerApi.dispatch(customerApi.util.resetApiState());
      console.log('  ✅ Cleared customerApi cache');
    }
    if (servicesApi) {
      listenerApi.dispatch(servicesApi.util.resetApiState());
      console.log('  ✅ Cleared servicesApi cache');
    }
    // ✅ ADD - Clear master data cache on logout
    if (masterDataApi) {
      listenerApi.dispatch(masterDataApi.util.resetApiState());
      console.log('  ✅ Cleared masterDataApi cache');
    }
    if (quotationApi) {
      listenerApi.dispatch(quotationApi.util.resetApiState());
      console.log('  ✅ Cleared quotationApi cache');
    }
    if (commissionApi) {
      listenerApi.dispatch(commissionApi.util.resetApiState());
      console.log('  ✅ Cleared commissionApi cache');
    }
    // if (documentApi) {
    //   listenerApi.dispatch(documentApi.util.resetApiState());
    //   console.log('  ✅ Cleared documentApi cache');
    // }
  },
});

// Persist configuration
const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  whitelist: [
    'network',
    'auth',
    'preferences',
    'customer',
    'lead',
    'quotation',
    'commissions', // ✅ ADD - Persist commission slice
    'documentCount',
  ],
  blacklist: [
    'baseApi',
    'authApi',
    'dashboardApi',
    'leadApi',
    'simpleNotifications',
    'customerApi',
    'servicesApi',
    'masterDataApi', // ✅ ADD - Don't persist master data API state
    'quotationApi',
    'documentApi',
    'commissionApi',
  ],
};

// Root reducer
const rootReducer = combineReducers({
  network: networkSlice,
  auth: authSlice,
  customers: customerSlice,
  lead: leadSlice,
  quotation: quotationSlice,
  commissions: commissionSlice, // ✅ ADD - Commission slice reducer
  preferences: preferencesSlice,
  documentCount: documentCountSlice,
  // Only add APIs that exist
  ...(baseApi && { [baseApi.reducerPath]: baseApi.reducer }),
  ...(authApi && { [authApi.reducerPath]: authApi.reducer }),
  ...(dashboardApi && { [dashboardApi.reducerPath]: dashboardApi.reducer }),
  ...(leadApi && { [leadApi.reducerPath]: leadApi.reducer }),
  ...(customerApi && { [customerApi.reducerPath]: customerApi.reducer }),
  ...(servicesApi && { [servicesApi.reducerPath]: servicesApi.reducer }),
  ...(simpleNotificationsApi && {
    [simpleNotificationsApi.reducerPath]: simpleNotificationsApi.reducer,
    ...(quotationApi && { [quotationApi.reducerPath]: quotationApi.reducer }),
  }),
  // ✅ ADD - Master Data API reducer
  ...(masterDataApi && { [masterDataApi.reducerPath]: masterDataApi.reducer }),
  // ✅ ADD - Commission API reducer
  ...(commissionApi && { [commissionApi.reducerPath]: commissionApi.reducer }),
  // ✅ ADD - Document API reducer
  // ...(documentApi && { [documentApi.reducerPath]: documentApi.reducer }),
});

// Test reducer creation
console.log('🔍 Testing reducer creation...');
const testState = rootReducer({} as any, { type: '@@INIT' });
console.log('🔍 Reducer state keys:', Object.keys(testState));

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Create middleware array
const createMiddleware = (getDefaultMiddleware: any) => {
  const defaultMiddleware = getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
      ignoredPaths: ['items.dates'],
    },
    immutableCheck: {
      ignoredPaths: ['ignoredPath'],
    },
  });

  // Add API middlewares only if they exist
  let middleware = defaultMiddleware;

  if (baseApi?.middleware) {
    middleware = middleware.concat(baseApi.middleware);
    console.log('✅ Added baseApi middleware');
  }

  if (authApi?.middleware) {
    middleware = middleware.concat(authApi.middleware);
    console.log('✅ Added authApi middleware');
  }

  if (dashboardApi?.middleware) {
    middleware = middleware.concat(dashboardApi.middleware);
    console.log('✅ Added dashboardApi middleware');
  }

  if (leadApi?.middleware) {
    middleware = middleware.concat(leadApi.middleware);
    console.log('✅ Added leadApi middleware');
  }

  if (simpleNotificationsApi?.middleware) {
    middleware = middleware.concat(simpleNotificationsApi.middleware);
    console.log('✅ Added simpleNotificationsApi middleware');
  }

  if (customerApi?.middleware) {
    middleware = middleware.concat(customerApi.middleware);
    console.log('✅ Added customerApi middleware');
  }

  if (servicesApi?.middleware) {
    middleware = middleware.concat(servicesApi.middleware);
    console.log('✅ Added servicesApi middleware');
  }

  // ✅ ADD - Master Data API middleware
  if (masterDataApi?.middleware) {
    middleware = middleware.concat(masterDataApi.middleware);
    console.log('✅ Added masterDataApi middleware');
  }

  if (quotationApi?.middleware) {
    middleware = middleware.concat(quotationApi.middleware);
    console.log('✅ Added quotationApi middleware');
  }

  if (commissionApi?.middleware) {
    middleware = middleware.concat(commissionApi.middleware);
    console.log('✅ Added commissionApi middleware');
  }
  // if (documentApi?.middleware) {
  //   middleware = middleware.concat(documentApi.middleware);
  //   console.log('✅ Added documentApi middleware');
  // }

  if (errorMiddleware) {
    middleware = middleware.concat(errorMiddleware);
    console.log('✅ Added errorMiddleware');
  }

  // Add cache invalidation listener middleware
  if (apiCacheListener?.middleware) {
    middleware = middleware.concat(apiCacheListener.middleware);
    console.log('✅ Added apiCacheListener middleware');
  }

  return middleware;
};

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: createMiddleware,
  devTools: __DEV__,
});

// Debug final store
console.log('🔍 Final store state keys:', Object.keys(store.getState()));

// Persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
