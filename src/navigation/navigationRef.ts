import React from 'react';
import {
  NavigationContainerRef,
  CommonActions,
} from '@react-navigation/native';
import { RootStackParamList } from './types';

export const navigationRef =
  React.createRef<NavigationContainerRef<RootStackParamList>>();

/**
 * Navigate to any screen
 */
export function navigate(name: keyof RootStackParamList, params?: any) {
  navigationRef.current?.navigate(name as never, params as never);
}


export const navigateToSettings = () => {
  try {
    navigationRef.current?.navigate('Settings' as never);
    console.log('✅ Navigated to Settings');
  } catch (error) {
    console.error('❌ Failed to navigate to Settings:', error);
  }
};
/**
 * Go back to previous screen
 */
export function goBack() {
  navigationRef.current?.goBack();
}

/**
 * Reset navigation stack
 */
export function reset(routeName: keyof RootStackParamList) {
  navigationRef.current?.reset({
    index: 0,
    routes: [{ name: routeName as never }],
  });
}

/**
 * Navigate to notifications screen
 */
export function navigateToNotifications() {
  try {
    navigationRef.current?.dispatch(
      CommonActions.navigate({
        name: 'NotificationsStack' as never,
      })
    );
    console.log('✅ Navigated to notifications');
  } catch (error) {
    console.error('❌ Failed to navigate to notifications:', error);
  }
}

/**
 * Check if navigator is ready
 */
export function isNavigationReady(): boolean {
  return navigationRef.current?.isReady() ?? false;
}

/**
 * Get current route name
 */
export function getCurrentRouteName(): string | undefined {
  return navigationRef.current?.getCurrentRoute()?.name;
}

export default {
  navigate,
  goBack,
  reset,
  navigateToNotifications,
  isNavigationReady,
  getCurrentRouteName,
};
