/**
 * Accessibility Testing Utilities
 */

// Mock for react-native-accessibility events
export const mockAccessibilityInfo = {
  announceForAccessibility: jest.fn(),
  isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
  isBoldTextEnabled: jest.fn(() => Promise.resolve(false)),
  isGrayscaleEnabled: jest.fn(() => Promise.resolve(false)),
  isInvertColorsEnabled: jest.fn(() => Promise.resolve(false)),
  isReduceTransparencyEnabled: jest.fn(() => Promise.resolve(false)),
  isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Setup for tests
export const setupAccessibilityMocks = () => {
  jest.mock('react-native', () => ({
    ...jest.requireActual('react-native'),
    AccessibilityInfo: mockAccessibilityInfo,
  }));
};
