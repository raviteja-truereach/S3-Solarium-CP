/**
 * Root Screen Component
 * Main entry point for the Solarium CP App
 */
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {
  appConfig,
  isDevelopment,
  isProduction,
  isStaging,
} from '@config/Config';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';

/**
 * Root Screen - Temporary welcome screen for development
 * Will be replaced with authentication flow in later tasks
 */
function RootScreen(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };
  // Environment information for verification
  const envInfo = {
    environment: appConfig.env,
    apiUrl: appConfig.apiUrl,
    debugMode: appConfig.debugMode,
    logLevel: appConfig.logLevel,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}
      >
        <Header />
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}
        >
          <Text style={styles.sectionTitle}>Helooooo App</Text>
          <Text style={styles.sectionDescription}>
            Channel Partner Mobile Application for Solarium Green Energy
          </Text>
          <Text style={styles.sectionDescription}>
            🚧 Environment: {appConfig.env.toUpperCase()}
          </Text>
          <Text style={styles.sectionDescription}>
            📡 API: {appConfig.apiUrl}
          </Text>
          <Text style={styles.sectionDescription}>
            🐛 Debug: {appConfig.debugMode ? 'ON' : 'OFF'} | Log Level:{' '}
            {appConfig.logLevel}
          </Text>
          <View style={styles.environmentBadge}>
            <Text
              style={[
                styles.environmentText,
                isDevelopment() && styles.devEnv,
                isStaging() && styles.stagingEnv,
                isProduction() && styles.prodEnv,
              ]}
            >
              {appConfig.env.toUpperCase()} MODE
            </Text>
          </View>
          <DebugInstructions />
          <LearnMoreLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 20,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  environmentBadge: {
    alignItems: 'center',
    marginVertical: 15,
    paddingHorizontal: 20,
  },
  environmentText: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  devEnv: {
    backgroundColor: '#ffeb3b',
    color: '#333',
  },
  stagingEnv: {
    backgroundColor: '#ff9800',
    color: '#fff',
  },
  prodEnv: {
    backgroundColor: '#4caf50',
    color: '#fff',
  },
});

export default RootScreen;
