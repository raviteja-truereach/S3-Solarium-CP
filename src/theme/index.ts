/**
 * Theme Configuration
 * Light and dark themes extending react-native-paper defaults
 */
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

/**
 * Light Theme Configuration
 * Extends react-native-paper's default light theme
 */
export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#004C89',
    primaryContainer: '#E1F0FF',
    secondary: '#2E7D89',
    secondaryContainer: '#E0F4F5',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    background: '#FAFAFA',
    error: '#D32F2F',
    errorContainer: '#FFEBEE',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: '#1C1B1F',
    onBackground: '#1C1B1F',
    outline: '#E0E0E0',
  },
};

/**
 * Dark Theme Configuration
 * Extends react-native-paper's default dark theme
 */
export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#4A90C2',
    primaryContainer: '#003366',
    secondary: '#5DADE2',
    secondaryContainer: '#1B4F57',
    surface: '#121212',
    surfaceVariant: '#1E1E1E',
    background: '#000000',
    error: '#F44336',
    errorContainer: '#FFEBEE',
    onPrimary: '#000000',
    onSecondary: '#000000',
    onSurface: '#FFFFFF',
    onBackground: '#FFFFFF',
    outline: '#333333',
  },
};

/**
 * Theme type for consistency
 */
export type AppTheme = MD3Theme;

/**
 * Get theme based on scheme preference
 */
export const getTheme = (
  scheme: 'light' | 'dark' | 'system',
  systemScheme: 'light' | 'dark'
): AppTheme => {
  if (scheme === 'system') {
    return systemScheme === 'dark' ? darkTheme : lightTheme;
  }
  return scheme === 'dark' ? darkTheme : lightTheme;
};

/**
 * Styled component helper for consistent theming
 */
export const createThemedStyles = <T extends Record<string, any>>(
  styleCreator: (theme: AppTheme) => T
) => {
  return (theme: AppTheme): T => styleCreator(theme);
};
