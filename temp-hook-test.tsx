import React from 'react';
import { usePaginatedLeads } from './src/hooks/usePaginatedLeads';

// Test component to verify hook integration
export const TestPaginatedLeads: React.FC = () => {
  const { items, loadNext, refreshing, error, reload } = usePaginatedLeads();

  return (
    <div>
      <h3>Paginated Leads Test</h3>
      <p>Items: {items.length}</p>
      <p>Refreshing: {refreshing ? 'Yes' : 'No'}</p>
      <p>Error: {error || 'None'}</p>
      <button onClick={loadNext}>Load Next</button>
      <button onClick={reload}>Reload</button>
    </div>
  );
};
