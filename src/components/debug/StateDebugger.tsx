import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

export const StateDebugger: React.FC = () => {
  const fullState = useSelector((state: RootState) => state);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Redux State Debug</Text>
      <Text style={styles.subtitle}>State Keys:</Text>
      <Text style={styles.code}>{Object.keys(fullState).join(', ')}</Text>

      <Text style={styles.subtitle}>Lead State:</Text>
      <Text style={styles.code}>{JSON.stringify(fullState.lead, null, 2)}</Text>

      <Text style={styles.subtitle}>Lead Items Count:</Text>
      <Text style={styles.code}>{fullState.lead?.items?.length || 0}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 12,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
});
