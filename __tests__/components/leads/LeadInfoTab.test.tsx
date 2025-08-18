/**
 * Lead Info Tab Component Tests
 * Unit tests for LeadInfoTab component following existing test structure
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

// Mock Linking
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

describe('LeadInfoTab', () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
    (Linking.openURL as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Data Display', () => {
    it('should render lead information correctly', async () => {
      const { getByText } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('+1234567890')).toBeTruthy();
        expect(getByText('john.doe@example.com')).toBeTruthy();
        expect(getByText('Mumbai')).toBeTruthy();
        expect(getByText('Maharashtra')).toBeTruthy();
        expect(getByText('400001')).toBeTruthy();
        expect(getByText('Hot Lead')).toBeTruthy();
      });
    });

    it('should handle missing optional fields gracefully', async () => {
      const incompleteLeadNullValues: Lead = {
        ...mockLead,
        email: null,
        city: null,
        pinCode: undefined,
      };

      const { getAllByText } = renderWithProviders(
        <LeadInfoTab
          lead={incompleteLeadNullValues}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      await waitFor(() => {
        // Should show '—' for missing fields
        const dashElements = getAllByText(STRINGS.LEAD_INFO.NOT_PROVIDED);
        expect(dashElements.length).toBeGreaterThan(0);
      });
    });

    it('should handle empty string values as missing', async () => {
      const leadWithEmptyStrings: Lead = {
        ...mockLead,
        email: '',
        city: '',
        pinCode: '',
      };

      const { getAllByText } = renderWithProviders(
        <LeadInfoTab
          lead={leadWithEmptyStrings}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      await waitFor(() => {
        const dashElements = getAllByText(STRINGS.LEAD_INFO.NOT_PROVIDED);
        expect(dashElements.length).toBeGreaterThan(0);
      });
    });

    it('should format next follow-up date correctly', async () => {
      const { getByText } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      await waitFor(() => {
        // Check if formatted date is present
        expect(getByText(/Jan 15, 2024/)).toBeTruthy();
      });
    });

    it('should handle invalid date format gracefully', async () => {
      const leadWithInvalidDate: Lead = {
        ...mockLead,
        nextFollowUpDate: 'invalid-date',
      };

      const { getByText } = renderWithProviders(
        <LeadInfoTab
          lead={leadWithInvalidDate}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      await waitFor(() => {
        // Should show the raw string if date parsing fails
        expect(getByText('invalid-date')).toBeTruthy();
      });
    });

    it('should handle null next follow-up date', async () => {
      const leadWithNullDate: Lead = {
        ...mockLead,
        nextFollowUpDate: null,
      };

      const { getByText } = renderWithProviders(
        <LeadInfoTab
          lead={leadWithNullDate}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      await waitFor(() => {
        expect(getByText(STRINGS.LEAD_INFO.NOT_PROVIDED)).toBeTruthy();
      });
    });
  });

  describe('Loading State', () => {
    it('should show skeleton loader when loading', () => {
      const { getByText } = renderWithProviders(
        <LeadInfoTab
          lead={undefined}
          loading={true}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      expect(getByText(STRINGS.LEAD_INFO.LOADING_LEAD)).toBeTruthy();
    });

    it('should not render lead data when loading', () => {
      const { queryByText } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={true}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      expect(queryByText('John Doe')).toBeNull();
      expect(queryByText('+1234567890')).toBeNull();
    });
  });

  describe('Error States', () => {
    it('should show error banner for generic error', async () => {
      const error = new Error('Network error');

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
        expect(getByText('Network error')).toBeTruthy();
        expect(getByText(STRINGS.LEAD_INFO.RETRY_BUTTON)).toBeTruthy();
      });
    });

    it('should show cache-miss error message', async () => {
      const { getByText } = renderWithProviders(
        <LeadInfoTab
          lead={undefined}
          loading={false}
          error="cache-miss"
          onRetry={mockOnRetry}
        />
      );

      await waitFor(() => {
        expect(getByText(STRINGS.ERRORS.CACHE_MISS)).toBeTruthy();
      });
    });

    it('should show unknown error message for non-Error objects', async () => {
      const { getByText } = renderWithProviders(
        <LeadInfoTab
          lead={undefined}
          loading={false}
          error="some random error"
          onRetry={mockOnRetry}
        />
      );

      await waitFor(() => {
        expect(getByText(STRINGS.ERRORS.UNKNOWN_ERROR)).toBeTruthy();
      });
    });

    it('should call onRetry when retry button is pressed', async () => {
      const error = new Error('Test error');

      const { getByText } = renderWithProviders(
        <LeadInfoTab
          lead={undefined}
          loading={false}
          error={error}
          onRetry={mockOnRetry}
        />
      );

      const retryButton = getByText(STRINGS.LEAD_INFO.RETRY_BUTTON);
      fireEvent.press(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should not render lead data when error is present', async () => {
      const { queryByText } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={new Error('Test error')}
          onRetry={mockOnRetry}
        />
      );

      expect(queryByText('John Doe')).toBeNull();
      expect(queryByText('+1234567890')).toBeNull();
    });
  });

  describe('No Data State', () => {
    it('should show no data message when lead is undefined', async () => {
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

    it('should call onRetry when retry button is pressed in no data state', async () => {
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

  describe('Phone Actions', () => {
    it('should handle phone call action successfully', async () => {
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

    it('should handle SMS action successfully', async () => {
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

    it('should handle call action when device cannot make calls', async () => {
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

    it('should handle SMS action when device cannot send SMS', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);

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
        expect(Linking.openURL).not.toHaveBeenCalled();
      });
    });

    it('should handle Linking errors gracefully', async () => {
      (Linking.canOpenURL as jest.Mock).mockRejectedValue(
        new Error('Linking error')
      );

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

    it('should not show phone actions when phone is missing', async () => {
      const leadWithoutPhone: Lead = {
        ...mockLead,
        phone: null,
      };

      const { queryByLabelText } = renderWithProviders(
        <LeadInfoTab
          lead={leadWithoutPhone}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      expect(queryByLabelText(/Call/)).toBeNull();
      expect(queryByLabelText(/SMS/)).toBeNull();
    });
  });

  describe('Component Sections', () => {
    it('should render contact information section', async () => {
      const { getByText } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      await waitFor(() => {
        expect(getByText('Contact Information')).toBeTruthy();
        expect(getByText(STRINGS.LEAD_INFO.CUSTOMER_NAME)).toBeTruthy();
        expect(getByText(STRINGS.LEAD_INFO.PHONE)).toBeTruthy();
        expect(getByText(STRINGS.LEAD_INFO.EMAIL)).toBeTruthy();
      });
    });

    it('should render address information section', async () => {
      const { getByText } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      await waitFor(() => {
        expect(getByText('Address Information')).toBeTruthy();
        expect(getByText(STRINGS.LEAD_INFO.CITY)).toBeTruthy();
        expect(getByText(STRINGS.LEAD_INFO.STATE)).toBeTruthy();
        expect(getByText(STRINGS.LEAD_INFO.PIN_CODE)).toBeTruthy();
      });
    });

    it('should render lead status section', async () => {
      const { getByText } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );

      await waitFor(() => {
        expect(getByText('Lead Status')).toBeTruthy();
        expect(getByText(STRINGS.LEAD_INFO.CURRENT_STATUS)).toBeTruthy();
        expect(getByText(STRINGS.LEAD_INFO.NEXT_FOLLOWUP)).toBeTruthy();
      });
    });
  });

  describe('Snapshots', () => {
    it('should match snapshot with complete lead data', () => {
      const { toJSON } = renderWithProviders(
        <LeadInfoTab
          lead={mockLead}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot for loading state', () => {
      const { toJSON } = renderWithProviders(
        <LeadInfoTab
          lead={undefined}
          loading={true}
          error={null}
          onRetry={mockOnRetry}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot for error state', () => {
      const { toJSON } = renderWithProviders(
        <LeadInfoTab
          lead={undefined}
          loading={false}
          error={new Error('Test error')}
          onRetry={mockOnRetry}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot for no data state', () => {
      const { toJSON } = renderWithProviders(
        <LeadInfoTab
          lead={undefined}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with incomplete lead data', () => {
      const incompleteLeadNullValues: Lead = {
        ...mockLead,
        email: null,
        city: null,
        pinCode: null,
        nextFollowUpDate: null,
      };

      const { toJSON } = renderWithProviders(
        <LeadInfoTab
          lead={incompleteLeadNullValues}
          loading={false}
          error={null}
          onRetry={mockOnRetry}
        />
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
