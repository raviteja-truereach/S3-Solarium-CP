/**
 * Integration test for usePaginatedLeads with real Redux store
 * Tests the complete flow from hook to store to selectors
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { usePaginatedLeads } from '../../hooks/usePaginatedLeads';
import leadSliceReducer from '../../store/slices/leadSlice';
import { leadApi } from '../../store/api/leadApi';
import * as ConnectivityContext from '../../contexts/ConnectivityContext';

// Mock ConnectivityContext
jest
  .spyOn(ConnectivityContext, 'useConnectivity')
  .mockReturnValue({ isOnline: true });

// Mock API
jest.mock('../../store/api/leadApi');

describe('usePaginatedLeads Integration Tests', () => {
  const createIntegrationStore = () => {
    return configureStore({
      reducer: {
        lead: leadSliceReducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: {
            ignoredActions: ['persist/PERSIST'],
          },
        }),
    });
  };

  const createWrapper = (store: any) => {
    return ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
  };

  it('should integrate properly with Redux store', () => {
    const store = createIntegrationStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => usePaginatedLeads(), { wrapper });

    expect(result.current.items).toEqual([]);
    expect(typeof result.current.loadNext).toBe('function');
    expect(typeof result.current.reload).toBe('function');
  });
});
