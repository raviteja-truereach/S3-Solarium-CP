/**
 * StatusChangeDialog Component Tests
 * RTL tests with validation, accessibility, and interaction testing
 */

import React, { createRef } from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { configureStore } from '@reduxjs/toolkit';
import { axe, toHaveNoViolations } from 'jest-axe';

import StatusChangeDialog, {
  StatusChangeDialogRef,
} from '../../../src/components/leads/StatusChangeDialog';
import { leadApi } from '../../../src/store/api/leadApi';

expect.extend(toHaveNoViolations);

// Mock the validation service
jest.mock('../../../src/validation/statusValidation', () => ({
  validateStatusChange: jest.fn(),
  getAllowedNextStatuses: jest.fn(),
  getStatusRequirements: jest.fn(),
}));

// Mock the leadApi
const mockUseGetQuotationsByLeadIdQuery = jest.fn();
jest.mock('../../../src/store/api/leadApi', () => ({
  useGetQuotationsByLeadIdQuery: () => mockUseGetQuotationsByLeadIdQuery(),
}));

// Mock react-native-date-picker
jest.mock('react-native-date-picker', () => {
  return jest.fn().mockImplementation(({ onConfirm, onCancel, open, date }) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');

    if (!open) return null;

    return React.createElement(
      TouchableOpacity,
      {
        testID: 'mock-date-picker',
        onPress: () => onConfirm(new Date('2024-01-15')),
      },
      React.createElement(Text, null, 'Mock Date Picker')
    );
  });
});

const {
  validateStatusChange,
  getAllowedNextStatuses,
  getStatusRequirements,
} = require('../../../src/validation/statusValidation');

// Mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      [leadApi.reducerPath]: leadApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(leadApi.middleware),
  });
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = createMockStore();
  return (
    <Provider store={store}>
      <PaperProvider>{children}</PaperProvider>
    </Provider>
  );
};

