/**
 * Connectivity Context
 * Provides network connectivity status throughout the app
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Connectivity context value interface
 */
interface ConnectivityContextValue {
  /** Current online/offline status */
  isConnected: boolean;
  isOnline: boolean;
}

/**
 * Default context value
 */
const defaultValue: ConnectivityContextValue = {
  isConnected: true,
  isOnline: true, // Default to online as per requirements
};

/**
 * Connectivity context
 */
const ConnectivityContext =
  createContext<ConnectivityContextValue>(defaultValue);

/**
 * Connectivity Provider Props
 */
interface ConnectivityProviderProps {
  children: React.ReactNode;
}

/**
 * Connectivity Provider Component
 * Manages network connectivity state and provides it to the app
 */
export const ConnectivityProvider: React.FC<ConnectivityProviderProps> = ({
  children,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      // Consider connected if we have internet reachability
      // Replace the setIsOnline calls with:
      const connected = Boolean(
        state.isConnected && state.isInternetReachable !== false
      );
      setIsOnline(connected);
      setIsConnected(connected);
    });

    // Get initial network state
    NetInfo.fetch().then((state) => {
      // Replace the setIsOnline calls with:
      const connected = Boolean(
        state.isConnected && state.isInternetReachable !== false
      );
      setIsOnline(connected);
      setIsConnected(connected);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  const value: ConnectivityContextValue = {
    isConnected,
    isOnline,
  };

  return (
    <ConnectivityContext.Provider value={value}>
      {children}
    </ConnectivityContext.Provider>
  );
};

/**
 * Hook to access connectivity context
 * @returns Connectivity context value
 * @throws Error if used outside ConnectivityProvider
 */
export function useConnectivity(): ConnectivityContextValue {
  const context = useContext(ConnectivityContext);

  if (!context) {
    throw new Error(
      'useConnectivity must be used within a ConnectivityProvider'
    );
  }

  return context;
}

export default ConnectivityProvider;
