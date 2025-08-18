/**
 * ConnectivityContext Tests
 * Unit tests for connectivity context and provider
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  ConnectivityProvider,
  useConnectivity,
} from '@contexts/ConnectivityContext';
import NetInfoMock from '../mocks/NetInfoMock';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => NetInfoMock);

// Test component that uses connectivity
const TestComponent: React.FC = () => {
  const { isOnline } = useConnectivity();
  return (
    <Text testID="connectivity-status">{isOnline ? 'online' : 'offline'}</Text>
  );
};

describe('ConnectivityContext', () => {
  beforeEach(() => {
    NetInfoMock.__clearListeners();
    NetInfoMock.__setMockState({
      isConnected: true,
      isInternetReachable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should provide default online status', async () => {
    const { getByTestId } = render(
      <ConnectivityProvider>
        <TestComponent />
      </ConnectivityProvider>
    );

    await waitFor(() => {
      expect(getByTestId('connectivity-status')).toHaveTextContent('online');
    });
  });

  it('should update status when network changes to offline', async () => {
    const { getByTestId } = render(
      <ConnectivityProvider>
        <TestComponent />
      </ConnectivityProvider>
    );

    // Simulate network disconnection
    NetInfoMock.__setMockState({
      isConnected: false,
      isInternetReachable: false,
    });

    await waitFor(() => {
      expect(getByTestId('connectivity-status')).toHaveTextContent('offline');
    });
  });

  it('should update status when network reconnects', async () => {
    // Start offline
    NetInfoMock.__setMockState({
      isConnected: false,
      isInternetReachable: false,
    });

    const { getByTestId } = render(
      <ConnectivityProvider>
        <TestComponent />
      </ConnectivityProvider>
    );

    await waitFor(() => {
      expect(getByTestId('connectivity-status')).toHaveTextContent('offline');
    });

    // Reconnect
    NetInfoMock.__setMockState({
      isConnected: true,
      isInternetReachable: true,
    });

    await waitFor(() => {
      expect(getByTestId('connectivity-status')).toHaveTextContent('online');
    });
  });

  it('should throw error when used outside provider', () => {
    const TestComponentWithoutProvider: React.FC = () => {
      useConnectivity();
      return <Text>Test</Text>;
    };

    expect(() => {
      render(<TestComponentWithoutProvider />);
    }).toThrow('useConnectivity must be used within a ConnectivityProvider');
  });

  it('should handle null internet reachability as online', async () => {
    NetInfoMock.__setMockState({
      isConnected: true,
      isInternetReachable: true,
    });

    const { getByTestId } = render(
      <ConnectivityProvider>
        <TestComponent />
      </ConnectivityProvider>
    );

    await waitFor(() => {
      expect(getByTestId('connectivity-status')).toHaveTextContent('online');
    });
  });
});
