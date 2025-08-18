/**
 * Placeholder Auth Stack
 * Temporary component until ST-02.3 implementation
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppDispatch } from '@hooks/reduxHooks';
import { loginSuccess } from '@store/slices/authSlice';

/**
 * Temporary placeholder for AuthStack
 * Will be replaced in ST-02.3
 */
export const PlaceholderAuthStack: React.FC = () => {
  const dispatch = useAppDispatch();

  const handleLogin = () => {
    // Simulate login for testing navigation
    dispatch(
      loginSuccess({
        token: 'fake-token-123',
        user: {
          id: '1',
          name: 'Test User',
          phone: '1234567890',
        },
      })
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚧 Auth Stack Placeholder</Text>
      <Text style={styles.subtitle}>This will be replaced in ST-02.3</Text>
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Fake Login (Test Navigation)</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
