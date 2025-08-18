/**
 * ErrorBanner - Reusable error banner component
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export interface ErrorBannerProps {
  /** Error message to display */
  message: string;
  /** Callback when retry button is pressed */
  onRetry?: () => void;
  /** Test ID for testing */
  testID?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onRetry,
  testID = 'error-banner',
}) => {
  return (
    <View
      style={styles.container}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLabel={`Error: ${message}`}
    >
      <View style={styles.content}>
        <Icon name="alert-circle-outline" size={20} color="#D70015" />
        <Text style={styles.message}>{message}</Text>
      </View>

      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          testID={`${testID}-retry`}
          accessibilityLabel="Retry"
          accessibilityHint="Tap to retry the failed operation"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
    borderWidth: 1,
    borderRadius: 8,
    margin: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  message: {
    fontSize: 14,
    color: '#D70015',
    marginLeft: 8,
    flex: 1,
  },
  retryButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#D70015',
    borderRadius: 4,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ErrorBanner;
