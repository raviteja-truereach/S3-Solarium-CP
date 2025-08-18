import { store } from '../store/store';
import { simpleNotificationsApi } from '../store/api/simpleNotificationsApi';

export const debugStoreConfiguration = () => {
  console.log('🔍 Debug Store Configuration:');
  console.log('  - Store exists:', !!store);
  console.log('  - Store state keys:', Object.keys(store.getState()));
  console.log('  - simpleNotificationsApi exists:', !!simpleNotificationsApi);
  console.log('  - Reducer path:', simpleNotificationsApi.reducerPath);
  console.log('  - Has reducer:', !!simpleNotificationsApi.reducer);
  console.log('  - Has middleware:', !!simpleNotificationsApi.middleware);
  console.log('  - Middleware type:', typeof simpleNotificationsApi.middleware);

  // Check if the API slice is in the store
  const state = store.getState();
  console.log('  - API in store:', simpleNotificationsApi.reducerPath in state);
  console.log(
    '  - API state:',
    state[simpleNotificationsApi.reducerPath as keyof typeof state]
  );
};
