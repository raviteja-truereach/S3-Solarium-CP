/**
 * useThemeToggle Hook Tests
 */
import { renderHook, act } from '@testing-library/react-native';
import { useThemeToggle } from '@hooks/useThemeToggle';
import { createTestStore } from '../setup/testUtils';
import { Provider } from 'react-redux';
import React from 'react';

const createWrapper = (initialState?: any) => {
  const store = createTestStore(initialState);
  return ({ children }: any) =>
    React.createElement(Provider, { store, children });
};

describe('useThemeToggle', () => {
  it('should return default state', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useThemeToggle(), { wrapper });

    expect(result.current.colorScheme).toBe('system');
    expect(result.current.isDarkMode).toBe(false);
  });

  it('should toggle color scheme', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useThemeToggle(), { wrapper });

    act(() => {
      result.current.toggleColorScheme('dark');
    });

    expect(result.current.colorScheme).toBe('dark');
  });
});
