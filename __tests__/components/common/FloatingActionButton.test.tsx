/**
 * FloatingActionButton Component Tests
 * Tests disabled state and tooltip functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { Alert } from 'react-native';
import FloatingActionButton from '../../../src/components/common/FloatingActionButton';

// Mock Alert
jest.spyOn(Alert, 'alert');

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PaperProvider>{children}</PaperProvider>
);

describe('FloatingActionButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('renders FAB correctly', () => {
      render(
        <TestWrapper>
          <FloatingActionButton testID="test-fab" />
        </TestWrapper>
      );

      expect(screen.getByTestId('test-fab')).toBeTruthy();
    });

    it('calls onPress when pressed and not disabled', () => {
      const mockPress = jest.fn();

      render(
        <TestWrapper>
          <FloatingActionButton
            onPress={mockPress}
            disabled={false}
            testID="enabled-fab"
          />
        </TestWrapper>
      );

      fireEvent.press(screen.getByTestId('enabled-fab'));
      expect(mockPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Disabled State', () => {
    it('does not call onPress when disabled', () => {
      const mockPress = jest.fn();

      render(
        <TestWrapper>
          <FloatingActionButton
            onPress={mockPress}
            disabled={true}
            testID="disabled-fab"
          />
        </TestWrapper>
      );

      fireEvent.press(screen.getByTestId('disabled-fab'));
      expect(mockPress).not.toHaveBeenCalled();
    });

    it('shows tooltip on long press when disabled', () => {
      render(
        <TestWrapper>
          <FloatingActionButton
            disabled={true}
            tooltipMessage="Feature coming soon"
            testID="tooltip-fab"
          />
        </TestWrapper>
      );

      fireEvent(screen.getByTestId('tooltip-fab'), 'onLongPress');
      expect(Alert.alert).toHaveBeenCalledWith('Info', 'Feature coming soon');
    });

    it('has correct accessibility label when disabled', () => {
      render(
        <TestWrapper>
          <FloatingActionButton
            disabled={true}
            accessibilityLabel="Add Lead"
            testID="disabled-accessible-fab"
          />
        </TestWrapper>
      );

      const fab = screen.getByTestId('disabled-accessible-fab');
      expect(fab.props.accessibilityLabel).toBe('Add Lead – disabled');
    });
  });

  describe('Customization', () => {
    it('uses custom icon', () => {
      render(
        <TestWrapper>
          <FloatingActionButton icon="✏️" testID="custom-icon-fab" />
        </TestWrapper>
      );

      expect(screen.getByTestId('custom-icon-fab')).toBeTruthy();
    });

    it('uses custom accessibility label', () => {
      render(
        <TestWrapper>
          <FloatingActionButton
            accessibilityLabel="Create New Item"
            testID="custom-label-fab"
          />
        </TestWrapper>
      );

      const fab = screen.getByTestId('custom-label-fab');
      expect(fab.props.accessibilityLabel).toBe('Create New Item');
    });
  });
});
