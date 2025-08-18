/**
 * Lead Info Tab Comprehensive Tests
 * Complete unit testing for LeadInfoTab component with all scenarios
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { store } from '@store/store';
import { LeadInfoTab } from '@components/leads/LeadInfoTab';
import type { Lead } from '@types/lead';
import { Linking } from 'react-native';
import { STRINGS } from '@constants/strings';

// Mock Linking for phone actions
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  openURL: jest.fn(() => Promise.resolve()),
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

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      <PaperProvider>{component}</PaperProvider>
    </Provider>
  );
};

describe('LeadInfoTab - Comprehensive Tests', () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
    (Linking.openURL as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Data Display Coverage', () => {
    it('should render all lead fields correctly', async () => {
      const { getByText, getByLabelText } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      await waitFor(() => {
        // Contact information
        expect(
          getByLabelText(`${STRINGS.LEAD_INFO.CUSTOMER_NAME}: John Doe`)
        ).toBeTruthy();
        expect(
          getByLabelText(`${STRINGS.LEAD_INFO.PHONE}: +1234567890`)
        ).toBeTruthy();
        expect(
          getByLabelText(`${STRINGS.LEAD_INFO.EMAIL}: john.doe@example.com`)
        ).toBeTruthy();

        // Address information
        expect(
          getByLabelText(`${STRINGS.LEAD_INFO.CITY}: Mumbai`)
        ).toBeTruthy();
        expect(
          getByLabelText(`${STRINGS.LEAD_INFO.STATE}: Maharashtra`)
        ).toBeTruthy();
        expect(
          getByLabelText(`${STRINGS.LEAD_INFO.PIN_CODE}: 400001`)
        ).toBeTruthy();

        // Status information
        expect(
          getByLabelText(`${STRINGS.LEAD_INFO.CURRENT_STATUS}: Hot Lead`)
        ).toBeTruthy();
      });
    });

    it('should format date fields correctly', async () => {
      const { getByText } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      await waitFor(() => {
        expect(getByText(/Jan 15, 2024/)).toBeTruthy();
      });
    });

    it('should handle all null/undefined field combinations', async () => {
      const incompleteLeads = [
        { ...mockLead, email: null, city: null, pinCode: null },
        { ...mockLead, email: undefined, city: undefined, pinCode: undefined },
        { ...mockLead, email: '', city: '', pinCode: '' },
        { ...mockLead, nextFollowUpDate: null },
        { ...mockLead, nextFollowUpDate: undefined },
      ];

      for (const lead of incompleteLeads) {
        const { getAllByText } = renderWithProviders(
          <LeadInfoTab
            lead={lead}
            loading={false}
            error={null}
            onRetry={mockOnRetry}
          />
        );

        await waitFor(() => {
          const dashElements = getAllByText(STRINGS.LEAD_INFO.NOT_PROVIDED);
          expect(dashElements.length).toBeGreaterThan(0);
        });
      }
    });

    it('should handle special characters in data', async () => {
      const specialLead: Lead = {
        ...mockLead,
        customerName: "O'Connor & Associates",
        address: 'A/B-123, 2nd Floor, M.G. Road',
        city: 'Bengaluru',
        state: 'Karnataka',
      };

      const { getByLabelText } = renderWithProviders(
        <LeadInfoTab
          lead={specialLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      await waitFor(() => {
        expect(
          getByLabelText(
            `${STRINGS.LEAD_INFO.CUSTOMER_NAME}: O'Connor & Associates`
          )
        ).toBeTruthy();
        expect(
          getByLabelText(`${STRINGS.LEAD_INFO.CITY}: Bengaluru`)
        ).toBeTruthy();
      });
    });

    it('should handle very long field values', async () => {
      const longDataLead: Lead = {
        ...mockLead,
        customerName:
          'Very Long Customer Name That Should Be Handled Properly By The UI Without Breaking Layout',
        address:
          'Very Long Address That Should Be Handled Properly By The UI Without Breaking Layout And Should Wrap Correctly',
      };

      const { getByLabelText } = renderWithProviders(
        <LeadInfoTab
          lead={longDataLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      await waitFor(() => {
        expect(getByLabelText(/Very Long Customer Name/)).toBeTruthy();
      });
    });
  });

  describe('Loading State Coverage', () => {
    it('should show skeleton loader with proper accessibility', () => {
      const { getByText, getByLabelText } = renderWithProviders(
        <LeadInfoTab
          lead={undefined}
          loading={true}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      expect(getByText(STRINGS.LEAD_INFO.LOADING_LEAD)).toBeTruthy();
      // Should not show any lead data while loading
      expect(() => getByLabelText(/Customer Name/)).toThrow();
    });

    it('should handle loading state transitions', async () => {
      const { rerender, getByText, queryByText } = renderWithProviders(
        <LeadInfoTab
          lead={undefined}
          loading={true}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      expect(getByText(STRINGS.LEAD_INFO.LOADING_LEAD)).toBeTruthy();

      // Transition to loaded state
      rerender(
        <Provider store={store}>
          <PaperProvider>
            <LeadInfoTab
              lead={mockLead}
              loading={false}
              error={null}
              onRetry={mockOnRetry}
            />
          </PaperProvider>
        </Provider>
      );

      await waitFor(() => {
        expect(queryByText(STRINGS.LEAD_INFO.LOADING_LEAD)).toBeNull();
        expect(getByText('John Doe')).toBeTruthy();
      });
    });
  });

  describe('Error State Coverage', () => {
    const errorScenarios = [
      { error: new Error('Network error'), expectedMessage: 'Network error' },
      { error: new Error('Server error'), expectedMessage: 'Server error' },
      { error: 'cache-miss', expectedMessage: STRINGS.ERRORS.CACHE_MISS },
      { error: 'unknown-error', expectedMessage: STRINGS.ERRORS.UNKNOWN_ERROR },
      { error: null, expectedMessage: STRINGS.ERRORS.UNKNOWN_ERROR },
    ];

    errorScenarios.forEach(({ error, expectedMessage }) => {
      it(`should handle ${error} error correctly`, async () => {
        const { getByText } = renderWithProviders(
          <LeadInfoTab
            lead={undefined}
            loading={false}
            error={error}
            onRetry={mockOnRetry}
          />
        );

        await waitFor(() => {
          expect(getByText(STRINGS.LEAD_INFO.LOAD_ERROR_TITLE)).toBeTruthy();
          expect(getByText(expectedMessage)).toBeTruthy();
          expect(getByText(STRINGS.LEAD_INFO.RETRY_BUTTON)).toBeTruthy();
        });
      });
    });

    it('should call onRetry when retry button is pressed', async () => {
      const { getByText } = renderWithProviders(
        <LeadInfoTab
          lead={undefined}
          loading={false}
          error={new Error('Test error')}
          onRetry={mockOnRetry}
        />
      );

      const retryButton = getByText(STRINGS.LEAD_INFO.RETRY_BUTTON);
      fireEvent.press(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('No Data State Coverage', () => {
    it('should handle undefined lead', async () => {
      const { getByText } = renderWithProviders(
        <LeadInfoTab
          lead={undefined}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      await waitFor(() => {
        expect(getByText('No lead data available')).toBeTruthy();
        expect(getByText(STRINGS.LEAD_INFO.RETRY_BUTTON)).toBeTruthy();
      });
    });

    it('should call onRetry from no data state', async () => {
      const { getByText } = renderWithProviders(
        <LeadInfoTab
          lead={undefined}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      const retryButton = getByText(STRINGS.LEAD_INFO.RETRY_BUTTON);
      fireEvent.press(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Phone Actions Coverage', () => {
    it('should handle successful phone call', async () => {
      const { getByLabelText } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      const callButton = getByLabelText(
        `${STRINGS.LEAD_INFO.CALL} +1234567890`
      );
      fireEvent.press(callButton);

      await waitFor(() => {
        expect(Linking.canOpenURL).toHaveBeenCalledWith('tel:+1234567890');
        expect(Linking.openURL).toHaveBeenCalledWith('tel:+1234567890');
      });
    });

    it('should handle successful SMS', async () => {
      const { getByLabelText } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      const smsButton = getByLabelText(`${STRINGS.LEAD_INFO.SMS} +1234567890`);
      fireEvent.press(smsButton);

      await waitFor(() => {
        expect(Linking.canOpenURL).toHaveBeenCalledWith('sms:+1234567890');
        expect(Linking.openURL).toHaveBeenCalledWith('sms:+1234567890');
      });
    });

    it('should handle phone call failure', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);

      const { getByLabelText } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      const callButton = getByLabelText(
        `${STRINGS.LEAD_INFO.CALL} +1234567890`
      );
      fireEvent.press(callButton);

      await waitFor(() => {
        expect(Linking.canOpenURL).toHaveBeenCalledWith('tel:+1234567890');
        expect(Linking.openURL).not.toHaveBeenCalled();
      });
    });

    it('should handle phone actions with malformed numbers', async () => {
      const malformedPhoneLead: Lead = {
        ...mockLead,
        phone: 'invalid-phone',
      };

      const { getByLabelText } = renderWithProviders(
        <LeadInfoTab
          lead={malformedPhoneLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      const callButton = getByLabelText(
        `${STRINGS.LEAD_INFO.CALL} invalid-phone`
      );
      fireEvent.press(callButton);

      await waitFor(() => {
        expect(Linking.canOpenURL).toHaveBeenCalledWith('tel:invalid-phone');
      });
    });
  });

  describe('Performance Tests', () => {
    it('should render within performance target', async () => {
      const startTime = performance.now();

      renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100);
    });

    it('should handle rapid prop changes efficiently', async () => {
      const { rerender } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      const startTime = performance.now();

      // Rapid state changes
      for (let i = 0; i < 10; i++) {
        rerender(
          <Provider store={store}>
            <PaperProvider>
              <LeadInfoTab
                lead={i % 2 === 0 ? mockLead : undefined}
                loading={i % 3 === 0}
                error={i % 4 === 0 ? new Error('Test error') : null}
                onRetry={mockOnRetry}
              />
            </PaperProvider>
          </Provider>
        );
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(500);
    });
  });

  describe('Accessibility Coverage', () => {
    it('should have proper ARIA labels for all interactive elements', async () => {
      const { getByLabelText } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      await waitFor(() => {
        expect(
          getByLabelText(`${STRINGS.LEAD_INFO.CALL} +1234567890`)
        ).toBeTruthy();
        expect(
          getByLabelText(`${STRINGS.LEAD_INFO.SMS} +1234567890`)
        ).toBeTruthy();
      });
    });

    it('should handle screen reader navigation', async () => {
      const { getByLabelText } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      await waitFor(() => {
        const customerName = getByLabelText(
          `${STRINGS.LEAD_INFO.CUSTOMER_NAME}: John Doe`
        );
        expect(customerName.props.accessibilityRole).toBe('text');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle component unmounting during async operations', async () => {
      const { unmount } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      expect(() => unmount()).not.toThrow();
    });

    it('should handle concurrent retry calls', async () => {
      const { getByText } = renderWithProviders(
        <LeadInfoTab
          lead={undefined}
          loading={false}
          error={new Error('Test error')}
          onRetry={mockOnRetry}
        />
      );

      const retryButton = getByText(STRINGS.LEAD_INFO.RETRY_BUTTON);

      // Rapid clicks
      fireEvent.press(retryButton);
      fireEvent.press(retryButton);
      fireEvent.press(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(3);
    });
  });
});
