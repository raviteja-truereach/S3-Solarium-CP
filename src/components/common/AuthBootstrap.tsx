/**
 * Auth Bootstrap Component
 * Handles authentication initialization from keychain on app startup
 * Simplified - database initialization is handled separately
 */
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useAppDispatch } from '@hooks/reduxHooks';
import { bootstrapFromKeychain } from '@store/thunks/authThunks';

/**
 * Bootstrap states
 */
enum BootstrapState {
  BOOTSTRAPPING_AUTH = 'bootstrapping_auth',
  READY = 'ready',
  ERROR = 'error',
}

/**
 * AuthBootstrap Component
 * Runs authentication bootstrap when app starts
 */
export const AuthBootstrap: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const dispatch = useAppDispatch();
  const theme = useTheme();

  const [bootstrapState, setBootstrapState] = React.useState<BootstrapState>(
    BootstrapState.BOOTSTRAPPING_AUTH
  );
  const [authError, setAuthError] = React.useState<string | null>(null);

  /**
   * Run authentication bootstrap immediately
   */
  React.useEffect(() => {
    const runAuthBootstrap = async () => {
      try {
        console.log('🔐 Starting authentication bootstrap...');
        setBootstrapState(BootstrapState.BOOTSTRAPPING_AUTH);
        setAuthError(null);

        // Run auth bootstrap (keychain token check)
        await dispatch(bootstrapFromKeychain());

        console.log('✅ Authentication bootstrap completed');
        setBootstrapState(BootstrapState.READY);
      } catch (error) {
        console.error('❌ Auth bootstrap failed:', error);
        setBootstrapState(BootstrapState.ERROR);
        setAuthError(
          error instanceof Error
            ? error.message
            : 'Authentication bootstrap failed'
        );
      }
    };

    runAuthBootstrap();
  }, [dispatch]);

  /**
   * Render loading states
   */
  if (bootstrapState !== BootstrapState.READY) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />

        {bootstrapState === BootstrapState.BOOTSTRAPPING_AUTH && (
          <Text
            style={[styles.statusText, { color: theme.colors.onBackground }]}
          >
            Checking authentication...
          </Text>
        )}

        {bootstrapState === BootstrapState.ERROR && (
          <>
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              Startup Error
            </Text>
            <Text
              style={[
                styles.errorMessage,
                { color: theme.colors.onBackground },
              ]}
            >
              {authError || 'Unknown error occurred during startup'}
            </Text>
          </>
        )}

        <Text style={[styles.appName, { color: theme.colors.primary }]}>
          Solarium CP
        </Text>
      </View>
    );
  }

  /**
   * Render app when bootstrap is complete
   */
  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  appName: {
    position: 'absolute',
    bottom: 60,
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default AuthBootstrap;
