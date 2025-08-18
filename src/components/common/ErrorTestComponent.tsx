/**
 * Error Test Component
 * Used for testing error boundary functionality
 * THIS COMPONENT IS FOR TESTING ONLY - NOT FOR PRODUCTION
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ErrorTestComponentProps {
  shouldThrow?: boolean;
}

/**
 * Component that can throw errors for testing ErrorBoundary
 * WARNING: Only use this for testing purposes
 */
export const ErrorTestComponent: React.FC<ErrorTestComponentProps> = ({
  shouldThrow = false,
}) => {
  const [throwError, setThrowError] = useState(shouldThrow);

  if (throwError) {
    throw new Error('Test error thrown by ErrorTestComponent');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Error Test Component</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setThrowError(true)}
        testID="throw-error-button"
      >
        <Text style={styles.buttonText}>Throw Error</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#FF6B6B',
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ErrorTestComponent;
