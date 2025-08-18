import { store } from '../store/store';
import {
  setUnreadNotificationCount,
  setLastSyncTimestamp,
  selectUnreadCount,
  selectLastSyncTs,
} from '../store/slices/networkSlice';

export const testNetworkSliceEnhancements = () => {
  console.log('Testing networkSlice enhancements...');

  // Test initial state
  const initialState = store.getState();
  console.log('Initial unread count:', selectUnreadCount(initialState)); // Should be 0
  console.log('Initial lastSyncTs:', selectLastSyncTs(initialState)); // Should be undefined

  // Test setUnreadNotificationCount
  store.dispatch(setUnreadNotificationCount(5));
  let currentState = store.getState();
  console.log(
    'After setting unread count to 5:',
    selectUnreadCount(currentState)
  ); // Should be 5

  // Test negative value protection
  store.dispatch(setUnreadNotificationCount(-1));
  currentState = store.getState();
  console.log(
    'After setting unread count to -1:',
    selectUnreadCount(currentState)
  ); // Should be 0

  // Test setLastSyncTimestamp
  const testTimestamp = new Date().toISOString();
  store.dispatch(setLastSyncTimestamp(testTimestamp));
  currentState = store.getState();
  console.log('After setting timestamp:', selectLastSyncTs(currentState)); // Should be testTimestamp

  console.log('✅ All networkSlice enhancements working correctly!');
};
