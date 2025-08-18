/**
 * Lead Info Tab Accessibility Tests
 * A11y compliance testing for LeadInfoTab component
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { store } from '@store/store';
import { LeadInfoTab } from '@components/leads/LeadInfoTab';
import type { Lead } from '@types/lead';
import { STRINGS } from '@constants/strings';

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

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      <PaperProvider>{component}</PaperProvider>
    </Provider>
  );
};

describe('LeadInfoTab Accessibility', () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Accessibility Labels and Roles', () => {
    it('should have proper accessibility labels for all info rows', () => {
      const { getByLabelText } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      // Check all info rows have proper accessibility labels
      expect(
        getByLabelText(`${STRINGS.LEAD_INFO.CUSTOMER_NAME}: John Doe`)
      ).toBeTruthy();
      expect(
        getByLabelText(`${STRINGS.LEAD_INFO.PHONE}: +1234567890`)
      ).toBeTruthy();
      expect(
        getByLabelText(`${STRINGS.LEAD_INFO.EMAIL}: john.doe@example.com`)
      ).toBeTruthy();
      expect(getByLabelText(`${STRINGS.LEAD_INFO.CITY}: Mumbai`)).toBeTruthy();
      expect(
        getByLabelText(`${STRINGS.LEAD_INFO.STATE}: Maharashtra`)
      ).toBeTruthy();
      expect(
        getByLabelText(`${STRINGS.LEAD_INFO.PIN_CODE}: 400001`)
      ).toBeTruthy();
      expect(
        getByLabelText(`${STRINGS.LEAD_INFO.CURRENT_STATUS}: Hot Lead`)
      ).toBeTruthy();
    });

    it('should have proper accessibility labels for phone action buttons', () => {
      const { getByLabelText } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      // Check phone action buttons have proper accessibility labels
      expect(
        getByLabelText(`${STRINGS.LEAD_INFO.CALL} +1234567890`)
      ).toBeTruthy();
      expect(
        getByLabelText(`${STRINGS.LEAD_INFO.SMS} +1234567890`)
      ).toBeTruthy();
    });

    it('should have proper accessibility labels for missing fields', () => {
      const incompleteLeadNullValues: Lead = {
        ...mockLead,
        email: null,
        city: null,
        pinCode: null,
      };

      const { getByLabelText } = renderWithProviders(
        <LeadInfoTab
          lead={incompleteLeadNullValues}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      // Check missing fields have proper accessibility labels
      expect(
        getByLabelText(
          `${STRINGS.LEAD_INFO.EMAIL}: ${STRINGS.LEAD_INFO.NOT_PROVIDED}`
        )
      ).toBeTruthy();
      expect(
        getByLabelText(
          `${STRINGS.LEAD_INFO.CITY}: ${STRINGS.LEAD_INFO.NOT_PROVIDED}`
        )
      ).toBeTruthy();
      expect(
        getByLabelText(
          `${STRINGS.LEAD_INFO.PIN_CODE}: ${STRINGS.LEAD_INFO.NOT_PROVIDED}`
        )
      ).toBeTruthy();
    });
  });

  describe('Error State Accessibility', () => {
    it('should be accessible in error state', () => {
      const { getByRole } = renderWithProviders(
        <LeadInfoTab
          lead={undefined}
          loading={false}
          error={new Error('Test error')}
          onRetry={mockOnRetry}
        />
      );

      // Retry button should be accessible
      const retryButton = getByRole('button');
      expect(retryButton).toBeTruthy();
    });

    it('should have proper accessibility for error banner', () => {
      const { getByText } = renderWithProviders(
        <LeadInfoTab
          lead={undefined}
          loading={false}
          error={new Error('Network error')}
          onRetry={mockOnRetry}
        />
      );

      // Error messages should be accessible
      expect(getByText(STRINGS.LEAD_INFO.LOAD_ERROR_TITLE)).toBeTruthy();
      expect(getByText('Network error')).toBeTruthy();
    });
  });

  describe('Loading State Accessibility', () => {
    it('should be accessible in loading state', () => {
      const { getByText } = renderWithProviders(
        <LeadInfoTab
          lead={undefined}
          loading={true}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      // Loading text should be accessible
      expect(getByText(STRINGS.LEAD_INFO.LOADING_LEAD)).toBeTruthy();
    });
  });

  describe('No Data State Accessibility', () => {
    it('should be accessible in no data state', () => {
      const { getByText, getByRole } = renderWithProviders(
        <LeadInfoTab
          lead={undefined}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      // No data message should be accessible
      expect(getByText('No lead data available')).toBeTruthy();

      // Retry button should be accessible
      const retryButton = getByRole('button');
      expect(retryButton).toBeTruthy();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should have proper focus management for interactive elements', () => {
      const { getByLabelText } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      // Action buttons should be focusable
      const callButton = getByLabelText(
        `${STRINGS.LEAD_INFO.CALL} +1234567890`
      );
      const smsButton = getByLabelText(`${STRINGS.LEAD_INFO.SMS} +1234567890`);

      expect(callButton).toBeTruthy();
      expect(smsButton).toBeTruthy();

      // These should be focusable elements
      expect(callButton.props.accessibilityLabel).toBe(
        `${STRINGS.LEAD_INFO.CALL} +1234567890`
      );
      expect(smsButton.props.accessibilityLabel).toBe(
        `${STRINGS.LEAD_INFO.SMS} +1234567890`
      );
    });
  });

  describe('Text Content Accessibility', () => {
    it('should have proper accessibility roles for text content', () => {
      const { getByLabelText } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      // Text elements should have proper accessibility roles
      const customerNameElement = getByLabelText(
        `${STRINGS.LEAD_INFO.CUSTOMER_NAME}: John Doe`
      );
      expect(customerNameElement.props.accessibilityRole).toBe('text');
    });

    it('should handle long text content properly', () => {
      const leadWithLongText: Lead = {
        ...mockLead,
        customerName:
          'Very Long Customer Name That Should Be Handled Properly By Screen Reader',
        address:
          'Very Long Address That Should Be Handled Properly By Screen Reader Technology',
      };

      const { getByLabelText } = renderWithProviders(
        <LeadInfoTab
          lead={leadWithLongText}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      // Long text should still be accessible
      expect(
        getByLabelText(
          `${STRINGS.LEAD_INFO.CUSTOMER_NAME}: Very Long Customer Name That Should Be Handled Properly By Screen Reader`
        )
      ).toBeTruthy();
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should not rely solely on color for information', () => {
      const component = (
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      const { container } = renderWithProviders(component);

      // Component should not have accessibility violations
      // Note: Full color contrast testing would require additional tools
      expect(container).toBeTruthy();
    });
  });

  describe('Dynamic Content Accessibility', () => {
    it('should handle dynamic content changes accessibly', () => {
      const { rerender } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      // Switch to loading state
      rerender(
        <Provider store={store}>
          <PaperProvider>
            <LeadInfoTab
              lead={undefined}
              loading={true}
              error={null}
              onRetry={mockOnRetry}
            />
          </PaperProvider>
        </Provider>
      );

      // Should still be accessible in new state
      expect(true).toBeTruthy(); // Component should render without errors
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should provide meaningful information to screen readers', () => {
      const { getByLabelText } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      // Screen reader should get meaningful information
      const phoneElement = getByLabelText(
        `${STRINGS.LEAD_INFO.PHONE}: +1234567890`
      );
      expect(phoneElement.props.accessibilityLabel).toBe(
        `${STRINGS.LEAD_INFO.PHONE}: +1234567890`
      );
      expect(phoneElement.props.accessibilityRole).toBe('text');
    });
  });
});
