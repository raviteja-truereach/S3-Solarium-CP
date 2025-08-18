/**
 * Tooltip Component
 * Shows contextual help text on press and hold
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { useTheme } from 'react-native-paper';

interface TooltipProps {
  /** Content to show in tooltip */
  content: string;
  /** Whether tooltip is visible */
  visible?: boolean;
  /** Children component that triggers tooltip */
  children: React.ReactNode;
  /** Position of tooltip relative to children */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Custom style for tooltip */
  style?: any;
}

/**
 * Tooltip Component
 */
const Tooltip: React.FC<TooltipProps> = ({
  content,
  visible = false,
  children,
  placement = 'top',
  style,
}) => {
  const theme = useTheme();
  const [showTooltip, setShowTooltip] = useState(false);
  const [childLayout, setChildLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  /**
   * Handle child layout measurement
   */
  const handleLayout = (event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setChildLayout({ x, y, width, height });
  };

  /**
   * Show tooltip on long press
   */
  const handleLongPress = () => {
    if (content && !visible) {
      setShowTooltip(true);
      // Auto dismiss after 3 seconds
      setTimeout(() => setShowTooltip(false), 3000);
    }
  };

  /**
   * Calculate tooltip position
   */
  const getTooltipStyle = () => {
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;

    let tooltipStyle = {
      position: 'absolute' as const,
      backgroundColor: theme.colors.inverseSurface,
      padding: 8,
      borderRadius: 4,
      maxWidth: 200,
      zIndex: 1000,
    };

    switch (placement) {
      case 'top':
        return {
          ...tooltipStyle,
          bottom: screenHeight - childLayout.y + 10,
          left: Math.max(10, childLayout.x + childLayout.width / 2 - 100),
        };
      case 'bottom':
        return {
          ...tooltipStyle,
          top: childLayout.y + childLayout.height + 10,
          left: Math.max(10, childLayout.x + childLayout.width / 2 - 100),
        };
      default:
        return tooltipStyle;
    }
  };

  const isTooltipVisible = visible || showTooltip;

  return (
    <>
      <TouchableOpacity
        onLayout={handleLayout}
        onLongPress={handleLongPress}
        activeOpacity={0.8}
        style={style}
      >
        {children}
      </TouchableOpacity>

      {isTooltipVisible && (
        <Modal
          transparent
          visible={isTooltipVisible}
          animationType="fade"
          onRequestClose={() => setShowTooltip(false)}
        >
          <Pressable
            style={styles.overlay}
            onPress={() => setShowTooltip(false)}
          >
            <View style={getTooltipStyle()}>
              <Text
                style={[
                  styles.tooltipText,
                  { color: theme.colors.inverseOnSurface },
                ]}
              >
                {content}
              </Text>
            </View>
          </Pressable>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  tooltipText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default Tooltip;
