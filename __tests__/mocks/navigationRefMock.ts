/**
 * Navigation Reference Mock
 * Mock implementation for navigation reference
 */

const navigationRefMock = {
  isReady: jest.fn(() => true),
  navigate: jest.fn(),
  reset: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
  getCurrentRoute: jest.fn(() => ({ name: 'Home', params: {} })),
  getRootState: jest.fn(() => ({ routes: [], index: 0 })),
};

export const navigate = jest.fn();
export const resetToRoute = jest.fn();
export const goBack = jest.fn();

export default navigationRefMock;
