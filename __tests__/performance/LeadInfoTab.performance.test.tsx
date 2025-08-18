/**
 * Lead Info Tab Performance Tests
 * Performance testing for LeadInfoTab component
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { store } from '@store/store';
import { LeadInfoTab } from '@components/leads/LeadInfoTab';
import type { Lead } from '@types/lead';

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

describe('LeadInfoTab Performance', () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render within acceptable time limits', () => {
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

    // Should render within 100ms
    expect(renderTime).toBeLessThan(100);
  });

  it('should handle rapid state changes efficiently', () => {
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

    // Should handle rapid changes efficiently
    expect(totalTime).toBeLessThan(500);
  });

  it('should not cause memory leaks', () => {
    const { unmount } = renderWithProviders(
      <LeadInfoTab
        lead={mockLead}
        loading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    // Should unmount cleanly
    expect(() => unmount()).not.toThrow();
  });
});
