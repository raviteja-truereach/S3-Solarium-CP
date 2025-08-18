/**
 * EmptyLeadsState Component Tests
 * Comprehensive tests with accessibility validation
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { axe, toHaveNoViolations } from 'jest-axe';
import EmptyLeadsState from '../../../src/components/leads/EmptyLeadsState';

expect.extend(toHaveNoViolations);

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PaperProvider>{children}</PaperProvider>
);

describe('EmptyLeadsState', () => {
  describe('Rendering', () => {
    it('renders empty state correctly', () => {
      render(
        <TestWrapper>
          <EmptyLeadsState />
        </TestWrapper>
      );

      expect(screen.getByText('No leads yet')).toBeTruthy();
      expect(
        screen.getByText(
          'Start by adding your first lead to track potential customers'
        )
      ).toBeTruthy();
      expect(screen.getByTestId('empty-leads-state')).toBeTruthy();
    });

    it('renders with custom testID', () => {
      render(
        <TestWrapper>
          <EmptyLeadsState testID="custom-empty-state" />
        </TestWrapper>
      );

      expect(screen.getByTestId('custom-empty-state')).toBeTruthy();
    });

    it('renders add button when onAddLead provided', () => {
      const mockAddLead = jest.fn();

      render(
        <TestWrapper>
          <EmptyLeadsState onAddLead={mockAddLead} />
        </TestWrapper>
      );

      expect(screen.getByText('Add Your First Lead')).toBeTruthy();
      expect(screen.getByTestId('empty-leads-state-add-button')).toBeTruthy();
    });

    it('does not render add button when onAddLead not provided', () => {
      render(
        <TestWrapper>
          <EmptyLeadsState />
        </TestWrapper>
      );

      expect(screen.queryByText('Add Your First Lead')).toBeNull();
      expect(screen.queryByTestId('empty-leads-state-add-button')).toBeNull();
    });
  });

  describe('Interaction', () => {
    it('calls onAddLead when button is pressed', () => {
      const mockAddLead = jest.fn();

      render(
        <TestWrapper>
          <EmptyLeadsState onAddLead={mockAddLead} />
        </TestWrapper>
      );

      const addButton = screen.getByText('Add Your First Lead');
      fireEvent.press(addButton);

      expect(mockAddLead).toHaveBeenCalledTimes(1);
    });

    it('handles multiple button presses', () => {
      const mockAddLead = jest.fn();

      render(
        <TestWrapper>
          <EmptyLeadsState onAddLead={mockAddLead} />
        </TestWrapper>
      );

      const addButton = screen.getByText('Add Your First Lead');
      fireEvent.press(addButton);
      fireEvent.press(addButton);

      expect(mockAddLead).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <EmptyLeadsState />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should not have accessibility violations with button', async () => {
      const { container } = render(
        <TestWrapper>
          <EmptyLeadsState onAddLead={jest.fn()} />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper text accessibility', () => {
      render(
        <TestWrapper>
          <EmptyLeadsState />
        </TestWrapper>
      );

      const titleText = screen.getByText('No leads yet');
      const subtitleText = screen.getByText(
        'Start by adding your first lead to track potential customers'
      );

      // Text should be accessible to screen readers
      expect(titleText).toBeTruthy();
      expect(subtitleText).toBeTruthy();
    });

    it('button has proper accessibility attributes', () => {
      const mockAddLead = jest.fn();

      render(
        <TestWrapper>
          <EmptyLeadsState onAddLead={mockAddLead} />
        </TestWrapper>
      );

      const addButton = screen.getByTestId('empty-leads-state-add-button');
      expect(addButton.props.accessibilityRole).toBe('button');
    });
  });

  describe('Layout and Styling', () => {
    it('has proper container structure', () => {
      render(
        <TestWrapper>
          <EmptyLeadsState />
        </TestWrapper>
      );

      const container = screen.getByTestId('empty-leads-state');
      expect(container).toBeTruthy();
    });

    it('maintains layout with and without button', () => {
      const { rerender } = render(
        <TestWrapper>
          <EmptyLeadsState />
        </TestWrapper>
      );

      expect(screen.getByText('No leads yet')).toBeTruthy();

      rerender(
        <TestWrapper>
          <EmptyLeadsState onAddLead={jest.fn()} />
        </TestWrapper>
      );

      expect(screen.getByText('No leads yet')).toBeTruthy();
      expect(screen.getByText('Add Your First Lead')).toBeTruthy();
    });
  });
});
