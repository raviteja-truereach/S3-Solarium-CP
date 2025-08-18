/**
 * Badge Service
 * Centralized service for managing tab bar badges
 */

import { NavigationContainerRef } from '@react-navigation/native';

class BadgeService {
  private navigationRef: NavigationContainerRef<any> | null = null;
  private currentBadgeCount: number = 0;

  /**
   * Initialize with navigation reference
   */
  setNavigationRef(ref: NavigationContainerRef<any> | null) {
    this.navigationRef = ref;
    console.log('🏷️ Badge service initialized with navigation ref');
  }

  /**
   * Update Home tab badge
   */
  updateHomeBadge(count: number) {
    if (!this.navigationRef?.isReady()) {
      console.warn('⚠️ Navigation not ready, skipping badge update');
      return;
    }

    try {
      const badgeValue = count > 0 ? count : undefined;

      // Get the current route state
      const state = this.navigationRef.getRootState();
      const tabState = state?.routes?.find(
        (route) => route.name === 'MainTabs'
      )?.state;

      if (tabState) {
        // Find Home tab index
        const homeTabIndex = tabState.routes?.findIndex(
          (route) => route.name === 'Home'
        );

        if (homeTabIndex !== -1) {
          // Update the specific tab's badge
          this.navigationRef.dispatch({
            type: 'SET_PARAMS',
            payload: {
              params: { tabBarBadge: badgeValue },
            },
            source: tabState.routes[homeTabIndex]?.key,
          });

          console.log(`🏷️ Home tab badge updated: ${badgeValue || 'hidden'}`);
          this.currentBadgeCount = count;
        }
      }
    } catch (error) {
      console.error('❌ Failed to update Home tab badge:', error);
    }
  }

  /**
   * Get current badge count
   */
  getCurrentBadgeCount(): number {
    return this.currentBadgeCount;
  }

  /**
   * Clear all badges
   */
  clearAllBadges() {
    this.updateHomeBadge(0);
  }
}

export const badgeService = new BadgeService();
export default badgeService;
