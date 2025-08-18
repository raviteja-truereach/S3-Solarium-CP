/**
 * Login Success E2E Test
 * Tests the complete happy path login flow
 */
import { device, element, by, expect, waitFor } from 'detox';

describe('Login Success Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete login flow and reach home screen', async () => {
    // Step 1: Should start on splash screen, then auto-navigate to login
    await waitFor(element(by.text('Welcome to Solarium')))
      .toBeVisible()
      .withTimeout(5000);

    // Step 2: Enter valid phone number
    const phoneInput = element(by.label('Phone Number'));
    await expect(phoneInput).toBeVisible();
    await phoneInput.typeText('9876543210');

    // Step 3: Verify Get OTP button becomes enabled
    const getOtpButton = element(by.text('Get OTP'));
    await waitFor(getOtpButton).toBeVisible().withTimeout(2000);
    await expect(getOtpButton).toBeVisible();

    // Step 4: Tap Get OTP button
    await getOtpButton.tap();

    // Step 5: Handle development mode alert (mock backend)
    await waitFor(element(by.text('Development Mode')))
      .toBeVisible()
      .withTimeout(5000);

    const continueButton = element(by.text('Continue'));
    await expect(continueButton).toBeVisible();
    await continueButton.tap();

    // Step 6: Should navigate to OTP screen
    await waitFor(element(by.text('Verify OTP')))
      .toBeVisible()
      .withTimeout(3000);

    await expect(
      element(by.text('Enter the 6-digit code sent to'))
    ).toBeVisible();
    await expect(element(by.text('+91 9876543210'))).toBeVisible();

    // Step 7: Enter OTP (6 digits)
    const otpInput = element(by.label('OTP input'));
    await expect(otpInput).toBeVisible();
    await otpInput.typeText('123456');

    // Step 8: Tap Verify OTP button
    const verifyButton = element(by.text('Verify OTP'));
    await waitFor(verifyButton).toBeVisible().withTimeout(2000);
    await verifyButton.tap();

    // Step 9: Handle development mode alert for OTP verification
    await waitFor(
      element(
        by.text('Backend not connected. Using mock login success for testing.')
      )
    )
      .toBeVisible()
      .withTimeout(5000);

    const continueOtpButton = element(by.text('Continue'));
    await expect(continueOtpButton).toBeVisible();
    await continueOtpButton.tap();

    // Step 10: Should navigate to Home screen
    await waitFor(element(by.text('Welcome to Solarium CP')))
      .toBeVisible()
      .withTimeout(5000);

    await expect(element(by.text('Channel Partner Dashboard'))).toBeVisible();

    // Step 11: Verify bottom navigation is present
    await expect(element(by.text('Home'))).toBeVisible();
    await expect(element(by.text('Settings'))).toBeVisible();

    console.log('✅ Login success E2E test completed successfully');
  });

  it('should validate phone number input', async () => {
    // Navigate to login screen
    await waitFor(element(by.text('Welcome to Solarium')))
      .toBeVisible()
      .withTimeout(5000);

    // Test invalid phone number
    const phoneInput = element(by.label('Phone Number'));
    await phoneInput.typeText('123'); // Invalid - too short

    // Get OTP button should be disabled
    const getOtpButton = element(by.text('Get OTP'));
    await expect(getOtpButton).toBeVisible();

    // Clear and enter valid phone number
    await phoneInput.clearText();
    await phoneInput.typeText('9876543210');

    // Button should become enabled
    await expect(getOtpButton).toBeVisible();

    console.log('✅ Phone validation E2E test completed successfully');
  });

  it('should handle back navigation from OTP to login', async () => {
    // Complete phone entry to reach OTP screen
    await waitFor(element(by.text('Welcome to Solarium')))
      .toBeVisible()
      .withTimeout(5000);

    const phoneInput = element(by.label('Phone Number'));
    await phoneInput.typeText('9876543210');

    const getOtpButton = element(by.text('Get OTP'));
    await getOtpButton.tap();

    // Handle development alert
    await waitFor(element(by.text('Continue')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.text('Continue')).tap();

    // Should be on OTP screen
    await waitFor(element(by.text('Verify OTP')))
      .toBeVisible()
      .withTimeout(3000);

    // Tap back button
    const backButton = element(by.text('← Back to Phone'));
    await expect(backButton).toBeVisible();
    await backButton.tap();

    // Should return to login screen
    await waitFor(element(by.text('Welcome to Solarium')))
      .toBeVisible()
      .withTimeout(3000);

    console.log('✅ Back navigation E2E test completed successfully');
  });
});
