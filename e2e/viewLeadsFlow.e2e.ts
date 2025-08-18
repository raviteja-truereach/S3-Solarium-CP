/**
 * View Leads Flow E2E Test
 * Tests navigation from Dashboard to MyLeads and back
 */

import { device, expect, element, by } from 'detox';

describe('View Leads Flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  describe('Navigation Flow', () => {
    it('should navigate from Dashboard to My Leads', async () => {
      // Wait for app to load
      await expect(element(by.testID('home-screen'))).toBeVisible();

      // Tap "View Leads" button
      await expect(element(by.testID('view-leads-button'))).toBeVisible();
      await element(by.testID('view-leads-button')).tap();

      // Should navigate to My Leads screen
      await expect(element(by.testID('leads-flatlist'))).toBeVisible();

      // Verify we're on the leads screen
      await expect(element(by.text('My Leads'))).toBeVisible();
    });

    it('should return to Dashboard on hardware back', async () => {
      // Navigate to leads first
      await expect(element(by.testID('home-screen'))).toBeVisible();
      await element(by.testID('view-leads-button')).tap();
      await expect(element(by.testID('leads-flatlist'))).toBeVisible();

      // Use hardware back
      await device.pressBack();

      // Should return to Dashboard
      await expect(element(by.testID('home-screen'))).toBeVisible();
      await expect(element(by.text('Dashboard'))).toBeVisible();
    });

    it('should handle navigation when app is offline', async () => {
      // Simulate offline mode
      await device.setNetworkConnection({
        airplane: true,
        wifi: false,
        cellular: false,
      });

      // Wait for app to detect offline state
      await device.reloadReactNative();
      await expect(element(by.testID('home-screen'))).toBeVisible();

      // Try to navigate to leads (should work with cached data)
      await element(by.testID('view-leads-button')).tap();

      // Should still navigate successfully
      await expect(element(by.testID('leads-flatlist'))).toBeVisible();

      // Restore network
      await device.setNetworkConnection({
        airplane: false,
        wifi: true,
        cellular: true,
      });
    });

    it('should show FAB on My Leads screen', async () => {
      // Navigate to leads
      await expect(element(by.testID('home-screen'))).toBeVisible();
      await element(by.testID('view-leads-button')).tap();
      await expect(element(by.testID('leads-flatlist'))).toBeVisible();

      // FAB should be visible
      await expect(element(by.testID('add-lead-fab'))).toBeVisible();

      // FAB should be disabled (accessibility label should indicate this)
      const fab = element(by.testID('add-lead-fab'));
      await expect(fab).toHaveAccessibilityLabel('Add Lead – disabled');
    });

    it('should handle cold start navigation', async () => {
      // Terminate and relaunch app
      await device.terminateApp();
      await device.launchApp({ newInstance: true });

      // Wait for app to fully load
      await expect(element(by.testID('home-screen'))).toBeVisible();

      // Navigation should work immediately after cold start
      await element(by.testID('view-leads-button')).tap();
      await expect(element(by.testID('leads-flatlist'))).toBeVisible();
    });
  });

  describe('Tab Navigation', () => {
    it('should maintain Home tab state when switching tabs', async () => {
      // Start on Home tab
      await expect(element(by.testID('home-screen'))).toBeVisible();

      // Switch to another tab
      await element(by.testID('customers-tab')).tap();
      await expect(
        element(by.testID('customers-tab'))
      ).toHaveAccessibilityState({ selected: true });

      // Return to Home tab
      await element(by.testID('home-tab')).tap();
      await expect(element(by.testID('home-screen'))).toBeVisible();

      // Home tab should be selected
      await expect(element(by.testID('home-tab'))).toHaveAccessibilityState({
        selected: true,
      });
    });

    it('should handle deep navigation within Home stack', async () => {
      // Navigate to leads from Dashboard
      await element(by.testID('view-leads-button')).tap();
      await expect(element(by.testID('leads-flatlist'))).toBeVisible();

      // Switch to another tab
      await element(by.testID('profile-tab')).tap();

      // Return to Home tab - should show leads screen (preserved state)
      await element(by.testID('home-tab')).tap();
      await expect(element(by.testID('leads-flatlist'))).toBeVisible();
    });
  });
});
