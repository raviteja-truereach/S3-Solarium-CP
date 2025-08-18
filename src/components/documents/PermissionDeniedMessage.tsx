/**
 * Permission Denied Message Component
 * Accessible error component for document permission issues
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/Ionicons';

export interface PermissionDeniedMessageProps {
  /** Type of permission denied */
  type: 'camera' | 'photoLibrary' | 'files';
  /** Error message to display */
  message?: string;
  /** Callback when retry button is pressed */
  onRetry?: () => void;
  /** Callback to open device settings */
  onOpenSettings?: () => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * PermissionDeniedMessage Component
 * Displays accessible error message for permission denials
 */
export const PermissionDeniedMessage: React.FC<
  PermissionDeniedMessageProps
> = ({
  type,
  message,
  onRetry,
  onOpenSettings,
  testID = 'permission-denied-message',
}) => {
  const theme = useTheme();

  const getPermissionDetails = () => {
    switch (type) {
      case 'camera':
        return {
          icon: 'camera-outline',
          title: 'Camera Access Required',
          defaultMessage:
            'This app needs camera access to take photos of documents.',
          settingsMessage: 'Enable camera permission in device settings',
        };
      case 'photoLibrary':
        return {
          icon: 'images-outline',
          title: 'Photo Library Access Required',
          defaultMessage:
            'This app needs photo library access to select images.',
          settingsMessage: 'Enable photo library permission in device settings',
        };
      case 'files':
        return {
          icon: 'document-outline',
          title: 'File Access Required',
          defaultMessage: 'This app needs file access to select documents.',
          settingsMessage: 'Enable file access permission in device settings',
        };
    }
  };

  const permissionDetails = getPermissionDetails();
  const displayMessage = message || permissionDetails.defaultMessage;

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.errorContainer,
      borderRadius: 8,
      padding: 16,
      margin: 16,
      alignItems: 'center',
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.error,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    icon: {
      color: theme.colors.onError,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.onErrorContainer,
      marginBottom: 8,
      textAlign: 'center',
    },
    message: {
      fontSize: 14,
      color: theme.colors.onErrorContainer,
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 20,
    },
    buttonsContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 6,
      minWidth: 100,
      alignItems: 'center',
    },
    buttonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    buttonText: {
      color: theme.colors.onPrimary,
      fontSize: 14,
      fontWeight: '500',
    },
    buttonTextSecondary: {
      color: theme.colors.primary,
    },
  });

  return (
    <View
      style={styles.container}
      testID={testID}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={`${permissionDetails.title}. ${displayMessage}`}
    >
      {/* Permission Icon */}
      <View style={styles.iconContainer} accessible={false}>
        <Icon name={permissionDetails.icon} size={32} style={styles.icon} />
      </View>

      {/* Title */}
      <Text
        style={styles.title}
        accessible={true}
        accessibilityRole="header"
        testID={`${testID}-title`}
      >
        {permissionDetails.title}
      </Text>

      {/* Message */}
      <Text
        style={styles.message}
        accessible={true}
        testID={`${testID}-message`}
      >
        {displayMessage}
      </Text>

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
        {onRetry && (
          <TouchableOpacity
            style={styles.button}
            onPress={onRetry}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Retry ${type} permission request`}
            accessibilityHint="Double tap to request permission again"
            testID={`${testID}-retry-button`}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        )}

        {onOpenSettings && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={onOpenSettings}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Open device settings to grant permission"
            accessibilityHint="Double tap to open device settings"
            testID={`${testID}-settings-button`}
          >
            <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
              Settings
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
