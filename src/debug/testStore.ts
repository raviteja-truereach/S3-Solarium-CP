// Test file to check store configuration
import { store } from '../store/store';
import { notificationsApi } from '../store/api/notificationsApi';

export const debugStore = () => {
  console.log('🔍 Store Debug:');
  console.log('  - Store state keys:', Object.keys(store.getState()));
  console.log(
    '  - notificationsApi reducerPath:',
    notificationsApi.reducerPath
  );
  console.log(
    '  - notificationsApi in state:',
    notificationsApi.reducerPath in store.getState()
  );
  console.log(
    '  - notificationsApi middleware exists:',
    !!notificationsApi.middleware
  );

  // Test a simple dispatch
  try {
    const result = store.dispatch(
      notificationsApi.endpoints.getUnreadNotifications.initiate({
        page: 1,
        limit: 1,
      })
    );
    console.log('  - Test dispatch successful:', !!result);
  } catch (error) {
    console.error('  - Test dispatch failed:', error);
  }
};
