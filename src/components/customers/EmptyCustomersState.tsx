/**
 * Empty Customers State Component
 * Follows exact pattern from leads EmptyState for consistency
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';

interface EmptyCustomersStateProps {
  /**
   * Custom title for empty state
   */
  title?: string;

  /**
   * Custom message for empty state
   */
  message?: string;

  /**
   * Custom action button text
   */
  actionText?: string;

  /**
   * Action button press handler
   */
  onActionPress?: () => void;

  /**
   * Custom icon/emoji to display
   */
  icon?: string;

  /**
   * Test ID for testing
   */
  testID?: string;

  /**
   * Whether to show action button
   */
  showAction?: boolean;
}

export const EmptyCustomersState: React.FC<EmptyCustomersStateProps> = ({
  title = 'No customers found',
  message = 'Start building your customer base by adding leads and converting them to customers.',
  actionText = 'Add Lead',
  onActionPress,
  icon = '👥',
  testID = 'empty-customers-state',
  showAction = true,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {showAction && onActionPress && (
        <TouchableOpacity
          style={styles.button}
          onPress={onActionPress}
          testID={`${testID}-action-button`}
        >
          <Text style={styles.buttonText}>{actionText}</Text>
        </TouchableOpacity>
      )}
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
    button: {
      backgroundColor: theme.colors?.primary || '#007AFF',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    buttonText: {
      color: theme.colors?.onPrimary || 'white',
      fontSize: 14,
      fontWeight: '600',
    },
  });

export default EmptyCustomersState;
