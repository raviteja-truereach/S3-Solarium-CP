/**
 * App Button Component
 * Themed button extending react-native-paper Button
 */
import React from 'react';
import { Button, useTheme } from 'react-native-paper';
import type { ButtonProps } from 'react-native-paper';
import { StyleSheet } from 'react-native';

export interface AppButtonProps extends Omit<ButtonProps, 'children'> {
  /** Button text */
  title: string;
  /** Button variant */
  variant?: 'contained' | 'outlined' | 'text';
  /** Full width button */
  fullWidth?: boolean;
  /** Button size */
  size?: 'small' | 'medium' | 'large';
}

/**
 * AppButton Component
 * Consistent themed button with project styling
 */
export const AppButton: React.FC<AppButtonProps> = ({
  title,
  variant = 'contained',
  fullWidth = false,
  size = 'medium',
  style,
  contentStyle,
  ...props
}) => {
  const theme = useTheme();

  const buttonStyle = [
    styles.button,
    size === 'small' && styles.smallButton,
    size === 'large' && styles.largeButton,
    fullWidth && styles.fullWidth,
    style,
  ];

  const buttonContentStyle = [
    styles.content,
    size === 'small' && styles.smallContent,
    size === 'large' && styles.largeContent,
    contentStyle,
  ];

  return (
    <Button
      mode={variant}
      style={buttonStyle}
      contentStyle={buttonContentStyle}
      {...props}
    >
      {title}
    </Button>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    marginVertical: 4,
  },
  content: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  smallButton: {
    borderRadius: 6,
  },
  smallContent: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  largeButton: {
    borderRadius: 12,
  },
  largeContent: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  fullWidth: {
    width: '100%',
  },
});

export default AppButton;
