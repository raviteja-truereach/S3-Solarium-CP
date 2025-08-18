import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useAppSelector } from '../store/hooks';

export const ReduxStateViewer = () => {
  const leadState = useAppSelector((state: any) => state.lead);
  const allState = useAppSelector((state: any) => state);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔍 REDUX STATE DEBUG</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lead State:</Text>
        <Text style={styles.code}>{JSON.stringify(leadState, null, 2)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Redux Keys:</Text>
        <Text style={styles.code}>{Object.keys(allState).join(', ')}</Text>
      </View>

      {leadState?.items && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lead Items:</Text>
          <Text style={styles.code}>
            Count: {Object.keys(leadState.items).length}
            {'\n'}
            Keys: {Object.keys(leadState.items).join(', ')}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
  },
  section: {
    backgroundColor: 'white',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  code: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#666',
  },
});
