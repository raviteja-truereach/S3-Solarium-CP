import { configureStore } from '@reduxjs/toolkit';
import { simpleNotificationsApi } from './api/simpleNotificationsApi';

// Create a minimal store just for testing notifications
export const testStore = configureStore({
  reducer: {
    [simpleNotificationsApi.reducerPath]: simpleNotificationsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(simpleNotificationsApi.middleware),
});

export type TestRootState = ReturnType<typeof testStore.getState>;
export type TestAppDispatch = typeof testStore.dispatch;
