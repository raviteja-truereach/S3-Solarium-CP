/**
 * DashboardStatCard Component Tests
 * Comprehensive tests with accessibility validation
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { axe, toHaveNoViolations } from 'jest-axe';
import DashboardStatCard from '../../../src/components/dashboard/DashboardStatCard';

expect.extend(toHaveNoViolations);

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PaperProvider>{children}</PaperProvider>
);

describe('DashboardStatCard', () => {
  const defaultProps = {
    title: 'Test Metric',
    testID: 'test-card',
  };

  describe('Rendering States', () => {
    it('renders with value correctly', () => {
      render(
        <TestWrapper>
          <DashboardStatCard {...defaultProps} value={25} />
        </TestWrapper>
      );

      expect(screen.getByText('Test Metric')).toBeTruthy();
      expect(screen.getByText('25')).toBeTruthy();
      expect(screen.getByTestId('test-card-value')).toBeTruthy();
    });

    it('renders zero value correctly', () => {
      render(
        <TestWrapper>
          <DashboardStatCard {...defaultProps} value={0} />
        </TestWrapper>
      );

      expect(screen.getByText('0')).toBeTruthy();
      expect(screen.queryByTestId('test-card-loading')).toBeNull();
    });

    it('renders default zero when value is undefined', () => {
      render(
        <TestWrapper>
          <DashboardStatCard {...defaultProps} value={undefined} />
        </TestWrapper>
      );

      expect(screen.getByText('0')).toBeTruthy();
    });

    it('renders empty state when offline with no cache', () => {
      render(
        <TestWrapper>
          <DashboardStatCard
            {...defaultProps}
            value={undefined}
            isOffline={true}
            hasCache={false}
          />
        </TestWrapper>
      );

      expect(screen.getByText('–')).toBeTruthy();
      expect(screen.getByText('No data yet')).toBeTruthy();
      expect(screen.getByTestId('test-card-subtitle')).toBeTruthy();
    });

    it('shows zero when offline but has cache', () => {
      render(
        <TestWrapper>
          <DashboardStatCard
            {...defaultProps}
            value={undefined}
            isOffline={true}
            hasCache={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText('0')).toBeTruthy();
      expect(screen.queryByText('No data yet')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility label with value', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardStatCard {...defaultProps} value={42} />
        </TestWrapper>
      );

      const card = getByTestId('test-card');
      expect(card.props.accessibilityLabel).toBe('Test Metric, 42');
    });

    it('has proper accessibility label when empty', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardStatCard
            {...defaultProps}
            value={undefined}
            isOffline={true}
            hasCache={false}
          />
        </TestWrapper>
      );

      const card = getByTestId('test-card');
      expect(card.props.accessibilityLabel).toBe(
        'Test Metric, no data available'
      );
    });

    it('has live region attributes', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardStatCard {...defaultProps} value={25} />
        </TestWrapper>
      );

      const card = getByTestId('test-card');
      expect(card.props).toHaveProperty('accessibilityLiveRegion');
    });

    it('should not have accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <DashboardStatCard {...defaultProps} value={25} />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should respect font scaling', () => {
      const { getByText } = render(
        <TestWrapper>
          <DashboardStatCard {...defaultProps} value={25} />
        </TestWrapper>
      );

      const titleText = getByText('Test Metric');
      const valueText = getByText('25');

      expect(titleText.props.allowFontScaling).toBe(true);
      expect(valueText.props.allowFontScaling).toBe(true);
    });
  });

  describe('Props Handling', () => {
    it('handles large numbers correctly', () => {
      render(
        <TestWrapper>
          <DashboardStatCard {...defaultProps} value={999999} />
        </TestWrapper>
      );

      expect(screen.getByText('999999')).toBeTruthy();
    });

    it('handles long titles correctly', () => {
      const longTitle =
        'This is a very long metric title that should wrap properly';
      render(
        <TestWrapper>
          <DashboardStatCard {...defaultProps} title={longTitle} value={5} />
        </TestWrapper>
      );

      expect(screen.getByText(longTitle)).toBeTruthy();
    });

    it('applies custom testID', () => {
      render(
        <TestWrapper>
          <DashboardStatCard
            {...defaultProps}
            testID="custom-test-id"
            value={10}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('custom-test-id')).toBeTruthy();
      expect(screen.getByTestId('custom-test-id-value')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles negative values', () => {
      render(
        <TestWrapper>
          <DashboardStatCard {...defaultProps} value={-5} />
        </TestWrapper>
      );

      expect(screen.getByText('-5')).toBeTruthy();
    });

    it('handles very large numbers', () => {
      render(
        <TestWrapper>
          <DashboardStatCard {...defaultProps} value={1000000000} />
        </TestWrapper>
      );

      expect(screen.getByText('1000000000')).toBeTruthy();
    });

    it('handles decimal values', () => {
      render(
        <TestWrapper>
          <DashboardStatCard {...defaultProps} value={25.5} />
        </TestWrapper>
      );

      expect(screen.getByText('25.5')).toBeTruthy();
    });
  });
});
