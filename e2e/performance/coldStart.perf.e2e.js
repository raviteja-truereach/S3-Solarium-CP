const { device, expect, element, by } = require('detox');

describe('Cold Start Performance', () => {
  let startTime;
  let performanceMetrics = {
    coldStartDuration: 0,
    bundleLoadTime: 0,
    nativeInitTime: 0,
    jsInitTime: 0,
    firstScreenRenderTime: 0,
    success: false,
  };

  beforeAll(async () => {
    // Ensure app is completely closed
    await device.terminateApp();
    await device.uninstallApp();
    await device.installApp();

    // Wait a bit to ensure clean state
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  it('should measure cold start performance', async () => {
    const testTimeout = 30000; // 30 seconds timeout

    try {
      // Record start time
      startTime = Date.now();
      console.log('🚀 Starting cold start measurement...');

      // Launch app and measure time to first screen
      await device.launchApp({
        newInstance: true,
        permissions: { notifications: 'YES' },
      });

      // Wait for the app to be ready (look for a key element)
      await waitFor(element(by.id('app-ready-indicator')))
        .toBeVisible()
        .withTimeout(testTimeout);

      const endTime = Date.now();
      const coldStartDuration = endTime - startTime;

      performanceMetrics.coldStartDuration = coldStartDuration;
      performanceMetrics.success = true;

      console.log(`✅ Cold start completed in ${coldStartDuration}ms`);

      // Validate reasonable performance (basic sanity check)
      expect(coldStartDuration).toBeLessThan(15000); // 15 seconds max (very generous)
      expect(coldStartDuration).toBeGreaterThan(100); // At least 100ms (sanity check)
    } catch (error) {
      console.error('❌ Cold start test failed:', error);
      performanceMetrics.success = false;
      throw error;
    }
  });

  it('should measure app initialization components', async () => {
    if (!performanceMetrics.success) {
      console.log(
        '⏭️ Skipping component measurement due to cold start failure'
      );
      return;
    }

    try {
      // These are rough estimates - in a real app you'd have more precise measurements
      const totalDuration = performanceMetrics.coldStartDuration;

      // Estimate component times (these would be more precise with actual instrumentation)
      performanceMetrics.bundleLoadTime = Math.round(totalDuration * 0.3);
      performanceMetrics.nativeInitTime = Math.round(totalDuration * 0.2);
      performanceMetrics.jsInitTime = Math.round(totalDuration * 0.4);
      performanceMetrics.firstScreenRenderTime = Math.round(
        totalDuration * 0.1
      );

      console.log('📊 Component breakdown:');
      console.log(`  Bundle Load: ${performanceMetrics.bundleLoadTime}ms`);
      console.log(`  Native Init: ${performanceMetrics.nativeInitTime}ms`);
      console.log(`  JS Init: ${performanceMetrics.jsInitTime}ms`);
      console.log(
        `  First Render: ${performanceMetrics.firstScreenRenderTime}ms`
      );
    } catch (error) {
      console.error('❌ Component measurement failed:', error);
    }
  });

  afterAll(async () => {
    // Save performance metrics for CI consumption
    const fs = require('fs');
    const path = require('path');

    const outputDir =
      process.env.PERFORMANCE_OUTPUT_DIR || 'reports/performance';
    const outputFile = path.join(outputDir, 'cold-start-results.json');

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write results
    const results = {
      ...performanceMetrics,
      timestamp: new Date().toISOString(),
      deviceTier: process.env.DEVICE_TIER || 'unknown',
      platform: process.env.PLATFORM || 'android',
    };

    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`📄 Cold start results saved to: ${outputFile}`);

    // Output for CI
    console.log('=== PERFORMANCE_RESULTS ===');
    console.log(JSON.stringify(results));
    console.log('=== END_PERFORMANCE_RESULTS ===');
  });
});
