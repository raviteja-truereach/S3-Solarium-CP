describe('Notifications Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should open notifications screen from topbar', async () => {
    // Navigate to home screen
    await element(by.text('Home')).tap();

    // Tap notifications button in topbar
    await element(by.id('topbar-notifications-button')).tap();

    // Verify notifications screen opened
    await expect(element(by.text('Notifications'))).toBeVisible();
    await expect(element(by.text('No notifications yet'))).toBeVisible();
  });

  it('should show notification badge when unread count > 0', async () => {
    // Assuming there are unread notifications in the state
    await element(by.text('Home')).tap();

    // Check if badge is visible
    await expect(element(by.id('topbar-notification-badge'))).toBeVisible();
  });

  it('should handle sync button interactions', async () => {
    await element(by.text('Home')).tap();

    // Test sync button press
    await element(by.id('topbar-sync-button')).tap();

    // Test sync button long press
    await element(by.id('topbar-sync-button')).longPress();
  });
});
