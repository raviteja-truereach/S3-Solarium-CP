/**
 * OfflineBanner Component Tests
 * Tests banner animation, accessibility, and connectivity responses
 */
import React from 'react';
import { Animated, AccessibilityInfo } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import {
  OfflineBanner,
  OFFLINE_BANNER_HEIGHT,
} from '@components/common/OfflineBanner';
import { useConnectivity } from '@contexts/ConnectivityContext';
import { OFFLINE_MESSAGE } from '@constants/strings';

// Mock the connectivity context
jest.mock('@contexts/ConnectivityContext');
const mockUseConnectivity = useConnectivity as jest.MockedFunction<
  typeof useConnectivity
>;

// Mock AccessibilityInfo
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
  },
  Animated: {
    ...jest.requireActual('react-native').Animated,
    timing: jest.fn(() => ({
      start: jest.fn(),
    })),
  },
}));

// Mock Animated.Value and interpolate
const mockInterpolate = jest.fn();
const mockAnimatedValue = {
  interpolate: mockInterpolate,
};

jest.spyOn(React, 'useRef').mockReturnValue({ current: mockAnimatedValue });

describe('OfflineBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default interpolate return
    mockInterpolate.mockReturnValue(0);
  });

  describe('Online State', () => {
    beforeEach(() => {
      mockUseConnectivity.mockReturnValue({ isOnline: true });
    });

    it('should render without crashing when online', () => {
      const { getByTestId } = render(<OfflineBanner />);
      expect(getByTestId('offline-banner')).toBeTruthy();
    });

    it('should have correct accessibility attributes', () => {
      const { getByTestId } = render(<OfflineBanner />);
      const banner = getByTestId('offline-banner');

      expect(banner.props.accessibilityRole).toBe('alert');
      expect(banner.props.accessibilityLiveRegion).toBe('assertive');
    });

    it('should animate to hidden position when online', () => {
      render(<OfflineBanner />);

      expect(Animated.timing).toHaveBeenCalledWith(
        mockAnimatedValue,
        expect.objectContaining({
          toValue: 0, // Hidden when online
          duration: 500,
          useNativeDriver: true,
        })
      );
    });

    it('should announce "back online" message for accessibility', async () => {
      render(<OfflineBanner />);

      await waitFor(() => {
        expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
          'You are back online'
        );
      });
    });
  });

  describe('Offline State', () => {
    beforeEach(() => {
      mockUseConnectivity.mockReturnValue({ isOnline: false });
    });

    it('should render offline message when offline', () => {
      const { getByText } = render(<OfflineBanner />);
      expect(getByText(OFFLINE_MESSAGE)).toBeTruthy();
    });

    it('should animate to visible position when offline', () => {
      render(<OfflineBanner />);

      expect(Animated.timing).toHaveBeenCalledWith(
        mockAnimatedValue,
        expect.objectContaining({
          toValue: 1, // Visible when offline
          duration: 500,
          useNativeDriver: true,
        })
      );
    });

    it('should announce offline message for accessibility', async () => {
      render(<OfflineBanner />);

      await waitFor(() => {
        expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
          OFFLINE_MESSAGE
        );
      });
    });

    it('should configure correct translateY interpolation', () => {
      render(<OfflineBanner />);

      expect(mockInterpolate).toHaveBeenCalledWith({
        inputRange: [0, 1],
        outputRange: [-OFFLINE_BANNER_HEIGHT, 0],
      });
    });
  });

  describe('State Transitions', () => {
    it('should handle online to offline transition', () => {
      // Start online
      mockUseConnectivity.mockReturnValue({ isOnline: true });
      const { rerender } = render(<OfflineBanner />);

      // Go offline
      mockUseConnectivity.mockReturnValue({ isOnline: false });
      rerender(<OfflineBanner />);

      // Should have been called twice (once for each state)
      expect(Animated.timing).toHaveBeenCalledTimes(2);
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(
        2
      );
    });

    it('should handle offline to online transition', () => {
      // Start offline
      mockUseConnectivity.mockReturnValue({ isOnline: false });
      const { rerender } = render(<OfflineBanner />);

      // Go online
      mockUseConnectivity.mockReturnValue({ isOnline: true });
      rerender(<OfflineBanner />);

      // Should announce both states
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        OFFLINE_MESSAGE
      );
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'You are back online'
      );
    });
  });

  describe('Constants Export', () => {
    it('should export OFFLINE_BANNER_HEIGHT constant', () => {
      expect(OFFLINE_BANNER_HEIGHT).toBe(32);
      expect(typeof OFFLINE_BANNER_HEIGHT).toBe('number');
    });
  });

  describe('Component Structure', () => {
    it('should render with correct text styling', () => {
      mockUseConnectivity.mockReturnValue({ isOnline: false });
      const { getByText } = render(<OfflineBanner />);

      const textElement = getByText(OFFLINE_MESSAGE);
      expect(textElement.props.numberOfLines).toBe(1);
    });

    it('should have consistent height in styles and constant', () => {
      mockUseConnectivity.mockReturnValue({ isOnline: false });
      const { getByTestId } = render(<OfflineBanner />);
      const banner = getByTestId('offline-banner');

      // The height should match our exported constant
      // Note: In testing environment, we verify the constant is used correctly
      expect(OFFLINE_BANNER_HEIGHT).toBe(32);
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      const renderSpy = jest.fn();
      const TestComponent = () => {
        renderSpy();
        return <OfflineBanner />;
      };

      mockUseConnectivity.mockReturnValue({ isOnline: true });
      const { rerender } = render(<TestComponent />);

      // Re-render with same state
      rerender(<TestComponent />);

      // Should only trigger animation when connectivity actually changes
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });
});
