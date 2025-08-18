/**
 * Lead Detail Performance Tests
 * Performance testing using PerformanceMonitor utility
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { store } from '@store/store';
import LeadDetailScreen from '@screens/leads/LeadDetailScreen';
import { PerformanceMonitor } from '@utils/PerformanceMonitor';

// Mock the useLeadById hook
const mockUseLeadById = jest.fn();
jest.mock('@hooks/useLeadById', () => ({
  useLeadById: () => mockUseLeadById(),
}));

const mockLead = {
  id: 'LEAD-123',
  customerName: 'John Doe',
  phone: '+1234567890',
  status: 'Hot Lead',
  nextFollowUpDate: '2024-01-28T10:00:00Z',
};

const mockRoute = { params: { leadId: 'LEAD-123' } };
const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      <PaperProvider>
        <NavigationContainer>{component}</NavigationContainer>
      </PaperProvider>
    </Provider>
  );
};

describe('Lead Detail Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLeadById.mockReturnValue({
      lead: mockLead,
      loading: false,
      error: null,
      source: 'api',
      onRetry: jest.fn(),
    });
  });

  describe('Render Performance', () => {
    it('should render within 100ms target', async () => {
      const monitor = new PerformanceMonitor();

      monitor.start('lead-detail-render');

      renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      const metrics = monitor.stop('lead-detail-render');

      expect(metrics.duration).toBeLessThan(100);
    });

    it('should maintain FPS > 55 during tab switching', async () => {
      const monitor = new PerformanceMonitor();

      const { getByText } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      monitor.startFPSMonitoring();

      // Simulate rapid tab switching
      const tabs = ['Documents', 'Timeline', 'Info'];
      for (const tab of tabs) {
        const tabElement = getByText(tab);
        if (tabElement) {
          // Simulate multiple rapid taps
          for (let i = 0; i < 5; i++) {
            tabElement.props.onPress?.();
          }
        }
      }

      const fpsMetrics = monitor.stopFPSMonitoring();

      expect(fpsMetrics.averageFPS).toBeGreaterThan(55);
    });
  });

  describe('Memory Performance', () => {
    it('should not leak memory during component lifecycle', () => {
      const monitor = new PerformanceMonitor();

      const initialMemory = monitor.getMemoryUsage();

      // Render and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderWithProviders(
          <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
        );
        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = monitor.getMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (< 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe('Data Loading Performance', () => {
    it('should handle large lead data efficiently', async () => {
      const largeLead = {
        ...mockLead,
        // Simulate large data
        address: 'Very long address '.repeat(100),
        remarks: 'Very long remarks '.repeat(100),
        documents: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Doc ${i}`,
        })),
      };

      mockUseLeadById.mockReturnValue({
        lead: largeLead,
        loading: false,
        error: null,
        source: 'api',
        onRetry: jest.fn(),
      });

      const monitor = new PerformanceMonitor();

      monitor.start('large-data-render');

      renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      const metrics = monitor.stop('large-data-render');

      // Should still render within target even with large data
      expect(metrics.duration).toBeLessThan(200);
    });
  });

  describe('State Change Performance', () => {
    it('should handle rapid state changes efficiently', async () => {
      const monitor = new PerformanceMonitor();

      const { rerender } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      monitor.start('state-changes');

      // Simulate rapid state changes
      const states = [
        { loading: true, lead: null, error: null },
        { loading: false, lead: mockLead, error: null },
        { loading: false, lead: null, error: new Error('Test error') },
        { loading: false, lead: mockLead, error: null },
      ];

      for (const state of states) {
        mockUseLeadById.mockReturnValue({
          ...state,
          source: 'api',
          onRetry: jest.fn(),
        });

        rerender(
          <Provider store={store}>
            <PaperProvider>
              <NavigationContainer>
                <LeadDetailScreen
                  route={mockRoute}
                  navigation={mockNavigation}
                />
              </NavigationContainer>
            </PaperProvider>
          </Provider>
        );
      }

      const metrics = monitor.stop('state-changes');

      // Should handle state changes efficiently
      expect(metrics.duration).toBeLessThan(100);
    });
  });

  describe('Network State Performance', () => {
    it('should handle online/offline transitions efficiently', async () => {
      const monitor = new PerformanceMonitor();

      const { rerender } = renderWithProviders(
        <LeadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      monitor.start('network-transitions');

      // Simulate network state changes
      const networkStates = [
        { source: 'api', offline: false },
        { source: 'cache', offline: true },
        { source: 'api', offline: false },
      ];

      for (const state of networkStates) {
        mockUseLeadById.mockReturnValue({
          lead: mockLead,
          loading: false,
          error: null,
          source: state.source,
          onRetry: jest.fn(),
        });

        rerender(
          <Provider store={store}>
            <PaperProvider>
              <NavigationContainer>
                <LeadDetailScreen
                  route={mockRoute}
                  navigation={mockNavigation}
                />
              </NavigationContainer>
            </PaperProvider>
          </Provider>
        );
      }

      const metrics = monitor.stop('network-transitions');

      // Should handle network transitions efficiently
      expect(metrics.duration).toBeLessThan(150);
    });
  });
});
