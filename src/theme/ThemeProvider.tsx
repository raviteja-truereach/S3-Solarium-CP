/**
 * Theme Provider Component
 * Wraps the app with react-native-paper's PaperProvider
 */
import React from 'react';
import { StatusBar } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { useThemeToggle } from '@hooks/useThemeToggle';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * ThemeProvider Component
 * Provides theme context to the entire app
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { currentTheme, isDarkMode } = useThemeToggle();

  return (
    <PaperProvider theme={currentTheme}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={currentTheme.colors.surface}
        translucent={false}
      />
      {children}
    </PaperProvider>
  );
};

export default ThemeProvider;
