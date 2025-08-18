/**
 * Navigation Flow Unit Tests
 * Tests navigation structure and flow without full E2E
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import HomeStack from '../../src/navigation/HomeStack';

// Mock the screens
jest.mock('../../src/screens/home/HomeScreen', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');

  return function MockHomeScreen({ navigation }: any) {
    return (
      <View testID="home-screen">
        <Text>Dashboard</Text>
        <TouchableOpacity
          testID="view-leads-button"
          onPress={() => navigation.navigate('MyLeads')}
        >
          <Text>View My Leads</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

jest.mock('../../src/screens/leads/MyLeadsScreen', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  return function MockMyLeadsScreen() {
    return (
      <View testID="leads-screen">
        <Text>My Leads</Text>
      </View>
    );
  };
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PaperProvider>
    <NavigationContainer>{children}</NavigationContainer>
  </PaperProvider>
);

describe('Navigation Flow', () => {
  it('should navigate from Dashboard to MyLeads', async () => {
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <HomeStack />
      </TestWrapper>
    );

    // Should start on Dashboard
    expect(getByTestId('home-screen')).toBeTruthy();
    expect(getByText('Dashboard')).toBeTruthy();

    // Tap "View My Leads" button
    fireEvent.press(getByTestId('view-leads-button'));

    // Should navigate to MyLeads screen
    await waitFor(() => {
      expect(getByTestId('leads-screen')).toBeTruthy();
      expect(getByText('My Leads')).toBeTruthy();
    });
  });

  it('should handle navigation without errors', () => {
    expect(() => {
      render(
        <TestWrapper>
          <HomeStack />
        </TestWrapper>
      );
    }).not.toThrow();
  });
});
