/**
 * Navigation Provider
 * Root navigation container with authentication-based routing
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector } from '@hooks/reduxHooks';
import { AuthStack } from './AuthStack';
import { MainTabNavigator } from './MainTabNavigator';
import { OfflineBanner } from '@components/common/OfflineBanner';
import { AuthBootstrap } from '@components/common/AuthBootstrap';
import { AuthGuard } from '@components/auth/AuthGuard';
import type { RootStackParamList } from './types';
import { navigationRef } from './navigationRef';
import PerformanceNavigationWrapper from './PerformanceNavigationWrapper';

const RootStack = createNativeStackNavigator<RootStackParamList>();

/**
 * Linking configuration for deep linking
 */
const linking = {
  prefixes: ['solariumcp://'],
  config: {
    screens: {
      Auth: 'auth',
      Main: {
        screens: {
          Home: {
            screens: {
              HomeScreen: 'home',
              MyLeads: 'leads',
              LeadDetail: 'leads/:leadId',
              AddLead: 'leads/add',
            },
          },
        },
      },
    },
  },
};

/**
 * Navigation Provider Component
 * Manages root-level navigation and authentication flow with AuthGuard protection
 */
export const NavigationProvider: React.FC = () => {
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

  return (
    <AuthBootstrap>
      <View style={styles.container}>
        <NavigationContainer
          ref={navigationRef}
          linking={linking}
          onReady={() => {
            // Performance mark for future analytics
            console.log('Navigation ready');
          }}
        >
          <RootStack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            {!isLoggedIn ? (
              <RootStack.Screen
                name="Auth"
                options={{
                  animationTypeForReplace: 'pop',
                }}
              >
                {() => (
                  <AuthGuard requiresAuth={false}>
                    <AuthStack />
                  </AuthGuard>
                )}
              </RootStack.Screen>
            ) : (
              <RootStack.Screen
                name="Main"
                options={{
                  animationTypeForReplace: 'push',
                }}
              >
                {() => (
                  <AuthGuard requiresAuth={true}>
                    <MainTabNavigator />
                  </AuthGuard>
                )}
              </RootStack.Screen>
            )}
          </RootStack.Navigator>
        </NavigationContainer>
        <OfflineBanner />
      </View>
    </AuthBootstrap>
  );
};

/**
 * Component styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default NavigationProvider;
