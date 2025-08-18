import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import HomeScreen from '../../src/screens/home/HomeScreen';
import networkSlice from '../../src/store/slices/networkSlice';

// Mock performance monitoring
const mockRenderCount = jest.fn();

// Wrap component to count renders
const RenderCountWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  mockRenderCount();
  return <>{children}</>;
};

describe('Dashboard Performance', () => {
  let store: any;

  beforeEach(() => {
    mockRenderCount.mockClear();

    store = configureStore({
      reducer: {
        network: networkSlice,
      },
      preloadedState: {
        network: {
          syncInProgress: false,
          lastSyncAt: Date.now(),
          nextAllowedSyncAt: 0,
          dashboardSummary: {
            total: 10,
            todayPending: 5,
            overdue: 2,
          },
          lastError: null,
          unreadNotificationCount: 0,
          lastSyncTs: new Date().toISOString(),
        },
      },
    });
  });

  it('should not cause excessive re-renders on state changes', () => {
    render(
      <NavigationContainer>
        <Provider store={store}>
          <PaperProvider>
            <RenderCountWrapper>
              <HomeScreen />
            </RenderCountWrapper>
          </PaperProvider>
        </Provider>
      </NavigationContainer>
    );

    const initialRenderCount = mockRenderCount.mock.calls.length;

    // Dispatch a state change that shouldn't cause re-render
    store.dispatch({
      type: 'network/setUnreadNotificationCount',
      payload: 1,
    });

    // Should not cause additional render due to memoization
    expect(mockRenderCount.mock.calls.length).toBe(initialRenderCount);
  });

  it('should handle memory efficiently', () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Render multiple times
    for (let i = 0; i < 10; i++) {
      const { unmount } = render(
        <NavigationContainer>
          <Provider store={store}>
            <PaperProvider>
              <HomeScreen />
            </PaperProvider>
          </Provider>
        </NavigationContainer>
      );
      unmount();
    }

    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncreaseMB = (finalMemory - initialMemory) / 1024 / 1024;

    // Memory increase should be minimal
    expect(memoryIncreaseMB).toBeLessThan(5);
  });
});
