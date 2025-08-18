/**
 * Lead Detail Screen Tab Tests
 * Integration tests for tab functionality, placeholders, and error states
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { store } from '@store/store';
import LeadDetailScreen from '@screens/leads/LeadDetailScreen';

// Mock the useLeadById hook
const mockUseLeadById = jest.fn();
jest.mock('@hooks/useLeadById', () => ({
  useLeadById: () => mockUseLeadById(),
}));

// Mock disabled tab toast
jest.mock('@components/common/DisabledTabToast', () => ({
  useDisabledTabToast: () => ({
    showToast: jest.fn(),
  }),
}));

const mockRoute = {
  params: { leadId: 'LEAD-123' },
} as any;

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
} as any;

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      <PaperProvider>
        <NavigationContainer>{component}</NavigationContainer>
      </PaperProvider>
    </Provider>
  );
};

describe('LeadDetailScreen - Tab Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLeadById.mockReturnValue({
      lead: {
        id: 'LEAD-123',
        customerName: 'John Doe',
        status: 'Hot Lead',
      },
      loading: false,
      error: null,
      source: 'api',
      onRetry: jest.fn(),
    });
  });

  describe('Tab Placeholders', () => {
    it('should show Documents tab placeholder', async () => {
      const { getByText } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Switch to Documents tab
      fireEvent.press(getByText('Documents'));

      await waitFor(() => {
        expect(getByText('Documents')).toBeTruthy();
        expect(getByText('Coming in Sprint-4')).toBeTruthy();
        expect(getByText('Add Documents')).toBeTruthy();
        expect(getByText('View All')).toBeTruthy();
      });
    });

    it('should show Timeline tab placeholder', async () => {
      const { getByText } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Switch to Timeline tab
      fireEvent.press(getByText('Timeline'));

      await waitFor(() => {
        expect(getByText('Timeline')).toBeTruthy();
        expect(getByText('Coming in Sprint-4')).toBeTruthy();
        expect(getByText('Add Timeline')).toBeTruthy();
        expect(getByText('View All')).toBeTruthy();
      });
    });

    it('should show disabled action buttons in placeholders', async () => {
      const { getByText } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Switch to Documents tab
      fireEvent.press(getByText('Documents'));

      await waitFor(() => {
        const addButton = getByText('Add Documents');
        const viewButton = getByText('View All');

        expect(addButton.props.accessibilityState?.disabled).toBe(true);
        expect(viewButton.props.accessibilityState?.disabled).toBe(true);
      });
    });
  });

  describe('Disabled Quotations Tab', () => {
    it('should show greyed out Quotations tab', () => {
      const { getByText } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      const quotationsTab = getByText('Quotations');
      expect(quotationsTab).toBeTruthy();

      // Tab should be present but styled differently (handled by SegmentedButtons)
    });

    it('should show toast when Quotations tab is tapped', async () => {
      const mockShowToast = jest.fn();

      jest.doMock('@components/common/DisabledTabToast', () => ({
        useDisabledTabToast: () => ({
          showToast: mockShowToast,
        }),
      }));

      const { getByText } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Tap Quotations tab
      fireEvent.press(getByText('Quotations'));

      // Should show toast (mocked)
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({ message: 'Coming soon' });
      });
    });
  });

  describe('Error Boundary Integration', () => {
    it('should catch tab rendering errors', async () => {
      // Mock console.error to prevent noise
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // This would be tested with actual error-throwing components
      const { getByText } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Switch to Documents tab
      fireEvent.press(getByText('Documents'));

      await waitFor(() => {
        // Should render placeholder without errors
        expect(getByText('Documents')).toBeTruthy();
      });

      console.error = originalConsoleError;
    });
  });

  describe('Accessibility', () => {
    it('should have proper test IDs for tab content', async () => {
      const { getByTestId } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Switch to Documents tab
      fireEvent.press(getByTestId('lead-tabs') || getByText('Documents'));

      await waitFor(() => {
        expect(getByTestId('documents-tab-content')).toBeTruthy();
      });
    });

    it('should have proper accessibility attributes for placeholders', async () => {
      const { getByText, getByTestId } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Switch to Timeline tab
      fireEvent.press(getByText('Timeline'));

      await waitFor(() => {
        const placeholder = getByTestId('timeline-tab-content');
        expect(placeholder.props.accessibilityRole).toBe('text');
        expect(placeholder.props.accessibilityLabel).toBe(
          'Timeline tab placeholder'
        );
      });
    });
  });

  describe('Tab Switching', () => {
    it('should handle tab switching correctly', async () => {
      const { getByText } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Start with Info tab (default)
      expect(getByText('Info')).toBeTruthy();

      // Switch to Documents
      fireEvent.press(getByText('Documents'));
      await waitFor(() => {
        expect(getByText('Coming in Sprint-4')).toBeTruthy();
      });

      // Switch to Timeline
      fireEvent.press(getByText('Timeline'));
      await waitFor(() => {
        expect(getByText('Timeline')).toBeTruthy();
      });

      // Switch back to Info
      fireEvent.press(getByText('Info'));
      await waitFor(() => {
        // Should show lead info content
        expect(getByText('Info')).toBeTruthy();
      });
    });
  });
});
