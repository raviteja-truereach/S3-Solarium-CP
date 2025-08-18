/**
 * StatusChangeDialog Accessibility Tests
 */

import React, { createRef } from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { configureStore } from '@reduxjs/toolkit';
import { axe, toHaveNoViolations } from 'jest-axe';

import StatusChangeDialog, {
  StatusChangeDialogRef,
} from '../../src/components/leads/StatusChangeDialog';
import { leadApi } from '../../src/store/api/leadApi';

expect.extend(toHaveNoViolations);

// Mock dependencies
jest.mock('../../src/validation/statusValidation', () => ({
  validateStatusChange: () => ({ valid: false }),
  getAllowedNextStatuses: () => ['In Discussion', 'Not Interested'],
  getStatusRequirements: () => ['Remarks must be at least 10 characters'],
}));

jest.mock('../../src/store/api/leadApi', () => ({
  useGetQuotationsByLeadIdQuery: () => ({
    data: [],
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('react-native-date-picker', () => 'MockDatePicker');

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

describe('StatusChangeDialog Accessibility', () => {
  test('should pass axe accessibility tests', async () => {
    const ref = createRef<StatusChangeDialogRef>();

    const { container } = render(
      <TestWrapper>
        <StatusChangeDialog
          leadId="LEAD-123"
          currentStatus="New Lead"
          onStatusChange={jest.fn()}
          ref={ref}
        />
      </TestWrapper>
    );

    // Open dialog
    ref.current?.open();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
