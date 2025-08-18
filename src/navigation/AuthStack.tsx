/**
 * Authentication Stack Navigator
 * Handles the authentication flow: Splash → Login
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SplashScreen } from '@screens/auth/SplashScreen';
import { LoginScreen } from '@screens/auth/LoginScreen';
import type { AuthStackParamList } from './types';
import { OtpScreen } from '@screens/auth/OtpScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * AuthStack Component
 * Navigation stack for authentication screens
 */
export const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{
          gestureEnabled: false, // Prevent swipe back on splash
        }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          gestureEnabled: false, // Prevent swipe back to splash
        }}
      />
      <Stack.Screen
        name="Otp"
        component={OtpScreen}
        options={{
          title: 'Verify OTP',
          headerShown: true,
          headerBackTitleVisible: false,
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthStack;
