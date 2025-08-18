/**
 * Screen Container Component
 * Consistent screen wrapper with theming and safe area handling
 */
import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  StatusBar,
} from 'react-native';
import { useTheme } from 'react-native-paper';

export interface ScreenContainerProps {
  /** Child components */
  children: React.ReactNode;
  /** Whether to make the screen scrollable */
  scrollable?: boolean;
  /** Additional container styles */
  style?: ViewStyle;
  /** Content container styles (for ScrollView) */
  contentContainerStyle?: ViewStyle;
  /** Padding around content */
  padding?: number;
  /** Whether to handle safe area */
  safeArea?: boolean;
}

/**
 * ScreenContainer Component
 * Provides consistent theming and layout for all screens
 */
export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  padding = 20,
  safeArea = true,
}) => {
  const theme = useTheme();

  const containerStyle = [
    styles.container,
    {
      backgroundColor: theme.colors.background,
      paddingTop: safeArea ? StatusBar.currentHeight || 0 : 0,
    },
    style,
  ];

  const contentStyle = [{ padding }, contentContainerStyle];

  if (scrollable) {
    return (
      <ScrollView
        style={containerStyle}
        contentContainerStyle={contentStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={[containerStyle, contentStyle]}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ScreenContainer;
