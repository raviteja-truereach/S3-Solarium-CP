import { AppState, AppStateStatus } from 'react-native';
import { getSyncScheduler } from '../sync/SyncScheduler';

export class AppStateManager {
  private currentState: AppStateStatus = AppState.currentState;
  private subscription: any = null;
  private syncScheduler = getSyncScheduler();

  constructor() {
    this.setupListener();
    console.log(
      '📱 AppStateManager initialized with state:',
      this.currentState
    );
  }

  private setupListener(): void {
    this.subscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    console.log(`📱 AppState changed: ${this.currentState} -> ${nextAppState}`);

    const previousState = this.currentState;
    this.currentState = nextAppState;

    // Handle sync scheduler based on app state
    if (nextAppState === 'active' && previousState !== 'active') {
      // App became active
      this.syncScheduler.start();
    } else if (nextAppState !== 'active' && previousState === 'active') {
      // App went to background
      this.syncScheduler.stop();
    }
  }

  getCurrentState(): AppStateStatus {
    return this.currentState;
  }

  isActive(): boolean {
    return this.currentState === 'active';
  }

  destroy(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}

let appStateManagerInstance: AppStateManager | null = null;

export const getAppStateManager = (): AppStateManager => {
  if (!appStateManagerInstance) {
    appStateManagerInstance = new AppStateManager();
  }
  return appStateManagerInstance;
};

export const destroyAppStateManager = (): void => {
  if (appStateManagerInstance) {
    appStateManagerInstance.destroy();
    appStateManagerInstance = null;
  }
};

export default AppStateManager;
