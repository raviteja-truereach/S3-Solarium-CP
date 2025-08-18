/**
 * NetInfo Mock for Testing
 * Provides mock implementation of @react-native-community/netinfo
 */

let mockNetInfoState = {
  isConnected: true,
  isInternetReachable: true,
  type: 'wifi',
};

let listeners: Array<(state: any) => void> = [];

const NetInfoMock = {
  addEventListener: jest.fn((listener: (state: any) => void) => {
    listeners.push(listener);
    return jest.fn(() => {
      listeners = listeners.filter((l) => l !== listener);
    });
  }),

  fetch: jest.fn(() => Promise.resolve(mockNetInfoState)),

  // Test helpers
  __setMockState: (state: Partial<typeof mockNetInfoState>) => {
    mockNetInfoState = { ...mockNetInfoState, ...state };
    listeners.forEach((listener) => listener(mockNetInfoState));
  },

  __clearListeners: () => {
    listeners = [];
  },
};

export default NetInfoMock;
