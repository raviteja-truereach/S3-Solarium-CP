/**
 * Lead Detail E2E Tests
 * End-to-end tests for airplane mode and offline functionality
 */
const { device, expect, element, by, waitFor } = require('detox');

describe('Lead Detail - Offline Mode', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Airplane Mode Scenarios', () => {
    it('should display offline chip when in airplane mode', async () => {
      // Navigate to login (assuming authentication flow)
      await element(by.id('login-phone-input')).typeText('9876543210');
      await element(by.id('login-submit-button')).tap();

      // Navigate to My Leads
      await element(by.id('tab-leads')).tap();
      await waitFor(element(by.id('leads-list')))
        .toBeVisible()
        .withTimeout(5000);

      // Enable airplane mode
      await device.setNetworkConnection('airplane');

      // Tap on first lead
      await element(by.id('lead-item-0')).tap();

      // Wait for lead detail screen
      await waitFor(element(by.id('lead-detail-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify offline chip is displayed
      await waitFor(element(by.text('Offline copy')))
        .toBeVisible()
        .withTimeout(3000);

      // Verify lead content is displayed from cache
      await expect(element(by.id('lead-info-tab'))).toBeVisible();

      // Verify data is loaded (check for customer name field)
      await expect(element(by.text('Customer Name'))).toBeVisible();
    });

    it('should load cached data within 800ms in airplane mode', async () => {
      // Navigate to leads list
      await element(by.id('tab-leads')).tap();
      await waitFor(element(by.id('leads-list')))
        .toBeVisible()
        .withTimeout(5000);

      // Enable airplane mode
      await device.setNetworkConnection('airplane');

      const startTime = Date.now();

      // Tap on lead
      await element(by.id('lead-item-0')).tap();

      // Wait for content to load
      await waitFor(element(by.text('Customer Name')))
        .toBeVisible()
        .withTimeout(1000);

      const loadTime = Date.now() - startTime;

      // Verify load time is under 800ms
      expect(loadTime).toBeLessThan(800);
    });

    it('should hide offline chip when back online', async () => {
      // Start in airplane mode
      await device.setNetworkConnection('airplane');

      // Navigate to lead detail
      await element(by.id('tab-leads')).tap();
      await element(by.id('lead-item-0')).tap();

      // Verify offline chip is shown
      await waitFor(element(by.text('Offline copy')))
        .toBeVisible()
        .withTimeout(3000);

      // Go back online
      await device.setNetworkConnection('wifi');

      // Wait for network reconnection
      await waitFor(element(by.text('Offline copy')))
        .not.toBeVisible()
        .withTimeout(5000);
    });

    it('should display error state when cache is empty in airplane mode', async () => {
      // Clear cache (this would need to be implemented based on your cache clearing mechanism)
      // await device.sendUserNotification({...}); // Or whatever method you use

      // Enable airplane mode
      await device.setNetworkConnection('airplane');

      // Try to navigate to a lead that's not in cache
      await element(by.id('tab-leads')).tap();
      await element(by.id('lead-item-0')).tap();

      // Should show error banner instead of offline chip
      await waitFor(element(by.text('Unable to load lead details')))
        .toBeVisible()
        .withTimeout(3000);

      // Offline chip should not be visible
      await expect(element(by.text('Offline copy'))).not.toBeVisible();

      // Retry button should be available
      await expect(element(by.text('Retry'))).toBeVisible();
    });
  });

  describe('Network State Transitions', () => {
    it('should handle network transitions gracefully', async () => {
      // Start online
      await device.setNetworkConnection('wifi');

      // Navigate to lead detail
      await element(by.id('tab-leads')).tap();
      await element(by.id('lead-item-0')).tap();

      // Should not show offline chip initially
      await expect(element(by.text('Offline copy'))).not.toBeVisible();

      // Go offline
      await device.setNetworkConnection('airplane');

      // Should show offline chip
      await waitFor(element(by.text('Offline copy')))
        .toBeVisible()
        .withTimeout(3000);

      // Go back online
      await device.setNetworkConnection('wifi');

      // Should hide offline chip
      await waitFor(element(by.text('Offline copy')))
        .not.toBeVisible()
        .withTimeout(5000);
    });
  });

  afterEach(async () => {
    // Reset network connection
    await device.setNetworkConnection('wifi');
  });
});
