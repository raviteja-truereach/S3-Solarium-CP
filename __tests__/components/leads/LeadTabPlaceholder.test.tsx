/**
 * Lead Tab Placeholder Tests
 * Unit tests for placeholder component with error states
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { store } from '@store/store';
import { LeadTabPlaceholder } from '@components/leads/LeadTabPlaceholder';

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      <PaperProvider>{component}</PaperProvider>
    </Provider>
  );
};

describe('LeadTabPlaceholder', () => {
  describe('Normal Placeholder State', () => {
    it('should render placeholder content correctly', () => {
      const { getByText, getByTestId } = renderWithProviders(
        <LeadTabPlaceholder tabName="Documents" icon="file-document" />
      );

      expect(getByText('Documents')).toBeTruthy();
      expect(getByText('Coming in Sprint-4')).toBeTruthy();
      expect(
        getByText(
          'This feature is currently under development and will be available in the next sprint.'
        )
      ).toBeTruthy();
      expect(getByTestId('documents-tab-placeholder')).toBeTruthy();
    });

    it('should render disabled action buttons', () => {
      const { getByText } = renderWithProviders(
        <LeadTabPlaceholder tabName="Timeline" icon="timeline-clock" />
      );

      const addButton = getByText('Add Timeline');
      const viewButton = getByText('View All');

      expect(addButton).toBeTruthy();
      expect(viewButton).toBeTruthy();

      // Buttons should be disabled
      expect(addButton.props.accessibilityState?.disabled).toBe(true);
      expect(viewButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('should have proper accessibility attributes', () => {
      const { getByTestId } = renderWithProviders(
        <LeadTabPlaceholder tabName="Documents" testID="custom-test-id" />
      );

      const container = getByTestId('custom-test-id');
      expect(container.props.accessibilityRole).toBe('text');
      expect(container.props.accessibilityLabel).toBe(
        'Documents tab placeholder'
      );
    });
  });

  describe('Error State', () => {
    it('should render error content when isError is true', () => {
      const { getByText, getByTestId } = renderWithProviders(
        <LeadTabPlaceholder
          tabName="Documents"
          isError={true}
          testID="error-test-id"
        />
      );

      expect(getByText('Tab unavailable')).toBeTruthy();
      expect(getByText('Try again later')).toBeTruthy();
      expect(
        getByText(
          'Something went wrong while loading this tab. Please try again.'
        )
      ).toBeTruthy();
      expect(getByTestId('error-test-id')).toBeTruthy();
    });

    it('should show retry button when onRetry is provided', () => {
      const mockOnRetry = jest.fn();

      const { getByText } = renderWithProviders(
        <LeadTabPlaceholder
          tabName="Documents"
          isError={true}
          onRetry={mockOnRetry}
        />
      );

      const retryButton = getByText('Try Again');
      expect(retryButton).toBeTruthy();

      fireEvent.press(retryButton);
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should not show retry button when onRetry is not provided', () => {
      const { queryByText } = renderWithProviders(
        <LeadTabPlaceholder tabName="Documents" isError={true} />
      );

      expect(queryByText('Try Again')).toBeNull();
    });

    it('should have proper accessibility attributes in error state', () => {
      const { getByTestId } = renderWithProviders(
        <LeadTabPlaceholder tabName="Documents" isError={true} />
      );

      const container = getByTestId('documents-tab-error');
      expect(container.props.accessibilityRole).toBe('text');
      expect(container.props.accessibilityLabel).toBe(
        'Documents tab error state'
      );
    });
  });

  describe('Snapshots', () => {
    it('should match snapshot for normal placeholder', () => {
      const { toJSON } = renderWithProviders(
        <LeadTabPlaceholder tabName="Documents" icon="file-document" />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot for error state', () => {
      const { toJSON } = renderWithProviders(
        <LeadTabPlaceholder
          tabName="Documents"
          isError={true}
          onRetry={jest.fn()}
        />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot for timeline placeholder', () => {
      const { toJSON } = renderWithProviders(
        <LeadTabPlaceholder tabName="Timeline" icon="timeline-clock" />
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });
});
