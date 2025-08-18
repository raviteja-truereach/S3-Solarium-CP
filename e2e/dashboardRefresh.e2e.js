describe('Dashboard Refresh E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Dashboard Flow', () => {
    it('should display dashboard with KPI data', async () => {
      // Wait for app to load
      await waitFor(element(by.text('Dashboard')))
        .toBeVisible()
        .withTimeout(10000);

      // Verify KPI cards are visible
      await expect(element(by.text('Total Tasks'))).toBeVisible();
      await expect(element(by.text('Today Pending'))).toBeVisible();
      await expect(element(by.text('Overdue'))).toBeVisible();

      // Verify last sync indicator
      await expect(element(by.text(/Last sync:/))).toBeVisible();
    });

    it('should update KPI data after waiting 3 minutes', async () => {
      // Navigate to dashboard
      await element(by.text('Home')).tap();

      // Record initial values
      const initialTotal = await element(
        by.id('kpi-total-value')
      ).getAttributes();

      // Wait for auto-sync (3 minutes + buffer)
      await device.disableSynchronization();
      await new Promise((resolve) => setTimeout(resolve, 180000 + 30000)); // 3.5 minutes
      await device.enableSynchronization();

      // Check if values updated
      await waitFor(element(by.id('kpi-total-value')))
        .toHaveText(expect.not.stringMatching(initialTotal.text))
        .withTimeout(10000);
    });

    it('should show throttle toast when syncing twice within 30 seconds', async () => {
      // Navigate to dashboard
      await element(by.text('Home')).tap();

      // First sync via sync button
      await element(by.id('topbar-sync-button')).tap();

      // Wait for sync to complete
      await waitFor(element(by.text('Syncing...')))
        .not.toBeVisible()
        .withTimeout(10000);

      // Immediate second sync should show throttle toast
      await element(by.id('topbar-sync-button')).tap();

      // Verify throttle toast appears
      await expect(element(by.text('Sync Throttled'))).toBeVisible();
      await expect(
        element(by.text('Please wait before refreshing'))
      ).toBeVisible();
    });

    it('should perform full sync on long press after throttle period', async () => {
      // Navigate to dashboard
      await element(by.text('Home')).tap();

      // First sync
      await element(by.id('topbar-sync-button')).tap();

      // Wait for sync completion
      await waitFor(element(by.text('Syncing...')))
        .not.toBeVisible()
        .withTimeout(10000);

      // Wait for throttle period to expire (30+ seconds)
      await device.disableSynchronization();
      await new Promise((resolve) => setTimeout(resolve, 35000)); // 35 seconds
      await device.enableSynchronization();

      // Long press for full sync
      await element(by.id('topbar-sync-button')).longPress();

      // Should show full sync indicator
      await expect(element(by.text('Syncing...'))).toBeVisible();

      // Wait for completion
      await waitFor(element(by.text('Syncing...')))
        .not.toBeVisible()
        .withTimeout(15000);

      // Should show success toast
      await expect(element(by.text('Full Sync Complete'))).toBeVisible();
    });

    it('should handle offline state properly', async () => {
      // Navigate to dashboard
      await element(by.text('Home')).tap();

      // Simulate going offline
      await device.setNetworkSpeed('none');

      // Should show offline banner
      await expect(element(by.id('offline-banner'))).toBeVisible();
      await expect(element(by.text(/offline/i))).toBeVisible();

      // Should show cached labels on KPI cards
      await expect(element(by.text('cached'))).toBeVisible();

      // Sync button should be disabled
      const syncButton = element(by.id('topbar-sync-button'));
      await expect(syncButton).toHaveToggleValue(false); // disabled state

      // Restore network
      await device.setNetworkSpeed('full');

      // Offline banner should disappear
      await waitFor(element(by.id('offline-banner')))
        .not.toBeVisible()
        .withTimeout(5000);
    });

    it('should navigate to notifications from topbar', async () => {
      // Navigate to dashboard
      await element(by.text('Home')).tap();

      // Tap notifications button
      await element(by.id('topbar-notifications-button')).tap();

      // Should navigate to notifications screen
      await expect(element(by.text('Notifications'))).toBeVisible();
      await expect(element(by.text('No notifications yet'))).toBeVisible();

      // Should be able to go back
      await element(by.id('topbar-back-button')).tap();
      await expect(element(by.text('Dashboard'))).toBeVisible();
    });
  });

  describe('Accessibility E2E', () => {
    it('should support screen reader navigation', async () => {
      // Enable accessibility
      await device.enableAccessibility();

      // Navigate through dashboard elements
      await element(by.text('Dashboard')).tap();

      // Verify accessibility labels are present
      const syncButton = element(by.id('topbar-sync-button'));
      await expect(syncButton).toHaveLabel('Synchronise data');

      const notificationButton = element(by.id('topbar-notifications-button'));
      await expect(notificationButton).toHaveLabel(/Notifications/);

      // Disable accessibility
      await device.disableAccessibility();
    });

    it('should handle high contrast mode', async () => {
      // Enable high contrast
      await device.setAccessibilityOptions({ highContrast: true });

      // Navigate to dashboard
      await element(by.text('Home')).tap();

      // Verify elements are still visible and accessible
      await expect(element(by.text('Dashboard'))).toBeVisible();
      await expect(element(by.id('topbar-sync-button'))).toBeVisible();

      // Reset accessibility options
      await device.setAccessibilityOptions({ highContrast: false });
    });
  });

  describe('Performance E2E', () => {
    it('should load dashboard within acceptable time', async () => {
      const startTime = Date.now();

      // Navigate to dashboard
      await element(by.text('Home')).tap();

      // Wait for KPI data to load
      await waitFor(element(by.text('Total Tasks')))
        .toBeVisible()
        .withTimeout(5000);

      const endTime = Date.now();
      const loadTime = endTime - startTime;

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    it('should handle rapid navigation without crashes', async () => {
      // Rapidly navigate between screens
      for (let i = 0; i < 5; i++) {
        await element(by.text('Home')).tap();
        await element(by.text('Settings')).tap();
        await element(by.text('Home')).tap();
      }

      // Should still be functional
      await expect(element(by.text('Dashboard'))).toBeVisible();
    });
  });
});
