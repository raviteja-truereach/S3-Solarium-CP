#!/usr/bin/env node

/**
 * CI Performance Check Script
 * Runs performance tests and validates against budgets in CI environment
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Configuration
const CONFIG = {
  PERFORMANCE_BUDGET_FILE: path.join(__dirname, 'performance-budget.json'),
  RESULTS_DIR: path.join(__dirname, '../reports/performance'),
  DETOX_CONFIG: process.env.DETOX_CONFIGURATION || 'android.emu.debug',
  DEVICE_TIER: process.env.DEVICE_TIER || 'minimum',
  PLATFORM: process.env.PLATFORM || 'android',
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000,
  TIMEOUT: 300000, // 5 minutes
};

// Ensure reports directory exists
if (!fs.existsSync(CONFIG.RESULTS_DIR)) {
  fs.mkdirSync(CONFIG.RESULTS_DIR, { recursive: true });
}

/**
 * Execute command with retry logic
 */
async function executeWithRetry(command, options = {}) {
  const maxRetries = options.retries || CONFIG.MAX_RETRIES;
  const delay = options.delay || CONFIG.RETRY_DELAY;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}: ${command}`);

      const result = execSync(command, {
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: CONFIG.TIMEOUT,
        ...options,
      });

      console.log(`✅ Command succeeded on attempt ${attempt}`);
      return result;
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        throw new Error(
          `Command failed after ${maxRetries} attempts: ${command}\nLast error: ${error.message}`
        );
      }

      if (delay > 0) {
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}

/**
 * Run cold start performance test
 */
async function runColdStartTest() {
  console.log('🚀 Running cold start performance test...');

  const outputFile = path.join(CONFIG.RESULTS_DIR, 'cold-start-results.json');

  try {
    await executeWithRetry(
      `npx detox test e2e/performance/coldStart.perf.e2e.js --configuration ${CONFIG.DETOX_CONFIG} --device-tier ${CONFIG.DEVICE_TIER} --record-performance --output-file ${outputFile}`,
      { cwd: process.cwd() }
    );

    console.log('✅ Cold start test completed');
    return true;
  } catch (error) {
    console.error('❌ Cold start test failed:', error.message);
    return false;
  }
}

/**
 * Run navigation performance test
 */
async function runNavigationTest() {
  console.log('🧭 Running navigation performance test...');

  const outputFile = path.join(CONFIG.RESULTS_DIR, 'navigation-results.json');

  try {
    await executeWithRetry(
      `npx detox test e2e/performance/navigation.perf.e2e.js --configuration ${CONFIG.DETOX_CONFIG} --device-tier ${CONFIG.DEVICE_TIER} --record-performance --output-file ${outputFile}`,
      { cwd: process.cwd() }
    );

    console.log('✅ Navigation test completed');
    return true;
  } catch (error) {
    console.error('❌ Navigation test failed:', error.message);
    return false;
  }
}

/**
 * Run memory performance test
 */
async function runMemoryTest() {
  console.log('🧠 Running memory performance test...');

  try {
    await executeWithRetry(
      `yarn test __tests__/performance/memoryPerformance.test.ts --testNamePattern="${CONFIG.DEVICE_TIER}" --outputFile=${CONFIG.RESULTS_DIR}/memory-results.json`,
      { cwd: process.cwd() }
    );

    console.log('✅ Memory test completed');
    return true;
  } catch (error) {
    console.error('❌ Memory test failed:', error.message);
    return false;
  }
}

/**
 * Collect and parse performance metrics from test results
 */
function collectPerformanceMetrics() {
  console.log('📊 Collecting performance metrics...');

  const metrics = {
    coldStart: null,
    navigation: null,
    memory: null,
    timestamp: new Date().toISOString(),
    deviceTier: CONFIG.DEVICE_TIER,
    platform: CONFIG.PLATFORM,
  };

  // Parse cold start results
  const coldStartFile = path.join(
    CONFIG.RESULTS_DIR,
    'cold-start-results.json'
  );
  if (fs.existsSync(coldStartFile)) {
    try {
      const coldStartData = JSON.parse(fs.readFileSync(coldStartFile, 'utf8'));
      metrics.coldStart = {
        duration: coldStartData.coldStartDuration || coldStartData.duration,
        success: coldStartData.success !== false,
        details: coldStartData,
      };
    } catch (error) {
      console.warn('⚠️  Failed to parse cold start results:', error.message);
    }
  }

  // Parse navigation results
  const navigationFile = path.join(
    CONFIG.RESULTS_DIR,
    'navigation-results.json'
  );
  if (fs.existsSync(navigationFile)) {
    try {
      const navigationData = JSON.parse(
        fs.readFileSync(navigationFile, 'utf8')
      );
      metrics.navigation = {
        averageDuration:
          navigationData.averageDuration || navigationData.duration,
        maxDuration: navigationData.maxDuration,
        success: navigationData.success !== false,
        details: navigationData,
      };
    } catch (error) {
      console.warn('⚠️  Failed to parse navigation results:', error.message);
    }
  }

  // Parse memory results
  const memoryFile = path.join(CONFIG.RESULTS_DIR, 'memory-results.json');
  if (fs.existsSync(memoryFile)) {
    try {
      const memoryData = JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
      metrics.memory = {
        peakUsage: memoryData.peakUsage || memoryData.maxMemory,
        averageUsage: memoryData.averageUsage,
        success: memoryData.success !== false,
        details: memoryData,
      };
    } catch (error) {
      console.warn('⚠️  Failed to parse memory results:', error.message);
    }
  }

  // Save collected metrics
  const metricsFile = path.join(CONFIG.RESULTS_DIR, 'collected-metrics.json');
  fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));

  console.log('📈 Metrics collected and saved to:', metricsFile);
  return metrics;
}

/**
 * Validate performance against budgets
 */
async function validatePerformanceBudgets(metrics) {
  console.log('🎯 Validating performance against budgets...');

  try {
    const metricsFile = path.join(CONFIG.RESULTS_DIR, 'collected-metrics.json');

    // Use existing budget validation script
    const validationResult = await executeWithRetry(
      `node ${path.join(
        __dirname,
        'validate-performance-budget.js'
      )} --metrics=${metricsFile} --device=${CONFIG.DEVICE_TIER} --platform=${
        CONFIG.PLATFORM
      }`,
      { cwd: process.cwd() }
    );

    console.log('✅ Budget validation completed');
    return { success: true, output: validationResult };
  } catch (error) {
    console.error('❌ Budget validation failed:', error.message);
    return { success: false, error: error.message, output: error.stdout };
  }
}

/**
 * Generate performance report
 */
async function generatePerformanceReport(metrics, validationResult) {
  console.log('📄 Generating performance report...');

  try {
    const reportScript = path.join(
      __dirname,
      'performance-report-generator.js'
    );
    const metricsFile = path.join(CONFIG.RESULTS_DIR, 'collected-metrics.json');
    const reportFile = path.join(CONFIG.RESULTS_DIR, 'performance-report.md');

    await executeWithRetry(
      `node ${reportScript} --metrics=${metricsFile} --device=${CONFIG.DEVICE_TIER} --platform=${CONFIG.PLATFORM} --output=${reportFile}`,
      { cwd: process.cwd() }
    );

    console.log('📋 Performance report generated:', reportFile);
    return reportFile;
  } catch (error) {
    console.error('❌ Report generation failed:', error.message);
    return null;
  }
}

/**
 * Check for performance gate override
 */
function checkPerformanceOverride() {
  const overrideFile = path.join(process.cwd(), '.performance-override');
  const prTitle = process.env.PR_TITLE || '';
  const prBody = process.env.PR_BODY || '';

  // Check for override file
  if (fs.existsSync(overrideFile)) {
    try {
      const override = JSON.parse(fs.readFileSync(overrideFile, 'utf8'));
      console.log('🔓 Performance override found:', override.reason);
      return {
        enabled: true,
        reason: override.reason,
        approver: override.approver,
        timestamp: override.timestamp,
      };
    } catch (error) {
      console.warn('⚠️  Invalid override file:', error.message);
    }
  }

  // Check for override in PR title/body
  const overridePattern = /\[skip-performance\]|\[performance-override\]/i;
  if (overridePattern.test(prTitle) || overridePattern.test(prBody)) {
    console.log('🔓 Performance override found in PR');
    return {
      enabled: true,
      reason: 'Override specified in PR title/body',
      approver: process.env.PR_AUTHOR || 'unknown',
      timestamp: new Date().toISOString(),
    };
  }

  return { enabled: false };
}

/**
 * Main execution function
 */
async function main() {
  const startTime = Date.now();

  console.log('🚀 CI Performance Gate Starting');
  console.log('================================');
  console.log(`Device Tier: ${CONFIG.DEVICE_TIER}`);
  console.log(`Platform: ${CONFIG.PLATFORM}`);
  console.log(`Configuration: ${CONFIG.DETOX_CONFIG}`);
  console.log('');

  // Check for performance override
  const override = checkPerformanceOverride();
  if (override.enabled) {
    console.log('🔓 Performance gate bypassed');
    console.log(`Reason: ${override.reason}`);
    console.log(`Approved by: ${override.approver}`);
    process.exit(0);
  }

  let testResults = {
    coldStart: false,
    navigation: false,
    memory: false,
  };

  try {
    // Run performance tests
    console.log('🧪 Running performance tests...');

    testResults.coldStart = await runColdStartTest();
    testResults.navigation = await runNavigationTest();
    testResults.memory = await runMemoryTest();

    const testsPassedCount = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;

    console.log(`\n📊 Test Results: ${testsPassedCount}/${totalTests} passed`);

    if (testsPassedCount === 0) {
      console.error(
        '❌ All performance tests failed - unable to collect metrics'
      );
      process.exit(1);
    }

    // Collect metrics
    const metrics = collectPerformanceMetrics();

    // Validate against budgets
    const validationResult = await validatePerformanceBudgets(metrics);

    // Generate report
    const reportFile = await generatePerformanceReport(
      metrics,
      validationResult
    );

    // Print summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n🏁 Performance Gate Summary');
    console.log('===========================');
    console.log(`Total Duration: ${duration}s`);
    console.log(`Tests Passed: ${testsPassedCount}/${totalTests}`);
    console.log(
      `Budget Validation: ${
        validationResult.success ? '✅ PASSED' : '❌ FAILED'
      }`
    );

    if (reportFile) {
      console.log(`Report: ${reportFile}`);
    }

    // Set environment variables for subsequent CI steps
    if (process.env.GITHUB_ENV) {
      fs.appendFileSync(
        process.env.GITHUB_ENV,
        `PERFORMANCE_REPORT_FILE=${reportFile}\n`
      );
      fs.appendFileSync(
        process.env.GITHUB_ENV,
        `PERFORMANCE_TESTS_PASSED=${testsPassedCount}\n`
      );
      fs.appendFileSync(
        process.env.GITHUB_ENV,
        `PERFORMANCE_BUDGET_PASSED=${validationResult.success}\n`
      );
    }

    // Exit with appropriate code
    if (!validationResult.success) {
      console.log('\n❌ Performance budgets exceeded - failing build');
      process.exit(1);
    } else {
      console.log('\n✅ All performance checks passed');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n💥 Performance gate execution failed:', error.message);
    process.exit(1);
  }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Performance gate interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Performance gate terminated');
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  runColdStartTest,
  runNavigationTest,
  runMemoryTest,
  collectPerformanceMetrics,
  validatePerformanceBudgets,
  generatePerformanceReport,
  checkPerformanceOverride,
};
