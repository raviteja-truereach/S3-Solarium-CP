/**
 * Quotation Empty State Component
 * Handles different empty/error states for quotations with user-friendly messages
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';

export type QuotationEmptyStateType =
  | 'none' // No quotations exist
  | 'filtered' // No results for current filters/search
  | 'offline' // Offline with no cached data
  | 'error' // API/Network error
  | 'unauthorized' // Authentication error
  | 'server-error'; // Server error

interface QuotationEmptyStateProps {
  /**
   * Type of empty state to display
   */
  type: QuotationEmptyStateType;

  /**
   * Custom title (overrides default for type)
   */
  title?: string;

  /**
   * Custom message (overrides default for type)
   */
  message?: string;

  /**
   * Custom action button text
   */
  actionText?: string;

  /**
   * Action button press handler
   */
  onRetry?: () => void;

  /**
   * Secondary action (e.g., Clear Filters)
   */
  onSecondaryAction?: () => void;

  /**
   * Secondary action text
   */
  secondaryActionText?: string;

  /**
   * Custom icon/emoji to display
   */
  icon?: string;

  /**
   * Test ID for testing
   */
  testID?: string;

  /**
   * Whether retry button should be disabled
   */
  retryDisabled?: boolean;
}

/**
 * Get default empty message based on type
 */
function getEmptyMessage(type: QuotationEmptyStateType): {
  title: string;
  message: string;
  icon: string;
  actionText: string;
} {
  switch (type) {
    case 'none':
      return {
        title: 'No quotations yet',
        message:
          'Create your first quotation to get started with pricing and proposals for your leads.',
        icon: '📋',
        actionText: 'Refresh',
      };

    case 'filtered':
      return {
        title: 'No quotations match your filters',
        message:
          "Try adjusting your search terms or filter criteria to find what you're looking for.",
        icon: '🔍',
        actionText: 'Clear Filters',
      };

    case 'offline':
      return {
        title: 'No cached quotations',
        message:
          "You're offline and no quotations are available in cache. Connect to internet to sync data.",
        icon: '📵',
        actionText: 'Check Connection',
      };

    case 'error':
      return {
        title: 'Failed to load quotations',
        message:
          'Something went wrong while loading quotations. Check your connection and try again.',
        icon: '⚠️',
        actionText: 'Retry',
      };

    case 'unauthorized':
      return {
        title: 'Authentication required',
        message:
          'Your session has expired. Please log in again to access quotations.',
        icon: '🔒',
        actionText: 'Login',
      };

    case 'server-error':
      return {
        title: 'Server error',
        message:
          'The server is experiencing issues. Please try again later or contact support.',
        icon: '🔧',
        actionText: 'Retry',
      };

    default:
      return {
        title: 'No quotations available',
        message: 'No quotations are currently available.',
        icon: '📋',
        actionText: 'Refresh',
      };
  }
}

export const QuotationEmptyState: React.FC<QuotationEmptyStateProps> = ({
  type,
  title,
  message,
  actionText,
  onRetry,
  onSecondaryAction,
  secondaryActionText,
  icon,
  testID = 'quotation-empty-state',
  retryDisabled = false,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  const defaults = getEmptyMessage(type);

  const displayTitle = title || defaults.title;
  const displayMessage = message || defaults.message;
  const displayIcon = icon || defaults.icon;
  const displayActionText = actionText || defaults.actionText;

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.icon}>{displayIcon}</Text>
      <Text style={styles.title}>{displayTitle}</Text>
      <Text style={styles.message}>{displayMessage}</Text>

      <View style={styles.buttonContainer}>
        {onRetry && (
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              retryDisabled && styles.disabledButton,
            ]}
            onPress={onRetry}
            disabled={retryDisabled}
            testID={`${testID}-retry-button`}
          >
            <Text
              style={[
                styles.buttonText,
                styles.primaryButtonText,
                retryDisabled && styles.disabledButtonText,
              ]}
            >
              {displayActionText}
            </Text>
          </TouchableOpacity>
        )}

        {onSecondaryAction && secondaryActionText && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onSecondaryAction}
            testID={`${testID}-secondary-button`}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              {secondaryActionText}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    icon: {
      fontSize: 48,
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors?.onSurface || '#333',
      marginBottom: 8,
      textAlign: 'center',
    },
    message: {
      fontSize: 14,
      color: theme.colors?.onSurfaceVariant || '#666',
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
      maxWidth: 280,
    },
    buttonContainer: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
    },
    button: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      minWidth: 120,
      alignItems: 'center',
    },
    primaryButton: {
      backgroundColor: theme.colors?.primary || '#007AFF',
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors?.outline || '#007AFF',
    },
    disabledButton: {
      backgroundColor: theme.colors?.surfaceDisabled || '#BDBDBD',
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    primaryButtonText: {
      color: theme.colors?.onPrimary || 'white',
    },
    secondaryButtonText: {
      color: theme.colors?.primary || '#007AFF',
    },
    disabledButtonText: {
      color: theme.colors?.onSurfaceVariant || '#666',
    },
  });

export default QuotationEmptyState;
