/**
 * Memoized Connectivity Hook
 * Performance optimized connectivity selector to prevent unnecessary re-renders
 */
import { useMemo } from 'react';
import { useConnectivity } from '@contexts/ConnectivityContext';

/**
 * Memoized connectivity hook to prevent unnecessary re-renders
 * Only re-renders when actual connectivity state changes
 */
export const useConnectivityMemoized = () => {
  const connectivity = useConnectivity();

  // Memoize the connectivity state to prevent re-renders when reference changes
  // but actual values remain the same
  const memoizedConnectivity = useMemo(
    () => ({
      isOnline: connectivity.isOnline,
      connectionType: connectivity.connectionType,
    }),
    [connectivity.isOnline, connectivity.connectionType]
  );

  return memoizedConnectivity;
};

/**
 * Memoized online status selector
 * Use this when you only need isOnline to minimize re-renders
 */
export const useIsOnline = () => {
  const { isOnline } = useConnectivity();

  // Memoize just the boolean value
  return useMemo(() => isOnline, [isOnline]);
};
