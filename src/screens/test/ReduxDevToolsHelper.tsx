/**
 * Redux DevTools Helper
 * Utility to verify Redux state changes during sync
 */
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import React from 'react';

export const ReduxStateMonitor: React.FC<{
  onStateChange?: (state: any) => void;
}> = ({ onStateChange }) => {
  const leadsState = useSelector((state: RootState) => state.leads);
  const customersState = useSelector((state: RootState) => state.customers);

  React.useEffect(() => {
    const currentState = {
      leads: {
        count: leadsState?.items?.length || 0,
        lastSync: leadsState?.lastSync,
        isLoading: leadsState?.isLoading,
      },
      customers: {
        count: customersState?.items?.length || 0,
        lastSync: customersState?.lastSync,
        isLoading: customersState?.isLoading,
      },
    };

    console.log('Redux State Monitor - Current state:', currentState);
    onStateChange?.(currentState);
  }, [leadsState, customersState, onStateChange]);

  return null; // This is a monitoring component, no UI
};
