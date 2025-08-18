/**
 * Tab Error Boundary
 * Error boundary specifically for tab content with fallback UI
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { IconButton } from 'react-native-paper';

interface Props {
  children: ReactNode;
  tabName: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class TabErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `❌ Tab Error Boundary caught error in ${this.props.tabName}:`,
      error
    );
    console.error('Error Info:', errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={styles.container}
          testID={`${this.props.tabName.toLowerCase()}-tab-error-boundary`}
        >
          <Card style={styles.errorCard}>
            <Card.Content style={styles.cardContent}>
              {/* <IconButton
                icon="alert-circle"
                size={48}
                iconColor="#FF3B30"
                style={styles.icon}
              /> */}
              <Text
                variant="headlineSmall"
                style={styles.title}
                accessibilityRole="text"
              >
                Tab unavailable
              </Text>
              <Text
                variant="bodyMedium"
                style={styles.subtitle}
                accessibilityRole="text"
              >
                Try again later
              </Text>
              <Text
                variant="bodySmall"
                style={styles.description}
                accessibilityRole="text"
              >
                An unexpected error occurred while loading the{' '}
                {this.props.tabName} tab.
              </Text>
{/* 
              <Button
                mode="outlined"
                onPress={this.handleRetry}
                style={styles.retryButton}
                icon="refresh"
                accessibilityLabel={`Retry loading ${this.props.tabName} tab`}
                accessibilityRole="button"
              >
                Try Again
              </Button> */}
            </Card.Content>
          </Card>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
    elevation: 2,
    borderRadius: 12,
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
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 12,
    color: '#FF3B30',
    fontWeight: '600',
  },
  description: {
    textAlign: 'center',
    color: '#8B0000',
    paddingHorizontal: 20,
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
  },
});

export default TabErrorBoundary;
