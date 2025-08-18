import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useGetLeadsQuery } from '../../store/api/leadApi';
import { useSelector } from 'react-redux';
import {
  selectLeads,
  selectLeadsTotalCount,
} from '../../store/slices/leadSlice';
import type { RootState } from '../../store';

export const LeadsApiTest: React.FC = () => {
  const { error, isLoading, refetch } = useGetLeadsQuery({
    offset: 0,
    limit: 25,
  });

  // Get leads from the slice (populated by onQueryStarted)
  const leads = useSelector((state: RootState) => selectLeads(state));
  const totalCount = useSelector((state: RootState) =>
    selectLeadsTotalCount(state)
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading leads...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Error: {JSON.stringify(error)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        Leads ({leads?.length || 0} loaded, {totalCount} total)
      </Text>
      <FlatList
        data={leads || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.title}>
              {item.customerName || 'Unknown Customer'}
            </Text>
            <Text>ID: {item.id}</Text>
            <Text>Status: {item.status}</Text>
            <Text>Phone: {item.phone}</Text>
            <Text>Address: {item.address}</Text>
            {item.services && <Text>Services: {item.services.join(', ')}</Text>}
            <Text>Assigned: {item.assignedTo}</Text>
          </View>
        )}
        onRefresh={refetch}
        refreshing={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  item: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
    borderRadius: 8,
  },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  error: { color: 'red', textAlign: 'center' },
});
