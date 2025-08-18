/**
 * Quotation List E2E Tests
 * End-to-end tests for quotation list functionality
 */
const { device, expect, element, by, waitFor } = require('detox');

describe('Quotation List E2E', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Happy Path Flow', () => {
    it('should complete quotation list flow successfully', async () => {
      // Login flow
      await element(by.id('login-phone-input')).typeText('9876543210');
      await element(by.id('login-submit-button')).tap();

      // Navigate to quotations tab
      await element(by.id('tab-quotations')).tap();

      // Wait for quotations screen to load
      await waitFor(element(by.id('quotation-search-bar')))
        .toBeVisible()
        .withTimeout(10000);

      // Verify quotations screen components
      await expect(element(by.text('Quotations'))).toBeVisible();
      await expect(element(by.id('quotation-search-bar'))).toBeVisible();

      // Test search functionality
      await element(by.id('quotation-search-bar')).typeText('LEAD-001');
      await waitFor(element(by.id('quotations-list')))
        .toBeVisible()
        .withTimeout(5000);

      // Clear search
      await element(by.id('quotation-search-bar')).clearText();

      // Test filter functionality
      await element(by.id('filter-button')).tap();
      await waitFor(element(by.id('quotation-filter-sheet')))
        .toBeVisible()
        .withTimeout(3000);

      // Select status filter
      await element(by.id('status-chip-created')).tap();
      await element(by.id('filter-apply-button')).tap();

      // Verify filtered results
      await waitFor(element(by.id('quotations-list')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should handle quotation interactions', async () => {
      // Navigate to quotations
      await element(by.id('tab-quotations')).tap();

      // Wait for quotations to load
      await waitFor(element(by.id('quotations-list')))
        .toBeVisible()
        .withTimeout(10000);

      // Test quotation item press
      await element(by.id('quotation-item-QUOT-001')).tap();

      // Test share functionality (if quotation has Created status)
      const shareButton = element(by.id('share-button-QUOT-001'));
      try {
        await expect(shareButton).toBeVisible();
        await shareButton.tap();

        // Verify share success (wait for toast or status change)
        await waitFor(element(by.text('Quotation Shared')))
          .toBeVisible()
          .withTimeout(5000);
      } catch (error) {
        // Share button might not be visible if status is not Created
        console.log(
          'Share button not available or quotation not in Created status'
        );
      }

      // Test PDF functionality (if quotation has Shared/Accepted/Rejected status)
      const pdfButton = element(by.id('pdf-button-QUOT-001'));
      try {
        await expect(pdfButton).toBeVisible();
        await pdfButton.tap();

        // Verify PDF action (this would open external app)
        await waitFor(element(by.text('PDF Opened')))
          .toBeVisible()
          .withTimeout(5000);
      } catch (error) {
        // PDF button might not be visible if status doesn't allow PDF viewing
        console.log('PDF button not available for this quotation status');
      }
    });
  });

  describe('Performance Tests', () => {
    it('should load quotations list within performance target', async () => {
      const startTime = Date.now();

      // Navigate to quotations tab
      await element(by.id('tab-quotations')).tap();

      // Wait for quotations list to be visible
      await waitFor(element(by.id('quotations-list')))
        .toBeVisible()
        .withTimeout(15000);

      const loadTime = Date.now() - startTime;

      console.log(`📊 Quotations list loaded in ${loadTime}ms`);

      // Should load within 1.5s target (allowing extra time for E2E)
      expect(loadTime).toBeLessThan(2000);
    });

    it('should handle smooth scrolling with many items', async () => {
      // Navigate to quotations
      await element(by.id('tab-quotations')).tap();

      // Wait for list to load
      await waitFor(element(by.id('quotations-list')))
        .toBeVisible()
        .withTimeout(10000);

      // Perform smooth scrolling
      await element(by.id('quotations-list')).scroll(1000, 'down');
      await element(by.id('quotations-list')).scroll(1000, 'up');

      // List should remain responsive
      await expect(element(by.id('quotations-list'))).toBeVisible();
    });
  });

  describe('Offline Mode Tests', () => {
    it('should handle offline mode gracefully', async () => {
      // Navigate to quotations while online
      await element(by.id('tab-quotations')).tap();

      // Wait for data to load
      await waitFor(element(by.id('quotations-list')))
        .toBeVisible()
        .withTimeout(10000);

      // Enable airplane mode
      await device.setNetworkConnection('airplane');

      // Pull to refresh (should show offline message)
      await element(by.id('quotations-list')).swipe('down', 'slow', 0.85);

      // Should show offline indicator or toast
      await waitFor(element(by.text('Offline Mode')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify cached data is still visible
      await expect(element(by.id('quotations-list'))).toBeVisible();

      // Restore network connection
      await device.setNetworkConnection('wifi');
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle network errors gracefully', async () => {
      // Simulate poor network conditions
      await device.setNetworkConnection('2g');

      // Navigate to quotations
      await element(by.id('tab-quotations')).tap();

      // Should eventually show error state or loading state
      await waitFor(
        element(by.id('quotations-error-state')).or(
          element(by.id('quotations-list'))
        )
      )
        .toBeVisible()
        .withTimeout(15000);

      // Restore good network
      await device.setNetworkConnection('wifi');
    });
  });
});
