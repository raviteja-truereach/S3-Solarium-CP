/**
 * Splash Screen
 * Shows app logo and auto-navigates to Login after 1 second
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { AuthStackParamList } from '@navigation/types';

type SplashScreenNavigationProp = NavigationProp<AuthStackParamList, 'Splash'>;

/**
 * Splash Screen Component
 * Displays loading state and auto-navigates to Login
 */
export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashScreenNavigationProp>();

  useEffect(() => {
    // Auto-navigate to Login after 1 second
    const timer = setTimeout(() => {
      navigation.navigate('Login');
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.appName}>Solarium CP</Text>
      <Text style={styles.subtitle}>Channel Partner App</Text>
      <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  loader: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default SplashScreen;
