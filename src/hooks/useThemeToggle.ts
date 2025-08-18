/**
 * Theme Toggle Hook
 * Custom hook for theme operations and system detection
 */
import { useColorScheme } from 'react-native';
import { useAppSelector, useAppDispatch } from './reduxHooks';
import {
  setColorScheme,
  type ColorScheme,
} from '@store/slices/preferencesSlice';
import { getTheme } from '@theme/index';

/**
 * Custom hook for theme management
 */
export const useThemeToggle = () => {
  const dispatch = useAppDispatch();
  const colorScheme = useAppSelector((state) => state.preferences.colorScheme);
  const systemColorScheme = useColorScheme() || 'light';

  // Get the actual theme based on preference and system setting
  const currentTheme = getTheme(colorScheme, systemColorScheme);

  // Determine if dark mode is active
  const isDarkMode =
    colorScheme === 'dark' ||
    (colorScheme === 'system' && systemColorScheme === 'dark');

  /**
   * Toggle color scheme preference
   */
  const toggleColorScheme = (scheme: ColorScheme) => {
    dispatch(setColorScheme(scheme));
  };

  /**
   * Get readable theme name
   */
  const getThemeName = (): string => {
    switch (colorScheme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return `System (${systemColorScheme === 'dark' ? 'Dark' : 'Light'})`;
      default:
        return 'System';
    }
  };

  return {
    colorScheme,
    currentTheme,
    isDarkMode,
    systemColorScheme,
    toggleColorScheme,
    getThemeName,
  };
};
