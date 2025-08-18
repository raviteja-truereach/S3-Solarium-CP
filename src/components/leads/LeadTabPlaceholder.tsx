/**
 * Lead Tab Placeholder Component
 * Enhanced placeholder for tabs with error handling and accessibility
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { IconButton } from 'react-native-paper';

interface LeadTabPlaceholderProps {
  tabName: string;
  icon?: string;
  isError?: boolean;
  onRetry?: () => void;
  testID?: string;
}

/**
 * Placeholder component for tabs under development or in error state
 */
export const LeadTabPlaceholder: React.FC<LeadTabPlaceholderProps> = ({ 
  tabName, 
  icon = 'construction',
  isError = false,
  onRetry,
  testID,
}) => {
  // Error state content
  if (isError) {
    return (
      <View 
        style={styles.container} 
        testID={testID || `${tabName.toLowerCase()}-tab-error`}
        accessibilityRole="text"
        accessibilityLabel={`${tabName} tab error state`}
      >
        <Card style={[styles.card, styles.errorCard]}>
          <Card.Content style={styles.cardContent}>
            <IconButton
              icon="alert-circle"
              size={48}
              iconColor="#FF3B30"
              style={styles.icon}
            />
            <Text 
              variant="headlineSmall" 
              style={[styles.title, styles.errorTitle]}
              accessibilityRole="text"
            >
              Tab unavailable
            </Text>
            <Text 
              variant="bodyMedium" 
              style={[styles.subtitle, styles.errorSubtitle]}
              accessibilityRole="text"
            >
              Try again later
            </Text>
            <Text 
              variant="bodySmall" 
              style={[styles.description, styles.errorDescription]}
              accessibilityRole="text"
            >
              Something went wrong while loading this tab. Please try again.
            </Text>
            
            {onRetry && (
              <Button
                mode="outlined"
                onPress={onRetry}
                style={styles.retryButton}
                icon="refresh"
                accessibilityLabel={`Retry loading ${tabName} tab`}
                accessibilityRole="button"
              >
                Try Again
              </Button>
            )}
          </Card.Content>
        </Card>
      </View>
    );
  }

  // Normal placeholder content
  return (
    <View 
      style={styles.container}
      testID={testID || `${tabName.toLowerCase()}-tab-placeholder`}
      accessibilityRole="text"
      accessibilityLabel={`${tabName} tab placeholder`}
    >
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          {/* <IconButton
            icon={icon}
            size={48}
            iconColor="#666"
            style={styles.icon}
          /> */}
          <Text 
            variant="headlineSmall" 
            style={styles.title}
            accessibilityRole="text"
          >
            {tabName}
          </Text>
          <Text 
            variant="bodyMedium" 
            style={styles.subtitle}
            accessibilityRole="text"
          >
            Coming in Sprint-4
          </Text>
          <Text 
            variant="bodySmall" 
            style={styles.description}
            accessibilityRole="text"
          >
            This feature is currently under development and will be available in the next sprint.
          </Text>
          
          {/* Disabled action buttons to show they're not functional */}
          <View style={styles.disabledActions}>
            <Button
              mode="outlined"
              disabled={true}
              style={styles.disabledButton}
            //   icon="plus"
              accessibilityLabel={`Add ${tabName} - disabled`}
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
            >
              Add {tabName}
            </Button>
            <Button
              mode="outlined"
              disabled={true}
              style={styles.disabledButton}
            //   icon="eye"
              accessibilityLabel={`View ${tabName} - disabled`}
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
            >
              View All
            </Button>
          </View>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    elevation: 2,
    borderRadius: 12,
  },
  errorCard: {
    borderColor: '#FF3B30',
    borderWidth: 1,
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
    fontWeight: 'bold',
  },
  errorTitle: {
    color: '#FF3B30',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 12,
    color: '#004C89',
    fontWeight: '600',
  },
  errorSubtitle: {
    color: '#FF3B30',
  },
  description: {
    textAlign: 'center',
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 24,
    lineHeight: 20,
  },
  errorDescription: {
    color: '#8B0000',
  },
  disabledActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  retryButton: {
    marginTop: 16,
  },
});

export default LeadTabPlaceholder;