/**
 * Document Upload Error Boundary
 * Catches and handles errors in upload flow
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import AppButton from '../common/AppButton';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * DocumentUploadErrorBoundary Class Component
 * Catches upload-related errors and provides recovery
 */
export class DocumentUploadErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state to show error UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('📤 Document Upload Error Boundary caught error:', error);
    console.error('📤 Error Info:', errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // You could also log to crash reporting service here
    // crashlytics().recordError(error);
  }

  handleReset = () => {
    // Reset error boundary state
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });

    // Call parent reset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <DocumentUploadErrorDisplay
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Error Display Component (Function Component with Hooks)
 */
const DocumentUploadErrorDisplay: React.FC<{
  error?: Error;
  onReset: () => void;
}> = ({ error, onReset }) => {
  const theme = useTheme();

  const styles = StyleSheet.create({
    container: {
      margin: 16,
    },
    content: {
      padding: 24,
      alignItems: 'center',
    },
    icon: {
      fontSize: 48,
      marginBottom: 16,
    },
    title: {
      color: theme.colors.error,
      fontWeight: '600',
      marginBottom: 8,
      textAlign: 'center',
    },
    message: {
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 20,
    },
    errorDetails: {
      backgroundColor: theme.colors.errorContainer,
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
      width: '100%',
    },
    errorText: {
      color: theme.colors.onErrorContainer,
      fontSize: 12,
      fontFamily: 'monospace',
    },
    buttonContainer: {
      width: '100%',
    },
  });

  return (
    <Card style={styles.container} mode="outlined">
      <Card.Content style={styles.content}>
        <Text style={styles.icon}>🚫</Text>

        <Text variant="titleMedium" style={styles.title}>
          Upload System Error
        </Text>

        <Text variant="bodyMedium" style={styles.message}>
          Something went wrong with the upload system. Please try restarting the
          upload process.
        </Text>

        {__DEV__ && error && (
          <View style={styles.errorDetails}>
            <Text style={styles.errorText}>
              {error.name}: {error.message}
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <AppButton
            mode="contained"
            onPress={onReset}
            title="Reset Upload System"
            style={{ borderRadius: 8 }}
            accessible={true}
            accessibilityLabel="Reset the upload system and try again"
            accessibilityHint="Double tap to reset the upload system"
          />
        </View>
      </Card.Content>
    </Card>
  );
};

export default DocumentUploadErrorBoundary;
