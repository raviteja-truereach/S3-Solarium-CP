import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  useGetUnreadNotificationsQuery,
  notificationsApi,
} from '../../store/api/notificationsApi';
import { useAppSelector, useAppDispatch } from '../../hooks/reduxHooks';

const NotificationsTestScreen: React.FC = () => {
  const [shouldFetch, setShouldFetch] = useState(false);
  const dispatch = useAppDispatch();

  // Get the RTK Query state directly from store
  const notificationsState = useAppSelector((state) => state.notificationsApi);

  const queryState = useGetUnreadNotificationsQuery(
    { page: 1, limit: 20 },
    {
      skip: !shouldFetch,
      // Add these for debugging
      refetchOnMountOrArgChange: true,
      refetchOnReconnect: true,
    }
  );

  // Debug effect to log everything
  useEffect(() => {
    console.log('🔍 Component Query State Update:');
    console.log('  - shouldFetch:', shouldFetch);
    console.log('  - requestId:', queryState.requestId);
    console.log('  - data:', queryState.data);
    console.log('  - error:', queryState.error);
    console.log('  - isLoading:', queryState.isLoading);
    console.log('  - isFetching:', queryState.isFetching);
    console.log('  - isSuccess:', queryState.isSuccess);
    console.log('  - isError:', queryState.isError);
    console.log('  - status:', queryState.status);
    console.log('  - fulfilledTimeStamp:', queryState.fulfilledTimeStamp);
    console.log('  - currentData:', queryState.currentData);

    // Log the actual Redux state
    console.log('🔍 Redux notificationsApi State:');
    console.log(JSON.stringify(notificationsState, null, 2));
  }, [queryState, shouldFetch, notificationsState]);

  const handleStartFetch = () => {
    console.log('🔄 Starting fetch...');
    setShouldFetch(true);
  };

  const handleManualDispatch = async () => {
    console.log('🔄 Manual dispatch...');
    try {
      const result = await dispatch(
        notificationsApi.endpoints.getUnreadNotifications.initiate(
          { page: 1, limit: 20 },
          { forceRefetch: true }
        )
      );
      console.log('🔍 Manual dispatch result:', result);
    } catch (error) {
      console.error('❌ Manual dispatch error:', error);
    }
  };

  const handleDirectQuery = async () => {
    console.log('🔄 Direct query...');
    try {
      // Direct fetch to compare
      const response = await fetch(
        'https://truereach-production.up.railway.app/api/v1/notifications?page=1&limit=20&status=unread&sortBy=createdAt&sortOrder=desc',
        {
          headers: {
            Authorization:
              'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJDUC0wMDEiLCJlbWFpbCI6ImNwMUBzb2xhcml1bS5jb20iLCJwaG9uZSI6Ijk4NzY1NDMyMTMiLCJyb2xlIjoiQ1AiLCJuYW1lIjoiQ2hhbm5lbCBQYXJ0bmVyIDEiLCJpYXQiOjE3NTI0NzQzMTEsImV4cCI6MTc1MjU2MDcxMX0.aUr1BjQPmqE59k78jMzgn6T3ifewK7_YU_lWlCNrddM',
            accept: '*/*',
          },
        }
      );
      const data = await response.json();
      console.log('🔍 Direct fetch result:', data);
    } catch (error) {
      console.error('❌ Direct fetch error:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Notifications Debug</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleStartFetch}>
          <Text style={styles.buttonText}>Start RTK Query</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleManualDispatch}>
          <Text style={styles.buttonText}>Manual Dispatch</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleDirectQuery}>
          <Text style={styles.buttonText}>Direct Fetch</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={queryState.refetch}>
          <Text style={styles.buttonText}>Refetch</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>Query Status:</Text>
        <Text>Should Fetch: {shouldFetch.toString()}</Text>
        <Text>Status: {queryState.status}</Text>
        <Text>Is Loading: {queryState.isLoading.toString()}</Text>
        <Text>Is Fetching: {queryState.isFetching.toString()}</Text>
        <Text>Is Success: {queryState.isSuccess.toString()}</Text>
        <Text>Is Error: {queryState.isError.toString()}</Text>
        <Text>Has Data: {!!queryState.data}</Text>
        <Text>Has CurrentData: {!!queryState.currentData}</Text>
        <Text>Request ID: {queryState.requestId || 'none'}</Text>
      </View>

      {queryState.isError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error:</Text>
          <Text style={styles.errorText}>
            {JSON.stringify(queryState.error, null, 2)}
          </Text>
        </View>
      )}

      {queryState.data && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataTitle}>RTK Query Data:</Text>
          <Text>Success: {queryState.data.success?.toString()}</Text>
          <Text>Total: {queryState.data.data?.total}</Text>
          <Text>Unread Count: {queryState.data.data?.unreadCount}</Text>
          <Text>
            Notifications: {queryState.data.data?.notifications?.length}
          </Text>

          {queryState.data.data?.notifications?.map((notif, index) => (
            <View key={index} style={styles.notifItem}>
              <Text style={styles.notifTitle}>{notif.title}</Text>
              <Text>{notif.message}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Show raw Redux state */}
      <View style={styles.reduxContainer}>
        <Text style={styles.reduxTitle}>Raw Redux State:</Text>
        <Text style={styles.reduxText}>
          {notificationsState && JSON.stringify(notificationsState, null, 2).substring(0, 500)}...
        </Text>
      </View> 
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: { marginBottom: 20 },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 5,
    marginBottom: 8,
  },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  statusContainer: {
    padding: 15,
    backgroundColor: '#f0f0f0',
    marginBottom: 15,
    borderRadius: 5,
  },
  statusTitle: { fontWeight: 'bold', marginBottom: 10 },
  errorContainer: {
    backgroundColor: '#ffe6e6',
    padding: 15,
    marginBottom: 15,
    borderRadius: 5,
  },
  errorTitle: { fontWeight: 'bold', color: '#d32f2f', marginBottom: 5 },
  errorText: { color: '#d32f2f', fontSize: 12 },
  dataContainer: {
    padding: 15,
    backgroundColor: '#e8f5e8',
    marginBottom: 15,
    borderRadius: 5,
  },
  dataTitle: { fontWeight: 'bold', marginBottom: 10 },
  notifItem: { padding: 8, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  notifTitle: { fontWeight: 'bold', fontSize: 14 },
  reduxContainer: { padding: 15, backgroundColor: '#f5f5f5', borderRadius: 5 },
  reduxTitle: { fontWeight: 'bold', marginBottom: 10 },
  reduxText: { fontSize: 10, fontFamily: 'monospace' },
});

export default NotificationsTestScreen;
