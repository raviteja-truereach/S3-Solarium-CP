/**
 * Simple Test App - Test Redux without Navigation
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector, useAppDispatch } from '@hooks/reduxHooks';
import { loginSuccess, logout } from '@store/slices/authSlice';

export const SimpleTestApp: React.FC = () => {
  const { isLoggedIn, user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  const handleLogin = () => {
    dispatch(
      loginSuccess({
        token: 'test-token',
        user: { id: '1', name: 'Test User', phone: '1234567890' },
      })
    );
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Redux Test App</Text>
      <Text style={styles.status}>
        Status: {isLoggedIn ? 'Logged In' : 'Logged Out'}
      </Text>
      {user && <Text style={styles.user}>User: {user.name}</Text>}
      <TouchableOpacity
        style={styles.button}
        onPress={isLoggedIn ? handleLogout : handleLogin}
      >
        <Text style={styles.buttonText}>{isLoggedIn ? 'Logout' : 'Login'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  status: {
    fontSize: 18,
    marginBottom: 10,
  },
  user: {
    fontSize: 16,
    marginBottom: 20,
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
