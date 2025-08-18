/**
 * Offline Banner Component
 * Displays connectivity status banner with slide animation
 */
import { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, Animated, AccessibilityInfo } from 'react-native';
import { useConnectivity } from '@contexts/ConnectivityContext';
import { OFFLINE_MESSAGE } from '@constants/strings';

// Export banner height for layout calculations in other components
export const OFFLINE_BANNER_HEIGHT = 32;

/**
 * Offline Banner Component
 * Shows/hides based on connectivity status with smooth animation
 * Features debounced state changes to prevent flicker
 */
export const OfflineBanner: React.FC = () => {
  const { isOnline } = useConnectivity();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [debouncedIsOnline, setDebouncedIsOnline] = useState(isOnline);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounce connectivity changes to prevent rapid flickering
  useEffect(() => {
    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout for debounced state update
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedIsOnline(isOnline);
    }, 500); // 500ms debounce as per requirements

    // Cleanup timeout on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [isOnline]);

  useEffect(() => {
    // Animate banner visibility based on debounced connectivity
    Animated.timing(animatedValue, {
      toValue: debouncedIsOnline ? 0 : 1,
      duration: 500, // 500ms animation as per requirements
      useNativeDriver: true,
    }).start();

    // Announce connectivity changes for accessibility
    if (!debouncedIsOnline) {
      AccessibilityInfo.announceForAccessibility(OFFLINE_MESSAGE);
    } else {
      AccessibilityInfo.announceForAccessibility('You are back online');
    }
  }, [debouncedIsOnline, animatedValue]);

  // Calculate translateY for slide animation
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-OFFLINE_BANNER_HEIGHT, 0], // Use constant for consistency
  });

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          transform: [{ translateY }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      testID="offline-banner"
    >
      <Text style={styles.text} numberOfLines={1}>
        {OFFLINE_MESSAGE}
      </Text>
    </Animated.View>
  );
};

/**
 * Component styles
 */
const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: OFFLINE_BANNER_HEIGHT,
    backgroundColor: '#FFCC00', // Yellow background as per requirements
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // High z-index to overlay navigation
    elevation: 5, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  text: {
    color: '#000000', // Black text as per requirements
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});

export default OfflineBanner;