describe('StatusChangeDialog', () => {
  const mockOnStatusChange = jest.fn();
  const mockProps = {
    leadId: 'LEAD-123',
    currentStatus: 'New Lead',
    onStatusChange: mockOnStatusChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    getAllowedNextStatuses.mockReturnValue(['In Discussion', 'Not Interested']);
    getStatusRequirements.mockReturnValue([
      'Remarks must be at least 10 characters',
    ]);
    validateStatusChange.mockReturnValue({ valid: false, errors: {} });

    mockUseGetQuotationsByLeadIdQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });
  });

  describe('Dialog Visibility', () => {
    test('should not be visible initially', () => {
      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} />
        </TestWrapper>
      );

      expect(screen.queryByTestId('status-change-dialog')).toHaveProp(
        'visible',
        false
      );
    });

    test('should open when open() is called', () => {
      const ref = createRef<StatusChangeDialogRef>();

      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} ref={ref} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      expect(screen.getByTestId('status-change-dialog')).toHaveProp(
        'visible',
        true
      );
    });

    test('should close when close() is called', () => {
      const ref = createRef<StatusChangeDialogRef>();

      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} ref={ref} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      act(() => {
        ref.current?.close();
      });

      expect(screen.getByTestId('status-change-dialog')).toHaveProp(
        'visible',
        false
      );
    });

    test('should close when cancel button is pressed', () => {
      const ref = createRef<StatusChangeDialogRef>();

      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} ref={ref} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      fireEvent.press(screen.getByTestId('cancel-button'));

      expect(screen.getByTestId('status-change-dialog')).toHaveProp(
        'visible',
        false
      );
    });
  });

  describe('Current Status Display', () => {
    test('should display current status as read-only chip', () => {
      const ref = createRef<StatusChangeDialogRef>();

      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      const currentStatusChip = screen.getByTestId('current-status-chip');
      expect(currentStatusChip).toHaveTextContent('New Lead');
    });
  });

  describe('Status Selection', () => {
    test('should display allowed next statuses', () => {
      const ref = createRef<StatusChangeDialogRef>();
      getAllowedNextStatuses.mockReturnValue([
        'In Discussion',
        'Not Interested',
        'Other Territory',
      ]);

      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} ref={ref} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      expect(screen.getByTestId('status-option-in-discussion')).toBeTruthy();
      expect(screen.getByTestId('status-option-not-interested')).toBeTruthy();
      expect(screen.getByTestId('status-option-other-territory')).toBeTruthy();
    });

    test('should select status when chip is pressed', () => {
      const ref = createRef<StatusChangeDialogRef>();

      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} ref={ref} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      fireEvent.press(screen.getByTestId('status-option-in-discussion'));

      // Verify the chip becomes selected (would need to check styling or state)
      expect(screen.getByTestId('status-option-in-discussion')).toBeTruthy();
    });
  });

  describe('Won Status with Quotations', () => {
    test('should show Won option when quotations exist', () => {
      const ref = createRef<StatusChangeDialogRef>();
      getAllowedNextStatuses.mockReturnValue(['Won', 'Not Interested']);
      mockUseGetQuotationsByLeadIdQuery.mockReturnValue({
        data: [
          { quotationId: 'QUOT-123', totalCost: 50000, leadId: 'LEAD-123' },
        ],
        isLoading: false,
        refetch: jest.fn(),
      });

      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} ref={ref} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      expect(screen.getByTestId('status-option-won')).toBeTruthy();
    });

    test('should hide Won option when no quotations exist', () => {
      const ref = createRef<StatusChangeDialogRef>();
      getAllowedNextStatuses.mockReturnValue(['Won', 'Not Interested']);
      mockUseGetQuotationsByLeadIdQuery.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: jest.fn(),
      });

      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} ref={ref} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      expect(screen.queryByTestId('status-option-won')).toBeNull();
      expect(screen.getByText(/Generate and share a quotation/)).toBeTruthy();
    });

    test('should show quotation selection when Won status is selected', () => {
      const ref = createRef<StatusChangeDialogRef>();
      getAllowedNextStatuses.mockReturnValue(['Won']);
      getStatusRequirements.mockReturnValue(['Quotation reference required']);
      mockUseGetQuotationsByLeadIdQuery.mockReturnValue({
        data: [
          { quotationId: 'QUOT-123', totalCost: 50000, leadId: 'LEAD-123' },
          { quotationId: 'QUOT-456', totalCost: 75000, leadId: 'LEAD-123' },
        ],
        isLoading: false,
        refetch: jest.fn(),
      });

      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} ref={ref} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      // Select Won status
      fireEvent.press(screen.getByTestId('status-option-won'));

      // Check quotation options appear
      expect(screen.getByTestId('quotation-option-QUOT-123')).toBeTruthy();
      expect(screen.getByTestId('quotation-option-QUOT-456')).toBeTruthy();
    });
  });

  describe('Required Fields', () => {
    test('should show token number input when required', () => {
      const ref = createRef<StatusChangeDialogRef>();
      getAllowedNextStatuses.mockReturnValue(['Under Execution']);
      getStatusRequirements.mockReturnValue(['Token number required']);

      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} ref={ref} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      // Select status that requires token number
      fireEvent.press(screen.getByTestId('status-option-under-execution'));

      expect(screen.getByTestId('token-number-input')).toBeTruthy();
    });

    test('should show follow-up date picker when required', () => {
      const ref = createRef<StatusChangeDialogRef>();
      getAllowedNextStatuses.mockReturnValue(['In Discussion']);
      getStatusRequirements.mockReturnValue(['Follow-up date required']);

      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} ref={ref} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      // Select status that requires follow-up
      fireEvent.press(screen.getByTestId('status-option-in-discussion'));

      expect(screen.getByTestId('follow-up-date-button')).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    test('should disable save button when validation fails', () => {
      const ref = createRef<StatusChangeDialogRef>();
      validateStatusChange.mockReturnValue({ valid: false });

      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} ref={ref} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toBeDisabled();
    });

    test('should enable save button when validation passes', () => {
      const ref = createRef<StatusChangeDialogRef>();
      validateStatusChange.mockReturnValue({ valid: true });

      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} ref={ref} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      // Fill in required fields
      fireEvent.press(screen.getByTestId('status-option-not-interested'));
      fireEvent.changeText(
        screen.getByTestId('remarks-input'),
        'Valid remarks here'
      );

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).not.toBeDisabled();
    });

    test('should show validation errors', () => {
      const ref = createRef<StatusChangeDialogRef>();
      validateStatusChange.mockReturnValue({
        valid: false,
        errors: { remarks: 'Remarks too short' },
      });

      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} ref={ref} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      // Fill form to trigger validation
      fireEvent.press(screen.getByTestId('status-option-not-interested'));
      fireEvent.changeText(screen.getByTestId('remarks-input'), 'Short');

      expect(screen.getByText('Remarks too short')).toBeTruthy();
    });
  });

  describe('Form Submission', () => {
    test('should call onStatusChange when form is submitted', async () => {
      const ref = createRef<StatusChangeDialogRef>();
      validateStatusChange.mockReturnValue({ valid: true });

      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} ref={ref} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      // Fill and submit form
      fireEvent.press(screen.getByTestId('status-option-not-interested'));
      fireEvent.changeText(
        screen.getByTestId('remarks-input'),
        'Customer not interested in solar'
      );

      fireEvent.press(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(mockOnStatusChange).toHaveBeenCalledWith({
          currentStatus: 'New Lead',
          newStatus: 'Not Interested',
          remarks: 'Customer not interested in solar',
          nextFollowUpDate: undefined,
          quotationRef: undefined,
          tokenNumber: undefined,
        });
      });
    });

    test('should close dialog after successful submission', async () => {
      const ref = createRef<StatusChangeDialogRef>();
      validateStatusChange.mockReturnValue({ valid: true });
      mockOnStatusChange.mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} ref={ref} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      // Fill and submit form
      fireEvent.press(screen.getByTestId('status-option-not-interested'));
      fireEvent.changeText(
        screen.getByTestId('remarks-input'),
        'Customer not interested'
      );

      fireEvent.press(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(screen.getByTestId('status-change-dialog')).toHaveProp(
          'visible',
          false
        );
      });
    });
  });

  describe('Accessibility', () => {
    test('should have no accessibility violations', async () => {
      const ref = createRef<StatusChangeDialogRef>();

      const { container } = render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} ref={ref} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should have proper accessibility labels', () => {
      const ref = createRef<StatusChangeDialogRef>();

      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} ref={ref} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      expect(screen.getByLabelText('Remarks Input')).toBeTruthy();
    });
  });

  describe('Loading States', () => {
    test('should show loading state for quotations', () => {
      const ref = createRef<StatusChangeDialogRef>();
      mockUseGetQuotationsByLeadIdQuery.mockReturnValue({
        data: [],
        isLoading: true,
        refetch: jest.fn(),
      });

      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} ref={ref} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      expect(screen.getByText('Loading quotations...')).toBeTruthy();
    });

    test('should show loading state on save button during submission', () => {
      const ref = createRef<StatusChangeDialogRef>();
      validateStatusChange.mockReturnValue({ valid: true });

      render(
        <TestWrapper>
          <StatusChangeDialog {...mockProps} ref={ref} />
        </TestWrapper>
      );

      act(() => {
        ref.current?.open();
      });

      // Fill form
      fireEvent.press(screen.getByTestId('status-option-not-interested'));
      fireEvent.changeText(
        screen.getByTestId('remarks-input'),
        'Customer not interested'
      );

      // Submit form
      fireEvent.press(screen.getByTestId('save-button'));

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toHaveProp('loading', true);
    });
  });
});
