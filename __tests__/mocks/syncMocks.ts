/**
 * Mock Helpers for Sync Tests
 */

export const createMockNetInfo = (isOnline: boolean = true) => ({
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: isOnline,
      isInternetReachable: isOnline,
      type: isOnline ? 'wifi' : 'none',
    })
  ),
});

export const createMockFetch = () => {
  const mockFetch = jest.fn();
  global.fetch = mockFetch;
  return mockFetch;
};

export const createMockStore = (token: string = 'valid_token') => ({
  store: {
    getState: () => ({
      auth: { token },
      leads: { items: [], lastSync: null },
      customers: { items: [], lastSync: null },
    }),
    dispatch: jest.fn(),
  },
});

export const mockApiResponses = {
  leads: [
    {
      id: '1',
      status: 'new',
      priority: 'high',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      sync_status: 'synced',
      local_changes: '{}',
    },
  ],
  customers: [
    {
      id: 'cust1',
      name: 'Test Customer',
      phone: '+1234567890',
      kyc_status: 'pending',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      sync_status: 'synced',
      local_changes: '{}',
    },
  ],
  quotations: [],
};

export const setupSuccessfulSync = (
  mockFetch: jest.MockedFunction<typeof fetch>
) => {
  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ success: true, data: mockApiResponses.leads }),
    } as Response)
    .mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ success: true, data: mockApiResponses.customers }),
    } as Response)
    .mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ success: true, data: mockApiResponses.quotations }),
    } as Response);
};

export const setup401Error = (mockFetch: jest.MockedFunction<typeof fetch>) => {
  mockFetch.mockResolvedValue({
    ok: false,
    status: 401,
    statusText: 'Unauthorized',
  } as Response);
};

export const setup5xxError = (
  mockFetch: jest.MockedFunction<typeof fetch>,
  succeedOnAttempt?: number
) => {
  let callCount = 0;
  mockFetch.mockImplementation(() => {
    callCount++;
    if (succeedOnAttempt && callCount >= succeedOnAttempt) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      } as Response);
    }
    return Promise.resolve({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);
  });
};
