/**
 * AppButton Component Tests
 * Tests disabled state, accessibility, and backward compatibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { axe, toHaveNoViolations } from 'jest-axe';
import AppButton from '../../../src/components/common/AppButton';

expect.extend(toHaveNoViolations);

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PaperProvider>{children}</PaperProvider>
);

describe('AppButton', () => {
  describe('Basic Functionality', () => {
    it('renders button with text correctly', () => {
      render(
        <TestWrapper>
          <AppButton testID="test-button">Click Me</AppButton>
        </TestWrapper>
      );

      expect(screen.getByText('Click Me')).toBeTruthy();
      expect(screen.getByTestId('test-button')).toBeTruthy();
    });

    it('calls onPress when button is pressed', () => {
      const mockPress = jest.fn();

      render(
        <TestWrapper>
          <AppButton onPress={mockPress} testID="test-button">
            Press Me
          </AppButton>
        </TestWrapper>
      );

      fireEvent.press(screen.getByTestId('test-button'));
      expect(mockPress).toHaveBeenCalledTimes(1);
    });

    it('calls onLongPress when button is long pressed', () => {
      const mockLongPress = jest.fn();

      render(
        <TestWrapper>
          <AppButton onLongPress={mockLongPress} testID="test-button">
            Long Press Me
          </AppButton>
        </TestWrapper>
      );

      fireEvent(screen.getByTestId('test-button'), 'onLongPress');
      expect(mockLongPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Disabled State', () => {
    it('does not call onPress when disabled', () => {
      const mockPress = jest.fn();

      render(
        <TestWrapper>
          <AppButton
            onPress={mockPress}
            disabled={true}
            testID="disabled-button"
          >
            Disabled Button
          </AppButton>
        </TestWrapper>
      );

      fireEvent.press(screen.getByTestId('disabled-button'));
      expect(mockPress).not.toHaveBeenCalled();
    });

    it('does not call onLongPress when disabled', () => {
      const mockLongPress = jest.fn();

      render(
        <TestWrapper>
          <AppButton
            onLongPress={mockLongPress}
            disabled={true}
            testID="disabled-button"
          >
            Disabled Button
          </AppButton>
        </TestWrapper>
      );

      fireEvent(screen.getByTestId('disabled-button'), 'onLongPress');
      expect(mockLongPress).not.toHaveBeenCalled();
    });

    it('has correct accessibility state when disabled', () => {
      render(
        <TestWrapper>
          <AppButton disabled={true} testID="disabled-button">
            Disabled Button
          </AppButton>
        </TestWrapper>
      );

      const button = screen.getByTestId('disabled-button');
      expect(button.props.accessibilityState).toEqual({ disabled: true });
      expect(button.props.accessibilityLabel).toBe(
        'Disabled Button – disabled'
      );
    });

    it('has correct accessibility label when disabled with custom label', () => {
      render(
        <TestWrapper>
          <AppButton
            disabled={true}
            accessibilityLabel="Add Lead"
            testID="disabled-button"
          >
            +
          </AppButton>
        </TestWrapper>
      );

      const button = screen.getByTestId('disabled-button');
      expect(button.props.accessibilityLabel).toBe('Add Lead – disabled');
    });
  });

  describe('Variants and Sizes', () => {
    it('renders different variants correctly', () => {
      const { rerender } = render(
        <TestWrapper>
          <AppButton variant="primary" testID="primary-button">
            Primary
          </AppButton>
        </TestWrapper>
      );

      expect(screen.getByTestId('primary-button')).toBeTruthy();

      rerender(
        <TestWrapper>
          <AppButton variant="secondary" testID="secondary-button">
            Secondary
          </AppButton>
        </TestWrapper>
      );

      expect(screen.getByTestId('secondary-button')).toBeTruthy();

      rerender(
        <TestWrapper>
          <AppButton variant="outline" testID="outline-button">
            Outline
          </AppButton>
        </TestWrapper>
      );

      expect(screen.getByTestId('outline-button')).toBeTruthy();
    });

    it('renders different sizes correctly', () => {
      const { rerender } = render(
        <TestWrapper>
          <AppButton size="small" testID="small-button">
            Small
          </AppButton>
        </TestWrapper>
      );

      expect(screen.getByTestId('small-button')).toBeTruthy();

      rerender(
        <TestWrapper>
          <AppButton size="large" testID="large-button">
            Large
          </AppButton>
        </TestWrapper>
      );

      expect(screen.getByTestId('large-button')).toBeTruthy();
    });
  });

  describe('Backward Compatibility', () => {
    it('works without disabled prop (default false)', () => {
      const mockPress = jest.fn();

      render(
        <TestWrapper>
          <AppButton onPress={mockPress} testID="default-button">
            Default Button
          </AppButton>
        </TestWrapper>
      );

      fireEvent.press(screen.getByTestId('default-button'));
      expect(mockPress).toHaveBeenCalledTimes(1);
    });

    it('works with all existing props', () => {
      const mockPress = jest.fn();

      render(
        <TestWrapper>
          <AppButton
            onPress={mockPress}
            variant="primary"
            size="medium"
            style={{ margin: 10 }}
            testID="full-props-button"
          >
            Full Props Button
          </AppButton>
        </TestWrapper>
      );

      expect(screen.getByTestId('full-props-button')).toBeTruthy();
      fireEvent.press(screen.getByTestId('full-props-button'));
      expect(mockPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <AppButton testID="accessibility-button">Accessible Button</AppButton>
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should not have accessibility violations when disabled', async () => {
      const { container } = render(
        <TestWrapper>
          <AppButton disabled={true} testID="disabled-accessibility-button">
            Disabled Accessible Button
          </AppButton>
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
