/**
 * FloatingActionButton - Enhanced with tooltip and better disabled states
 *
 * Features:
 * - Long-press tooltip support
 * - Better accessibility for disabled state
 * - Consistent disabled styling
 * - Defensive onPress handling
 */

import React, { useCallback, useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  Alert,
  View,
  Modal,
  Pressable,
} from 'react-native';

export interface FloatingActionButtonProps {
  /** Function called when button is pressed */
  onPress: () => void;
  /** Icon to display (emoji or text) */
  icon?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Tooltip message to show on long press when disabled */
  tooltipMessage?: string;
  /** Default tooltip message for disabled state */
  defaultTooltip?: string;
  /** Test ID for testing */
  testID?: string;
  /** Custom styles */
  style?: ViewStyle;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Custom background color */
  backgroundColor?: string;
  /** Custom size */
  size?: number;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon = '➕',
  disabled = false,
  tooltipMessage,
  defaultTooltip = 'Connect to internet to add a lead',
  testID = 'floating-action-button',
  style,
  accessibilityLabel,
  backgroundColor = '#007AFF',
  size = 60,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Determine tooltip message
  const currentTooltipMessage = tooltipMessage || defaultTooltip;

  // Defensive onPress handler
  const handlePress = useCallback(() => {
    console.log('🔴 FAB pressed - disabled:', disabled);

    // Guard: Don't execute when disabled (defensive programming)
    if (disabled) {
      console.log('🔴 FAB press ignored - button is disabled');
      return;
    }

    console.log('✅ FAB press executing onPress handler');
    onPress();
  }, [disabled, onPress]);

  // Handle long press for tooltip
  const handleLongPress = useCallback(() => {
    console.log('🔴 FAB long pressed - disabled:', disabled);

    if (disabled && currentTooltipMessage) {
      console.log('🔴 Showing tooltip:', currentTooltipMessage);
      setShowTooltip(true);
    }
  }, [disabled, currentTooltipMessage]);

  // Close tooltip
  const closeTooltip = useCallback(() => {
    setShowTooltip(false);
  }, []);

  // Determine accessibility properties
  const accessibilityProps = {
    accessibilityLabel:
      accessibilityLabel ||
      (disabled
        ? `Add lead button - disabled. ${currentTooltipMessage}`
        : 'Add new lead'),
    accessibilityRole: 'button' as const,
    accessibilityState: { disabled },
    accessibilityHint: disabled
      ? 'Long press for more information'
      : 'Tap to add a new lead',
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: disabled ? '#C7C7CC' : backgroundColor,
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style,
        ]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        disabled={false} // Don't use native disabled to allow long press
        testID={testID}
        {...accessibilityProps}
      >
        <Text
          style={[
            styles.fabText,
            {
              fontSize: size * 0.4,
              color: disabled ? '#8E8E93' : '#FFFFFF',
            },
          ]}
        >
          {icon}
        </Text>
      </TouchableOpacity>

      {/* Tooltip Modal */}
      <Modal
        visible={showTooltip}
        transparent={true}
        animationType="fade"
        onRequestClose={closeTooltip}
        testID={`${testID}-tooltip-modal`}
      >
        <Pressable
          style={styles.tooltipOverlay}
          onPress={closeTooltip}
          testID={`${testID}-tooltip-overlay`}
        >
          <View style={styles.tooltipContainer}>
            <View style={styles.tooltip}>
              <Text style={styles.tooltipText}>{currentTooltipMessage}</Text>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontWeight: '600',
  },
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipContainer: {
    alignItems: 'center',
  },
  tooltip: {
    backgroundColor: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    maxWidth: 280,
    marginHorizontal: 20,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default FloatingActionButton;
