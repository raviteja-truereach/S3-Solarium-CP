/**
 * Auth Guard Component
 * Handles authentication-based navigation protection and routing
 */
import React, { useEffect } from 'react';
import { useAppSelector } from '@hooks/reduxHooks';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '@navigation/types';
import { createComponentLogger } from '../../utils/Logger';

const logger = createComponentLogger('AuthGuard');

export interface AuthGuardProps {
  /** Whether the wrapped component requires authentication */
  requiresAuth?: boolean;
  /** Child components to render */
  children: React.ReactNode;
}

/**
 * AuthGuard Component
 * Protects routes based on authentication state and handles automatic redirects
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({
  requiresAuth = false,
  children,
}) => {
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  useEffect(() => {
    // Handle redirect logic based on auth state and route requirements
    if (requiresAuth && !isLoggedIn) {
      // User needs auth but isn't logged in - redirect to auth
      // console.log('AuthGuard: Redirecting to Auth - user not authenticated');
      logger.debug('Redirecting to Auth - user not authenticated');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    } else if (!requiresAuth && isLoggedIn) {
      // User is logged in but trying to access auth routes - redirect to main
      // console.log(
      //   'AuthGuard: Redirecting to Main - user already authenticated'
      // );
      logger.debug('User authenticated, rendering children');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
  }, [isLoggedIn, requiresAuth, navigation]);

  // Always render children - navigation reset happens asynchronously
  // This prevents flash of wrong content
  return <>{children}</>;
};

export default AuthGuard;
