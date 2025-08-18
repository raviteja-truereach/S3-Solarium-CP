/**
 * Lead Detail Offline E2E Tests
 * Comprehensive end-to-end testing for offline functionality
 */
const { device, expect, element, by, waitFor } = require('detox');

describe('Lead Detail Offline E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  afterEach(async () => {
    // Reset network state
    await device.setNetworkConnection('wifi');
  });

  describe('Online to Offline Transition', () => {
    it('should cache lead data when accessed online', async () => {
      // Login and navigate to leads
      await element(by.id('login-phone-input')).typeText('9876543210');
      await element(by.id('login-submit-button')).tap();

      // Navigate to leads list
      await element(by.id('tab-leads')).tap();
      await waitFor(element(by.id('leads-list')))
        .toBeVisible()
        .withTimeout(5000);

      // Tap on first lead (this should cache it)
      await element(by.id('lead-item-0')).tap();

      // Wait for lead detail to load
      await waitFor(element(by.id('lead-detail-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Verify lead data is displayed
      await expect(element(by.text('Customer Name'))).toBeVisible();
      await expect(element(by.id('offline-chip'))).not.toBeVisible();

      // Go back to leads list
      await element(by.id('back-button')).tap();
    });

    it('should show offline chip when accessing cached lead offline', async () => {
      // Continue from previous test - data should be cached

      // Enable airplane mode
      await device.setNetworkConnection('airplane');

      // Navigate to the same lead
      await element(by.id('lead-item-0')).tap();

      // Wait for lead detail to load
      await waitFor(element(by.id('lead-detail-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Verify offline chip is displayed
      await waitFor(element(by.id('offline-chip')))
        .toBeVisible()
        .withTimeout(2000);

      // Verify offline chip has correct text
      await expect(element(by.text('Offline copy'))).toBeVisible();

      // Verify lead data is still displayed
      await expect(element(by.text('Customer Name'))).toBeVisible();
    });

    it('should load offline data within 800ms', async () => {
      // Enable airplane mode
      await device.setNetworkConnection('airplane');

      // Navigate to leads list
      await element(by.id('tab-leads')).tap();
      await waitFor(element(by.id('leads-list')))
        .toBeVisible()
        .withTimeout(5000);

      const startTime = Date.now();

      // Tap on cached lead
      await element(by.id('lead-item-0')).tap();

      // Wait for customer name to appear (indicating data is loaded)
      await waitFor(element(by.text('Customer Name')))
        .toBeVisible()
        .withTimeout(1000);

      const loadTime = Date.now() - startTime;

      // Verify load time meets requirement
      expect(loadTime).toBeLessThan(800);
    });
  });

  describe('Error States E2E', () => {
    it('should show error banner for cache miss', async () => {
      // Enable airplane mode
      await device.setNetworkConnection('airplane');

      // Clear app data to simulate cache miss
      await device.clearKeychain();

      // Navigate to leads and try to access a lead
      await element(by.id('tab-leads')).tap();
      await element(by.id('lead-item-0')).tap();

      // Should show error banner
      await waitFor(element(by.text('Unable to load lead details')))
        .toBeVisible()
        .withTimeout(3000);

      // Should show retry button
      await expect(element(by.text('Retry'))).toBeVisible();

      // Should not show offline chip
      await expect(element(by.id('offline-chip'))).not.toBeVisible();
    });

    it('should retry successfully when connection restored', async () => {
      // Start with error state (airplane mode + no cache)
      await device.setNetworkConnection('airplane');
      await device.clearKeychain();

      // Navigate to lead detail
      await element(by.id('tab-leads')).tap();
      await element(by.id('lead-item-0')).tap();

      // Verify error state
      await waitFor(element(by.text('Unable to load lead details')))
        .toBeVisible()
        .withTimeout(3000);

      // Restore connection
      await device.setNetworkConnection('wifi');

      // Tap retry button
      await element(by.text('Retry')).tap();

      // Should load successfully
      await waitFor(element(by.text('Customer Name')))
        .toBeVisible()
        .withTimeout(5000);

      // Should not show offline chip (API data)
      await expect(element(by.id('offline-chip'))).not.toBeVisible();
    });
  });

  describe('Tab Navigation E2E', () => {
    it('should handle tab switching in offline mode', async () => {
      // Setup: cache data online first
      await element(by.id('tab-leads')).tap();
      await element(by.id('lead-item-0')).tap();
      await waitFor(element(by.id('lead-detail-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Go offline
      await device.setNetworkConnection('airplane');

      // Test tab switching
      await element(by.text('Documents')).tap();
      await waitFor(element(by.text('Coming in Sprint-4')))
        .toBeVisible()
        .withTimeout(2000);

      await element(by.text('Timeline')).tap();
      await waitFor(element(by.text('Timeline')))
        .toBeVisible()
        .withTimeout(2000);

      // Return to Info tab
      await element(by.text('Info')).tap();
      await waitFor(element(by.text('Customer Name')))
        .toBeVisible()
        .withTimeout(2000);

      // Should still show offline chip
      await expect(element(by.id('offline-chip'))).toBeVisible();
    });

    it('should show toast for disabled quotations tab', async () => {
      // Navigate to lead detail
      await element(by.id('tab-leads')).tap();
      await element(by.id('lead-item-0')).tap();

      // Tap disabled quotations tab
      await element(by.text('Quotations')).tap();

      // Should show toast (platform-specific)
      if (device.getPlatform() === 'ios') {
        await waitFor(element(by.text('Coming soon')))
          .toBeVisible()
          .withTimeout(2000);
      } else {
        // Android toast verification (if supported by Detox)
        await waitFor(element(by.text('Coming soon')))
          .toBeVisible()
          .withTimeout(2000);
      }
    });
  });

  describe('Performance E2E', () => {
    it('should handle rapid network state changes', async () => {
      // Navigate to lead detail
      await element(by.id('tab-leads')).tap();
      await element(by.id('lead-item-0')).tap();

      // Rapid network state changes
      for (let i = 0; i < 3; i++) {
        await device.setNetworkConnection('airplane');
        await waitFor(element(by.id('offline-chip')))
          .toBeVisible()
          .withTimeout(3000);

        await device.setNetworkConnection('wifi');
        await waitFor(element(by.id('offline-chip')))
          .not.toBeVisible()
          .withTimeout(3000);
      }

      // App should remain stable
      await expect(element(by.text('Customer Name'))).toBeVisible();
    });

    it('should maintain scrolling performance with data', async () => {
      // Navigate to lead detail
      await element(by.id('tab-leads')).tap();
      await element(by.id('lead-item-0')).tap();

      // Test scrolling performance
      await element(by.id('lead-info-tab')).scroll(200, 'down');
      await element(by.id('lead-info-tab')).scroll(200, 'up');

      // Should remain responsive
      await expect(element(by.text('Customer Name'))).toBeVisible();
    });
  });

  describe('Accessibility E2E', () => {
    it('should be navigable with accessibility features', async () => {
      // Enable accessibility features
      await device.enableAccessibility();

      // Navigate to lead detail
      await element(by.id('tab-leads')).tap();
      await element(by.id('lead-item-0')).tap();

      // Test accessibility navigation
      await element(by.text('Customer Name')).tap();
      await element(by.text('Phone')).tap();

      // Test tab accessibility
      await element(by.text('Documents')).tap();
      await element(by.text('Timeline')).tap();

      await device.disableAccessibility();
    });
  });
});
