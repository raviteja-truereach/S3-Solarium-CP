/**
 * PersistGate Provider
 * Handles Redux persist rehydration
 */
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor } from './index';

interface PersistGateProviderProps {
  children: React.ReactNode;
}

/**
 * Loading component shown during rehydration
 */
const Loading: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#007AFF" />
  </View>
);

/**
 * PersistGate Provider Component
 * Wraps children with PersistGate for Redux persistence
 */
export const PersistGateProvider: React.FC<PersistGateProviderProps> = ({
  children,
}) => {
  return (
    <PersistGate loading={<Loading />} persistor={persistor}>
      {children}
    </PersistGate>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
});

export default PersistGateProvider;
