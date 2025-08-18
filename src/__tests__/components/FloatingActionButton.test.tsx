/**
 * FloatingActionButton Component Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { FloatingActionButton } from '../../components/common/FloatingActionButton';

describe('FloatingActionButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should render with default props', () => {
      const { getByTestId } = render(
        <FloatingActionButton onPress={mockOnPress} />
      );

      const fab = getByTestId('floating-action-button');
      expect(fab).toBeTruthy();
    });

    it('should call onPress when enabled', () => {
      const { getByTestId } = render(
        <FloatingActionButton onPress={mockOnPress} disabled={false} />
      );

      const fab = getByTestId('floating-action-button');
      fireEvent.press(fab);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const { getByTestId } = render(
        <FloatingActionButton onPress={mockOnPress} disabled={true} />
      );

      const fab = getByTestId('floating-action-button');
      fireEvent.press(fab);

      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Tooltip Functionality', () => {
    it('should show tooltip on long press when disabled', async () => {
      const { getByTestId, getByText } = render(
        <FloatingActionButton
          onPress={mockOnPress}
          disabled={true}
          tooltipMessage="Test tooltip message"
        />
      );

      const fab = getByTestId('floating-action-button');
      fireEvent(fab, 'onLongPress');

      await waitFor(() => {
        expect(getByText('Test tooltip message')).toBeTruthy();
      });
    });

    it('should not show tooltip on long press when enabled', async () => {
      const { getByTestId, queryByText } = render(
        <FloatingActionButton
          onPress={mockOnPress}
          disabled={false}
          tooltipMessage="Test tooltip message"
        />
      );

      const fab = getByTestId('floating-action-button');
      fireEvent(fab, 'onLongPress');

      await waitFor(() => {
        expect(queryByText('Test tooltip message')).toBeFalsy();
      });
    });

    it('should use default tooltip when none provided', async () => {
      const { getByTestId, getByText } = render(
        <FloatingActionButton onPress={mockOnPress} disabled={true} />
      );

      const fab = getByTestId('floating-action-button');
      fireEvent(fab, 'onLongPress');

      await waitFor(() => {
        expect(getByText('Connect to internet to add a lead')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility props when enabled', () => {
      const { getByTestId } = render(
        <FloatingActionButton onPress={mockOnPress} disabled={false} />
      );

      const fab = getByTestId('floating-action-button');
      expect(fab.props.accessibilityRole).toBe('button');
      expect(fab.props.accessibilityState.disabled).toBe(false);
      expect(fab.props.accessibilityLabel).toBe('Add new lead');
    });

    it('should have proper accessibility props when disabled', () => {
      const { getByTestId } = render(
        <FloatingActionButton onPress={mockOnPress} disabled={true} />
      );

      const fab = getByTestId('floating-action-button');
      expect(fab.props.accessibilityRole).toBe('button');
      expect(fab.props.accessibilityState.disabled).toBe(true);
      expect(fab.props.accessibilityLabel).toContain('disabled');
    });
  });
});
