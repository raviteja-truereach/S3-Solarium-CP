import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useGetNotificationsQuery } from '../../store/api/simpleNotificationsApi';

const MainStoreNotificationTest: React.FC = () => {
  const { data, error, isLoading, isError, isSuccess, refetch } =
    useGetNotificationsQuery();

  console.log('🔍 Main Store Query State:', {
    isLoading,
    isError,
    isSuccess,
    hasData: !!data,
    data: data,
    error: error,
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Main Store Notification Test</Text>

      <TouchableOpacity style={styles.button} onPress={refetch}>
        <Text style={styles.buttonText}>Refetch</Text>
      </TouchableOpacity>

      <View style={styles.status}>
        <Text>Loading: {isLoading.toString()}</Text>
        <Text>Success: {isSuccess.toString()}</Text>
        <Text>Error: {isError.toString()}</Text>
      </View>

      {isError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {JSON.stringify(error)}</Text>
        </View>
      )}

      {data && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataTitle}>✅ Data from Main Store:</Text>
          <Text>Success: {data.success?.toString()}</Text>
          <Text>Total: {data.data?.total}</Text>
          <Text>Unread Count: {data.data?.unreadCount}</Text>

          {data.data?.notifications?.map((notif: any, index: number) => (
            <View key={index} style={styles.notifItem}>
              <Text style={styles.notifTitle}>{notif.title}</Text>
              <Text style={styles.notifMessage}>{notif.message}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
  },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  status: {
    padding: 15,
    backgroundColor: '#f0f0f0',
    marginBottom: 15,
    borderRadius: 5,
  },
  errorContainer: {
    backgroundColor: '#ffe6e6',
    padding: 15,
    marginBottom: 15,
    borderRadius: 5,
  },
  errorText: { color: '#d32f2f' },
  dataContainer: { padding: 15, backgroundColor: '#d4edda', borderRadius: 5 },
  dataTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    fontSize: 16,
    color: '#155724',
  },
  notifItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginBottom: 10,
  },
  notifTitle: { fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  notifMessage: { fontSize: 13, color: '#333', marginBottom: 4 },
});

export default MainStoreNotificationTest;
