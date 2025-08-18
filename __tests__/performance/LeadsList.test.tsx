/**
 * Leads List Performance Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { configureStore } from '@reduxjs/toolkit';
import MyLeadsScreen from '../../src/screens/leads/MyLeadsScreen';
import leadSlice from '../../src/store/slices/leadSlice';
import networkSlice from '../../src/store/slices/networkSlice';

describe('Leads List Performance', () => {
  it('handles large datasets efficiently', () => {
    const largeLeadSet = Array.from({ length: 1000 }, (_, index) => ({
      id: index + 1,
      name: `Lead ${index + 1}`,
      status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'synced',
      local_changes: '{}',
    }));

    const store = configureStore({
      reducer: {
        leads: leadSlice,
        network: networkSlice,
      },
      preloadedState: {
        leads: {
          items: largeLeadSet,
          lastSync: Date.now(),
          isLoading: false,
          error: null,
        },
        network: {
          syncInProgress: false,
          lastSyncAt: Date.now(),
          nextAllowedSyncAt: 0,
          dashboardSummary: null,
          lastError: null,
        },
      },
    });

    const startTime = performance.now();

    render(
      <Provider store={store}>
        <PaperProvider>
          <MyLeadsScreen navigation={{} as any} />
        </PaperProvider>
      </Provider>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within reasonable time (< 100ms)
    expect(renderTime).toBeLessThan(100);
  });
});
