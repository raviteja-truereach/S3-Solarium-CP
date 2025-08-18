/**
 * MyLeadsScreen FAB Behavior Tests
 * Tests for ST-4 TTL-aware FAB functionality
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { configureStore } from '@reduxjs/toolkit';
import { MyLeadsScreen } from '../../screens/leads/MyLeadsScreen';
import leadSliceReducer from '../../store/slices/leadSlice';

// Mock dependencies
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock ConnectivityContext
const mockUseConnectivity = jest.fn();
jest.mock('../../contexts/ConnectivityContext', () => ({
  useConnectivity: () => mockUseConnectivity(),
}));

// Mock usePaginatedLeads
const mockUsePaginatedLeads = jest.fn();
jest.mock('../../hooks/usePaginatedLeads', () => ({
  usePaginatedLeads: () => mockUsePaginatedLeads(),
}));

// Mock components to avoid complex rendering
jest.mock('../../components/common/FloatingActionButton', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');

  return {
    FloatingActionButton: ({
      onPress,
      disabled,
      tooltipMessage,
      testID,
      accessibilityLabel,
    }: any) =>
      React.createElement(
        TouchableOpacity,
        {
          testID,
          onPress,
          disabled,
          accessibilityLabel,
          accessibilityState: { disabled },
          accessibilityRole: 'button',
          accessibilityHint: disabled
            ? 'Long press for more information'
            : 'Tap to add a new lead',
          onLongPress: disabled
            ? () => {
                // Simulate tooltip showing
                console.log('Tooltip:', tooltipMessage);
              }
            : undefined,
        },
        React.createElement(Text, null, '➕')
      ),
  };
});

// Helper to create test store with lastSync
const createTestStore = (lastSync: string | null = null) => {
  return configureStore({
    reducer: { lead: leadSliceReducer },
    preloadedState: {
      lead: {
        items: {},
        pagesLoaded: [],
        totalPages: 0,
        totalCount: 0,
        lastSync,
        isLoading: false,
        loadingNext: false,
        hasMore: true,
        error: null,
        filters: {},
      },
    },
  });
};

const Stack = createStackNavigator();

const renderWithProviders = (
  component: React.ReactElement,
  store = createTestStore()
) => {
  return render(
    React.createElement(
      Provider,
      { store },
      React.createElement(
        NavigationContainer,
        null,
        React.createElement(
          Stack.Navigator,
          null,
          React.createElement(Stack.Screen, {
            name: 'MyLeads',
            component: () => component,
          })
        )
      )
    )
  );
};

describe('MyLeadsScreen FAB TTL-Aware Behavior', () => {
  const mockLoadNext = jest.fn();
  const mockReload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockUsePaginatedLeads.mockReturnValue({
      items: [],
      loadNext: mockLoadNext,
      refreshing: false,
      error: null,
      reload: mockReload,
    });
  });

  describe('FAB Enabled State', () => {
    it('should enable FAB when online and cache is fresh', async () => {
      const freshSync = new Date().toISOString(); // Fresh cache
      const store = createTestStore(freshSync);

      mockUseConnectivity.mockReturnValue({ isOnline: true });

      const { getByTestId } = renderWithProviders(
        React.createElement(MyLeadsScreen),
        store
      );

      const fab = getByTestId('fab-add-lead');
      expect(fab.props.disabled).toBe(false);
      expect(fab.props.accessibilityLabel).toBe('Add new lead');
    });

    it('should allow onPress when FAB is enabled', async () => {
      const freshSync = new Date().toISOString();
      const store = createTestStore(freshSync);

      mockUseConnectivity.mockReturnValue({ isOnline: true });

      const { getByTestId } = renderWithProviders(
        React.createElement(MyLeadsScreen),
        store
      );

      const fab = getByTestId('fab-add-lead');
      fireEvent.press(fab);

      // Should not be blocked (console logs would show execution)
      expect(fab.props.disabled).toBe(false);
    });
  });

  describe('FAB Disabled - Offline', () => {
    it('should disable FAB when offline', async () => {
      const freshSync = new Date().toISOString();
      const store = createTestStore(freshSync);

      mockUseConnectivity.mockReturnValue({ isOnline: false }); // Offline

      const { getByTestId } = renderWithProviders(
        React.createElement(MyLeadsScreen),
        store
      );

      const fab = getByTestId('fab-add-lead');
      expect(fab.props.disabled).toBe(true);
      expect(fab.props.accessibilityLabel).toContain(
        'Connect to internet to add a lead'
      );
    });

    it('should ignore onPress when offline (no-op)', async () => {
      const freshSync = new Date().toISOString();
      const store = createTestStore(freshSync);

      mockUseConnectivity.mockReturnValue({ isOnline: false });

      const { getByTestId } = renderWithProviders(
        React.createElement(MyLeadsScreen),
        store
      );

      const fab = getByTestId('fab-add-lead');

      // Should not crash or navigate
      expect(() => fireEvent.press(fab)).not.toThrow();
      expect(fab.props.disabled).toBe(true);
    });
  });

  describe('FAB Disabled - Stale Cache', () => {
    it('should disable FAB when cache is stale (>24h)', async () => {
      const staleSync = new Date();
      staleSync.setHours(staleSync.getHours() - 25); // 25 hours ago
      const store = createTestStore(staleSync.toISOString());

      mockUseConnectivity.mockReturnValue({ isOnline: true }); // Online but stale

      const { getByTestId } = renderWithProviders(
        React.createElement(MyLeadsScreen),
        store
      );

      const fab = getByTestId('fab-add-lead');
      expect(fab.props.disabled).toBe(true);
      expect(fab.props.accessibilityLabel).toContain('Data is stale');
    });

    it('should ignore onPress when cache is stale (no-op)', async () => {
      const staleSync = new Date();
      staleSync.setHours(staleSync.getHours() - 25);
      const store = createTestStore(staleSync.toISOString());

      mockUseConnectivity.mockReturnValue({ isOnline: true });

      const { getByTestId } = renderWithProviders(
        React.createElement(MyLeadsScreen),
        store
      );

      const fab = getByTestId('fab-add-lead');

      // Should be no-op
      expect(() => fireEvent.press(fab)).not.toThrow();
      expect(fab.props.disabled).toBe(true);
    });
  });

  describe('FAB State Transitions', () => {
    it('should enable FAB when going from offline to online with fresh cache', async () => {
      const freshSync = new Date().toISOString();
      const store = createTestStore(freshSync);

      // Start offline
      mockUseConnectivity.mockReturnValue({ isOnline: false });

      const { getByTestId, rerender } = renderWithProviders(
        React.createElement(MyLeadsScreen),
        store
      );

      let fab = getByTestId('fab-add-lead');
      expect(fab.props.disabled).toBe(true);

      // Go online
      mockUseConnectivity.mockReturnValue({ isOnline: true });
      rerender(React.createElement(MyLeadsScreen));

      fab = getByTestId('fab-add-lead');
      expect(fab.props.disabled).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility state when disabled', async () => {
      mockUseConnectivity.mockReturnValue({ isOnline: false });
      const store = createTestStore();

      const { getByTestId } = renderWithProviders(
        React.createElement(MyLeadsScreen),
        store
      );

      const fab = getByTestId('fab-add-lead');
      expect(fab.props.accessibilityState.disabled).toBe(true);
      expect(fab.props.accessibilityHint).toBe(
        'Long press for more information'
      );
    });

    it('should have proper accessibility state when enabled', async () => {
      const freshSync = new Date().toISOString();
      mockUseConnectivity.mockReturnValue({ isOnline: true });
      const store = createTestStore(freshSync);

      const { getByTestId } = renderWithProviders(
        React.createElement(MyLeadsScreen),
        store
      );

      const fab = getByTestId('fab-add-lead');
      expect(fab.props.accessibilityState.disabled).toBe(false);
      expect(fab.props.accessibilityHint).toBe('Tap to add a new lead');
    });
  });
});
