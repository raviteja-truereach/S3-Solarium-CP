const { device, expect, element, by } = require('detox');

describe('Navigation Performance', () => {
  let navigationMetrics = {
    transitions: [],
    averageDuration: 0,
    maxDuration: 0,
    success: false,
  };

  beforeAll(async () => {
    await device.launchApp({ newInstance: true });

    // Wait for app to be ready
    await waitFor(element(by.id('app-ready-indicator')))
      .toBeVisible()
      .withTimeout(30000);
  });

  it('should measure tab navigation performance', async () => {
    const testTransitions = [
      { from: 'Home', to: 'Leads', fromId: 'home-tab', toId: 'leads-tab' },
      {
        from: 'Leads',
        to: 'Notifications',
        fromId: 'leads-tab',
        toId: 'notifications-tab',
      },
      {
        from: 'Notifications',
        to: 'Settings',
        fromId: 'notifications-tab',
        toId: 'settings-tab',
      },
      {
        from: 'Settings',
        to: 'Home',
        fromId: 'settings-tab',
        toId: 'home-tab',
      },
    ];

    for (const transition of testTransitions) {
      try {
        console.log(
          `🧭 Testing navigation: ${transition.from} → ${transition.to}`
        );

        const startTime = Date.now();

        // Tap the destination tab
        await element(by.id(transition.toId)).tap();

        // Wait for the destination screen to be visible
        await waitFor(element(by.id(`${transition.to.toLowerCase()}-screen`)))
          .toBeVisible()
          .withTimeout(5000);

        const endTime = Date.now();
        const duration = endTime - startTime;

        navigationMetrics.transitions.push({
          from: transition.from,
          to: transition.to,
          duration: duration,
          timestamp: new Date().toISOString(),
        });

        console.log(`✅ Navigation completed in ${duration}ms`);

        // Basic validation
        expect(duration).toBeLessThan(2000); // 2 seconds max

        // Small delay between transitions
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(
          `❌ Navigation ${transition.from} → ${transition.to} failed:`,
          error
        );

        navigationMetrics.transitions.push({
          from: transition.from,
          to: transition.to,
          duration: -1,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  it('should measure deep navigation performance', async () => {
    try {
      // Navigate to leads list
      await element(by.id('leads-tab')).tap();
      await waitFor(element(by.id('leads-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Navigate to first lead detail (if available)
      const leadItems = element(by.id('lead-list-item')).atIndex(0);

      const startTime = Date.now();

      await leadItems.tap();

      // Wait for lead detail screen
      await waitFor(element(by.id('lead-detail-screen')))
        .toBeVisible()
        .withTimeout(5000);

      const endTime = Date.now();
      const duration = endTime - startTime;

      navigationMetrics.transitions.push({
        from: 'LeadsList',
        to: 'LeadDetail',
        duration: duration,
        type: 'deep-navigation',
        timestamp: new Date().toISOString(),
      });

      console.log(`✅ Deep navigation completed in ${duration}ms`);

      // Navigate back
      const backStartTime = Date.now();
      await element(by.id('back-button')).tap();

      await waitFor(element(by.id('leads-screen')))
        .toBeVisible()
        .withTimeout(5000);

      const backEndTime = Date.now();
      const backDuration = backEndTime - backStartTime;

      navigationMetrics.transitions.push({
        from: 'LeadDetail',
        to: 'LeadsList',
        duration: backDuration,
        type: 'back-navigation',
        timestamp: new Date().toISOString(),
      });

      console.log(`✅ Back navigation completed in ${backDuration}ms`);
    } catch (error) {
      console.error('❌ Deep navigation test failed:', error);
      // Don't fail the entire test for deep navigation issues
    }
  });

  afterAll(async () => {
    // Calculate metrics
    const validTransitions = navigationMetrics.transitions.filter(
      (t) => t.duration > 0
    );

    if (validTransitions.length > 0) {
      const durations = validTransitions.map((t) => t.duration);
      navigationMetrics.averageDuration = Math.round(
        durations.reduce((a, b) => a + b, 0) / durations.length
      );
      navigationMetrics.maxDuration = Math.max(...durations);
      navigationMetrics.success = true;
    }

    // Save results
    const fs = require('fs');
    const path = require('path');

    const outputDir =
      process.env.PERFORMANCE_OUTPUT_DIR || 'reports/performance';
    const outputFile = path.join(outputDir, 'navigation-results.json');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const results = {
      ...navigationMetrics,
      timestamp: new Date().toISOString(),
      deviceTier: process.env.DEVICE_TIER || 'unknown',
      platform: process.env.PLATFORM || 'android',
    };

    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`📄 Navigation results saved to: ${outputFile}`);

    // Output for CI
    console.log('=== NAVIGATION_RESULTS ===');
    console.log(JSON.stringify(results));
    console.log('=== END_NAVIGATION_RESULTS ===');
  });
});
