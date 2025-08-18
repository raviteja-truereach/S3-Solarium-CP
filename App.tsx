import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import Toast from 'react-native-toast-message';
import { NavigationProvider } from './src/navigation/NavigationProvider';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { PersistGateProvider } from './src/store/PersistGateProvider';
import { ConnectivityProvider } from './src/contexts/ConnectivityContext';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import { store } from './src/store/store';
import { DatabaseProvider } from './src/database/DatabaseProvider';
import { AppInitializer } from './src/components/common/AppInitializer';
import {
  startSyncScheduler,
  destroySyncScheduler,
} from './src/sync/SyncScheduler';
import {
  getAppStateManager,
  destroyAppStateManager,
} from './src/utils/AppStateManager';
import { toastConfig } from './src/components/common/ToastConfig';

function App(): React.JSX.Element {
  useEffect(() => {
    // Initialize sync scheduler and app state manager
    const appStateManager = getAppStateManager();
    startSyncScheduler();

    return () => {
      // Cleanup on app unmount
      destroySyncScheduler();
      destroyAppStateManager();
    };
  }, []);

  return (
    <Provider store={store}>
      <PersistGateProvider>
        <ConnectivityProvider>
          {/* <DatabaseProvider> */}
            <ErrorBoundary>
              <AppInitializer>
                <ThemeProvider>
                  <NavigationProvider />
                </ThemeProvider>
              </AppInitializer>
            </ErrorBoundary>
          {/* </DatabaseProvider> */}
        </ConnectivityProvider>
      </PersistGateProvider>
      <Toast config={toastConfig} />
    </Provider>
  );
}

export default App;
