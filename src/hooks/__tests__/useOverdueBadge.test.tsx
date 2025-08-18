import { renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import useOverdueBadge from '../useOverdueBadge';
import leadSlice from '../../store/slices/leadSlice';
import { Lead } from '../../database/models/Lead';

// Mock navigation
const mockSetOptions = jest.fn();
const mockGetParent = jest.fn(() => ({
  setOptions: mockSetOptions,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    setOptions: mockSetOptions,
    getParent: mockGetParent,
  }),
}));

// Mock store setup
const createMockStore = (leads: Lead[] = []) => {
  return configureStore({
    reducer: {
      lead: leadSlice,
    },
    preloadedState: {
      lead: {
        items: leads.reduce((acc, lead) => {
          acc[lead.id] = lead;
          return acc;
        }, {} as Record<string, Lead>),
        pagesLoaded: [1],
        totalPages: 1,
        totalCount: leads.length,
        loadingNext: false,
        hasMore: false,
        lastSync: Date.now(),
        isLoading: false,
        error: null,
        searchText: '',
        filters: { statuses: [], dateRange: undefined },
      },
    },
  });
};

// Test wrapper
const createWrapper =
  (store: any) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <Provider store={store}>
        <NavigationContainer>{children}</NavigationContainer>
      </Provider>
    );

describe('useOverdueBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not show badge when no overdue leads', () => {
    const leads: Lead[] = [
      {
        id: '1',
        customerName: 'John Doe',
        status: 'New Lead',
        follow_up_date: new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString(), // Tomorrow
      } as Lead,
    ];

    const store = createMockStore(leads);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useOverdueBadge(), { wrapper });

    expect(result.current.overdueCount).toBe(0);
    expect(result.current.isVisible).toBe(false);
  });

  it('should show badge when there are overdue leads', async () => {
    const leads: Lead[] = [
      {
        id: '1',
        customerName: 'John Doe',
        status: 'New Lead',
        follow_up_date: new Date(
          Date.now() - 24 * 60 * 60 * 1000
        ).toISOString(), // Yesterday
      } as Lead,
      {
        id: '2',
        customerName: 'Jane Smith',
        status: 'In Discussion',
        follow_up_date: new Date(
          Date.now() - 48 * 60 * 60 * 1000
        ).toISOString(), // 2 days ago
      } as Lead,
    ];

    const store = createMockStore(leads);
    const wrapper = createWrapper(store);

    const { result, waitForNextUpdate } = renderHook(() => useOverdueBadge(), {
      wrapper,
    });

    // Wait for the hook to process
    await waitForNextUpdate();

    expect(result.current.overdueCount).toBe(2);
    expect(result.current.isVisible).toBe(true);
  });

  it('should update navigation options with badge', async () => {
    const leads: Lead[] = [
      {
        id: '1',
        customerName: 'Overdue Lead',
        status: 'New Lead',
        follow_up_date: new Date(
          Date.now() - 24 * 60 * 60 * 1000
        ).toISOString(),
      } as Lead,
    ];

    const store = createMockStore(leads);
    const wrapper = createWrapper(store);

    renderHook(() => useOverdueBadge(), { wrapper });

    // Wait for debounced update
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(mockSetOptions).toHaveBeenCalledWith({
      tabBarBadge: 1,
    });
  });

  it('should handle rapid updates with debouncing', async () => {
    const store = createMockStore([]);
    const wrapper = createWrapper(store);

    renderHook(() => useOverdueBadge(), { wrapper });

    // Multiple rapid updates should be debounced
    store.dispatch({ type: 'test/updateCount' });
    store.dispatch({ type: 'test/updateCount' });
    store.dispatch({ type: 'test/updateCount' });

    // Wait for debounce period
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Should only call setOptions once due to debouncing
    expect(mockSetOptions).toHaveBeenCalledTimes(1);
  });

  it('should cleanup timeouts on unmount', () => {
    const store = createMockStore([]);
    const wrapper = createWrapper(store);

    const { unmount } = renderHook(() => useOverdueBadge(), { wrapper });

    // Spy on clearTimeout
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    unmount();

    // Should cleanup timeouts
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });
});
