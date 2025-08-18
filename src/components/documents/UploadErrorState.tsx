/**
 * Upload Error State Component
 * Error display with retry functionality
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import AppButton from '../common/AppButton';

export interface ErrorProps {
  /** Error message */
  error: string;
  /** Callback for retry action */
  onRetry: () => void;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** File name that failed */
  fileName?: string;
  /** Additional error details */
  errorDetails?: string;
}

/**
 * UploadErrorState Component
 * Displays upload errors with retry option
 */
export const UploadErrorState: React.FC<ErrorProps> = ({
  error,
  onRetry,
  isRetrying = false,
  fileName,
  errorDetails,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  // Get error icon based on error type
  const getErrorIcon = (): string => {
    if (error.toLowerCase().includes('network')) return '📶';
    if (
      error.toLowerCase().includes('token') ||
      error.toLowerCase().includes('expired')
    )
      return '⏰';
    if (error.toLowerCase().includes('permission')) return '🔒';
    if (error.toLowerCase().includes('limit')) return '📊';
    return '❌';
  };

  // Get retry button text
  const getRetryText = (): string => {
    if (isRetrying) return 'Retrying...';
    if (
      error.toLowerCase().includes('token') ||
      error.toLowerCase().includes('expired')
    ) {
      return 'Get New Token & Retry';
    }
    return 'Retry Upload';
  };

  return (
    <Card style={styles.container} mode="outlined">
      <Card.Content style={styles.content}>
        {/* Error icon */}
        <Text style={styles.errorIcon}>{getErrorIcon()}</Text>

        {/* Error title */}
        <Text variant="titleMedium" style={styles.errorTitle}>
          Upload Failed
        </Text>

        {/* File name */}
        {fileName && (
          <Text variant="bodyMedium" style={styles.fileName} numberOfLines={2}>
            {fileName}
          </Text>
        )}

        {/* Error message */}
        <Text variant="bodyMedium" style={styles.errorMessage}>
          {error}
        </Text>

        {/* Error details */}
        {errorDetails && (
          <Text variant="bodySmall" style={styles.errorDetails}>
            {errorDetails}
          </Text>
        )}

        {/* Retry button */}
        <View style={styles.buttonContainer}>
          <AppButton
            mode="contained"
            onPress={onRetry}
            disabled={isRetrying}
            loading={isRetrying}
            title={getRetryText()}
            style={styles.retryButton}
            accessible={true}
            accessibilityLabel={`${getRetryText()} for ${
              fileName || 'document'
            }`}
            accessibilityHint="Double tap to retry the failed upload"
          />
        </View>
      </Card.Content>
    </Card>
  );
};

const createStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      margin: 16,
      borderColor: theme.colors.error,
      borderWidth: 1,
    },
    content: {
      alignItems: 'center',
      padding: 16,
    },
    errorIcon: {
      fontSize: 32,
      marginBottom: 12,
    },
    errorTitle: {
      color: theme.colors.error,
      fontWeight: '600',
      marginBottom: 8,
      textAlign: 'center',
    },
    fileName: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: 8,
      textAlign: 'center',
      fontWeight: '500',
    },
    errorMessage: {
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: 8,
      lineHeight: 20,
    },
    errorDetails: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: 16,
      fontStyle: 'italic',
    },
    buttonContainer: {
      width: '100%',
    },
    retryButton: {
      borderRadius: 8,
    },
  });

export default UploadErrorState;
