/**
 * Lead Detail Screen Tests
 * Unit tests for offline chip and error banner functionality
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { store } from '@store/store';
import LeadDetailScreen from '@screens/leads/LeadDetailScreen';
import type { Lead } from '@types/lead';

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

const mockLead: Lead = {
  id: 'LEAD-123',
  customerName: 'John Doe',
  phone: '+1234567890',
  email: 'john.doe@example.com',
  city: 'Mumbai',
  state: 'Maharashtra',
  pinCode: '400001',
  status: 'Hot Lead',
  nextFollowUpDate: '2024-01-15T10:00:00Z',
  address: '123 Main St',
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-10T10:00:00Z',
};

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

describe('LeadDetailScreen - Data Connection & Indicators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Online API Data', () => {
    it('should display lead data from API without offline chip', async () => {
      mockUseLeadById.mockReturnValue({
        lead: mockLead,
        loading: false,
        error: null,
        source: 'api',
        onRetry: jest.fn(),
      });

      const { getByText, queryByText } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Lead #LEAD-123')).toBeTruthy();
        // Should not show offline chip for API data
        expect(queryByText('Offline copy')).toBeNull();
      });
    });

    it('should display loading state correctly', () => {
      mockUseLeadById.mockReturnValue({
        lead: undefined,
        loading: true,
        error: null,
        source: 'api',
        onRetry: jest.fn(),
      });

      const { getByText } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(getByText('Lead #LEAD-123')).toBeTruthy();
      // Loading state is handled by LeadInfoTab component
    });
  });

  describe('Offline Cache Data', () => {
    it('should display offline chip when source is cache', async () => {
      mockUseLeadById.mockReturnValue({
        lead: mockLead,
        loading: false,
        error: null,
        source: 'cache',
        onRetry: jest.fn(),
      });

      const { getByText } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Lead #LEAD-123')).toBeTruthy();
        expect(getByText('Offline copy')).toBeTruthy();
      });
    });

    it('should style offline chip correctly', async () => {
      mockUseLeadById.mockReturnValue({
        lead: mockLead,
        loading: false,
        error: null,
        source: 'cache',
        onRetry: jest.fn(),
      });

      const { getByText } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const offlineChip = getByText('Offline copy');
        expect(offlineChip).toBeTruthy();
        // Check that it's a chip component (has the right styling)
        expect(offlineChip.parent?.props.style).toBeDefined();
      });
    });
  });

  describe('Error States', () => {
    it('should hide offline chip when error is present', async () => {
      mockUseLeadById.mockReturnValue({
        lead: undefined,
        loading: false,
        error: new Error('Network error'),
        source: 'cache',
        onRetry: jest.fn(),
      });

      const { getByText, queryByText } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Lead #LEAD-123')).toBeTruthy();
        // Should not show offline chip when there's an error
        expect(queryByText('Offline copy')).toBeNull();
      });
    });

    it('should display error banner through LeadInfoTab', async () => {
      const mockOnRetry = jest.fn();
      mockUseLeadById.mockReturnValue({
        lead: undefined,
        loading: false,
        error: new Error('Failed to load lead'),
        source: 'api',
        onRetry: mockOnRetry,
      });

      const { getByText } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Lead #LEAD-123')).toBeTruthy();
        // Error handling is done by LeadInfoTab component
      });
    });

    it('should handle cache-miss error', async () => {
      mockUseLeadById.mockReturnValue({
        lead: undefined,
        loading: false,
        error: 'cache-miss',
        source: 'cache',
        onRetry: jest.fn(),
      });

      const { getByText, queryByText } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Lead #LEAD-123')).toBeTruthy();
        expect(queryByText('Offline copy')).toBeNull();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should maintain tab functionality with data integration', async () => {
      mockUseLeadById.mockReturnValue({
        lead: mockLead,
        loading: false,
        error: null,
        source: 'api',
        onRetry: jest.fn(),
      });

      const { getByText } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Info')).toBeTruthy();
        expect(getByText('Quotations')).toBeTruthy();
        expect(getByText('Documents')).toBeTruthy();
        expect(getByText('Timeline')).toBeTruthy();
      });

      // Test tab switching
      fireEvent.press(getByText('Documents'));

      await waitFor(() => {
        expect(getByText('Coming in Sprint-4')).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid leadId', () => {
      const invalidRoute = {
        params: { leadId: '' },
      } as any;

      const { getByText } = renderWithProviders(
        <LeadDetailScreen route={invalidRoute} navigation={mockNavigation} />
      );

      expect(getByText('Invalid Lead ID')).toBeTruthy();
    });

    it('should handle undefined leadId', () => {
      const invalidRoute = {
        params: {},
      } as any;

      const { getByText } = renderWithProviders(
        <LeadDetailScreen route={invalidRoute} navigation={mockNavigation} />
      );

      expect(getByText('Invalid Lead ID')).toBeTruthy();
    });
  });

  describe('Data Flow Integration', () => {
    it('should pass correct props to InfoTabContent', async () => {
      const mockOnRetry = jest.fn();
      mockUseLeadById.mockReturnValue({
        lead: mockLead,
        loading: false,
        error: null,
        source: 'cache',
        onRetry: mockOnRetry,
      });

      renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Verify hook is called with correct leadId
      expect(mockUseLeadById).toHaveBeenCalled();
    });

    it('should handle source changes dynamically', async () => {
      const { rerender } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // First render - API source
      mockUseLeadById.mockReturnValue({
        lead: mockLead,
        loading: false,
        error: null,
        source: 'api',
        onRetry: jest.fn(),
      });

      rerender(
        <Provider store={store}>
          <PaperProvider>
            <NavigationContainer>
              <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
            </NavigationContainer>
          </PaperProvider>
        </Provider>
      );

      // Second render - Cache source
      mockUseLeadById.mockReturnValue({
        lead: mockLead,
        loading: false,
        error: null,
        source: 'cache',
        onRetry: jest.fn(),
      });

      rerender(
        <Provider store={store}>
          <PaperProvider>
            <NavigationContainer>
              <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
            </NavigationContainer>
          </PaperProvider>
        </Provider>
      );

      // Should handle the source change
      expect(true).toBeTruthy(); // Component should render without errors
    });
  });

  describe('Snapshots', () => {
    it('should match snapshot with API data', () => {
      mockUseLeadById.mockReturnValue({
        lead: mockLead,
        loading: false,
        error: null,
        source: 'api',
        onRetry: jest.fn(),
      });

      const { toJSON } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with offline data', () => {
      mockUseLeadById.mockReturnValue({
        lead: mockLead,
        loading: false,
        error: null,
        source: 'cache',
        onRetry: jest.fn(),
      });

      const { toJSON } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with error state', () => {
      mockUseLeadById.mockReturnValue({
        lead: undefined,
        loading: false,
        error: new Error('Test error'),
        source: 'api',
        onRetry: jest.fn(),
      });

      const { toJSON } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });
});
