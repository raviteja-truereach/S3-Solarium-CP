/**
 * Connectivity Mock Helper
 * Helper utilities for mocking NetInfo and connectivity states
 */
import NetInfo from '@react-native-community/netinfo';

export interface MockConnectivityState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

/**
 * Mock NetInfo for testing connectivity scenarios
 */
export const mockNetInfo = (state: Partial<MockConnectivityState> = {}) => {
  const defaultState: MockConnectivityState = {
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  };

  const mockState = { ...defaultState, ...state };

  (NetInfo.fetch as jest.Mock).mockResolvedValue(mockState);
  (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
    // Simulate initial state
    callback(mockState);

    // Return unsubscribe function
    return jest.fn();
  });

  return mockState;
};

/**
 * Mock offline state
 */
export const mockOfflineState = () => {
  return mockNetInfo({
    isConnected: false,
    isInternetReachable: false,
    type: 'none',
  });
};

/**
 * Mock online state
 */
export const mockOnlineState = () => {
  return mockNetInfo({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  });
};

/**
 * Mock cellular connection
 */
export const mockCellularState = () => {
  return mockNetInfo({
    isConnected: true,
    isInternetReachable: true,
    type: 'cellular',
  });
};

/**
 * Mock unstable connection
 */
export const mockUnstableConnection = () => {
  return mockNetInfo({
    isConnected: true,
    isInternetReachable: false,
    type: 'wifi',
  });
};

/**
 * Simulate connection state changes
 */
export const simulateConnectionChange = (
  fromState: Partial<MockConnectivityState>,
  toState: Partial<MockConnectivityState>,
  delay: number = 100
) => {
  // First set initial state
  mockNetInfo(fromState);

  // Then change after delay
  setTimeout(() => {
    mockNetInfo(toState);
  }, delay);
};
