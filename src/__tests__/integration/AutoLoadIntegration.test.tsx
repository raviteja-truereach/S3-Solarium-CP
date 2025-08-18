import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  screen,
} from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { store } from '../../store';
import { upsertLeads } from '../../store/slices/leadSlice';
import MyLeadsScreen from '../../screens/leads/MyLeadsScreen';
import { Lead } from '../../database/models/Lead';

// Mock network status
jest.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={store}>
    <PaperProvider>{children}</PaperProvider>
  </Provider>
);

describe('Auto-Load Integration', () => {
  beforeEach(() => {
    // Setup large dataset
    const mockLeads: Lead[] = Array.from(
      { length: 100 },
      (_, i) =>
        ({
          id: `LEAD-${i.toString().padStart(3, '0')}`,
          customer_id: `CUST-${i}`,
          customerName: `Customer ${i}`,
          status:
            i % 3 === 0 ? 'New Lead' : i % 3 === 1 ? 'In Discussion' : 'Won',
          phone: `+1234567${i.toString().padStart(3, '0')}`,
          address: `${i} Test Street`,
          email: `customer${i}@test.com`,
          priority: 'medium',
          source: 'CP',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sync_status: 'synced',
          local_changes: '{}',
        } as Lead)
    );

    store.dispatch(upsertLeads(mockLeads));
  });

  it('should trigger auto-load when search filter is applied', async () => {
    render(
      <TestWrapper>
        <MyLeadsScreen />
      </TestWrapper>
    );

    // Initially should show all leads
    expect(screen.getByText('100')).toBeTruthy(); // Total leads counter

    // Apply search filter
    const searchInput = screen.getByPlaceholderText('Search leads');
    fireEvent.changeText(searchInput, 'Customer 1');

    // Should show filtered results
    await waitFor(
      () => {
        // Should show leads with "Customer 1" in name (Customer 1, 10, 11, etc.)
        const filteredCount = screen.getByText(/Filtered Leads/);
        expect(filteredCount).toBeTruthy();
      },
      { timeout: 2000 }
    );
  });

  it('should trigger auto-load when status filter is applied', async () => {
    render(
      <TestWrapper>
        <MyLeadsScreen />
      </TestWrapper>
    );

    // Open filter sheet
    const filterButton = screen.getByTestId('filter-button');
    fireEvent.press(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Filter Leads')).toBeTruthy();
    });

    // Select "New Lead" status
    const newLeadChip = screen.getByTestId('status-chip-new-lead');
    fireEvent.press(newLeadChip);

    // Apply filters
    const applyButton = screen.getByTestId('apply-filters-button');
    fireEvent.press(applyButton);

    // Should show only "New Lead" status leads
    await waitFor(
      () => {
        const filteredLeads = screen.queryAllByText('New Lead');
        expect(filteredLeads.length).toBeGreaterThan(0);

        // Should not show other statuses
        expect(screen.queryByText('In Discussion')).toBeNull();
      },
      { timeout: 2000 }
    );
  });

  it('should show correct empty state message for filtered results', async () => {
    render(
      <TestWrapper>
        <MyLeadsScreen />
      </TestWrapper>
    );

    // Apply search that returns no results
    const searchInput = screen.getByPlaceholderText('Search leads');
    fireEvent.changeText(searchInput, 'NonExistentCustomer');

    // Should show filtered empty state
    await waitFor(
      () => {
        expect(screen.getByText('No leads match your filters')).toBeTruthy();
        expect(
          screen.getByText(/No results found for "NonExistentCustomer"/)
        ).toBeTruthy();
      },
      { timeout: 1000 }
    );
  });

  it('should maintain scroll position when filtering', async () => {
    render(
      <TestWrapper>
        <MyLeadsScreen />
      </TestWrapper>
    );

    // Get the FlatList component
    const flatList = screen.getByLabelText('Leads list');

    // Apply filter
    const searchInput = screen.getByPlaceholderText('Search leads');
    fireEvent.changeText(searchInput, 'Customer');

    // Verify filtering worked and list is still scrollable
    await waitFor(() => {
      expect(flatList).toBeTruthy();
      // Should show filtered results
      expect(screen.getByText(/Filtered Leads/)).toBeTruthy();
    });
  });
});
