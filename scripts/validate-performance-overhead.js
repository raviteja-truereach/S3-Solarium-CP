#!/usr/bin/env node

/**
 * Performance Overhead Validation Script
 * Measures the overhead introduced by performance monitoring
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  BASELINE_RUNS: 5,
  INSTRUMENTED_RUNS: 5,
  WARMUP_RUNS: 2,
  RESULTS_DIR: path.join(__dirname, '../reports/performance'),
  MAX_ACCEPTABLE_OVERHEAD: 0.01, // 1%
};

/**
 * Run baseline performance test (monitoring disabled)
 */
async function runBaselineTest(runNumber) {
  console.log(`🏃 Running baseline test ${runNumber}...`);

  const env = {
    ...process.env,
    ENABLE_TELEMETRY: 'false',
    ENABLE_PERFORMANCE_TRACKING: 'false',
    ENABLE_MEMORY_TRACKING: 'false',
  };

  try {
    // Run a simplified performance test
    const result = execSync(
      'yarn test __tests__/performance/baselinePerformance.test.ts --silent',
      {
        encoding: 'utf8',
        env: env,
        timeout: 60000,
      }
    );

    // Parse results from test output
    const metrics = extractMetricsFromOutput(result);
    return metrics;
  } catch (error) {
    console.error(`❌ Baseline test ${runNumber} failed:`, error.message);
    return null;
  }
}

/**
 * Run instrumented performance test (monitoring enabled)
 */
async function runInstrumentedTest(runNumber) {
  console.log(`📊 Running instrumented test ${runNumber}...`);

  const env = {
    ...process.env,
    ENABLE_TELEMETRY: 'true',
    ENABLE_PERFORMANCE_TRACKING: 'true',
    ENABLE_MEMORY_TRACKING: 'true',
  };

  try {
    const result = execSync(
      'yarn test __tests__/performance/instrumentedPerformance.test.ts --silent',
      {
        encoding: 'utf8',
        env: env,
        timeout: 60000,
      }
    );

    const metrics = extractMetricsFromOutput(result);
    return metrics;
  } catch (error) {
    console.error(`❌ Instrumented test ${runNumber} failed:`, error.message);
    return null;
  }
}

/**
 * Extract performance metrics from test output
 */
function extractMetricsFromOutput(output) {
  const metrics = {
    duration: 0,
    memoryUsage: 0,
    cpuUsage: 0,
  };

  // Look for specific patterns in test output
  const durationMatch = output.match(/Test Duration: (\d+)ms/);
  if (durationMatch) {
    metrics.duration = parseInt(durationMatch[1]);
  }

  const memoryMatch = output.match(/Peak Memory: (\d+)MB/);
  if (memoryMatch) {
    metrics.memoryUsage = parseInt(memoryMatch[1]) * 1024 * 1024; // Convert to bytes
  }

  // For CPU usage, we'd need more sophisticated measurement
  // This is a simplified version
  metrics.cpuUsage = metrics.duration; // Use duration as CPU proxy

  return metrics;
}

/**
 * Calculate statistical metrics
 */
function calculateStats(values) {
  if (values.length === 0) return { mean: 0, median: 0, stdDev: 0 };

  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const median = sorted[Math.floor(sorted.length / 2)];

  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  const stdDev = Math.sqrt(variance);

  return { mean, median, stdDev };
}

/**
 * Calculate overhead percentage
 */
function calculateOverhead(baseline, instrumented) {
  if (baseline === 0) return 0;
  return (instrumented - baseline) / baseline;
}

/**
 * Generate overhead report
 */
function generateOverheadReport(baselineResults, instrumentedResults) {
  const report = {
    timestamp: new Date().toISOString(),
    baseline: {
      runs: baselineResults.length,
      duration: calculateStats(baselineResults.map((r) => r.duration)),
      memory: calculateStats(baselineResults.map((r) => r.memoryUsage)),
      cpu: calculateStats(baselineResults.map((r) => r.cpuUsage)),
    },
    instrumented: {
      runs: instrumentedResults.length,
      duration: calculateStats(instrumentedResults.map((r) => r.duration)),
      memory: calculateStats(instrumentedResults.map((r) => r.memoryUsage)),
      cpu: calculateStats(instrumentedResults.map((r) => r.cpuUsage)),
    },
    overhead: {
      duration: calculateOverhead(
        baselineResults.reduce((sum, r) => sum + r.duration, 0) /
          baselineResults.length,
        instrumentedResults.reduce((sum, r) => sum + r.duration, 0) /
          instrumentedResults.length
      ),
      memory: calculateOverhead(
        baselineResults.reduce((sum, r) => sum + r.memoryUsage, 0) /
          baselineResults.length,
        instrumentedResults.reduce((sum, r) => sum + r.memoryUsage, 0) /
          instrumentedResults.length
      ),
      cpu: calculateOverhead(
        baselineResults.reduce((sum, r) => sum + r.cpuUsage, 0) /
          baselineResults.length,
        instrumentedResults.reduce((sum, r) => sum + r.cpuUsage, 0) /
          instrumentedResults.length
      ),
    },
  };

  // Determine if overhead is acceptable
  report.acceptable =
    Math.max(
      Math.abs(report.overhead.duration),
      Math.abs(report.overhead.memory),
      Math.abs(report.overhead.cpu)
    ) <= CONFIG.MAX_ACCEPTABLE_OVERHEAD;

  return report;
}

/**
 * Main execution
 */
async function main() {
  console.log('📈 Performance Overhead Validation');
  console.log('=================================');
  console.log(`Baseline runs: ${CONFIG.BASELINE_RUNS}`);
  console.log(`Instrumented runs: ${CONFIG.INSTRUMENTED_RUNS}`);
  console.log(
    `Max acceptable overhead: ${(CONFIG.MAX_ACCEPTABLE_OVERHEAD * 100).toFixed(
      1
    )}%`
  );
  console.log('');

  // Ensure results directory exists
  if (!fs.existsSync(CONFIG.RESULTS_DIR)) {
    fs.mkdirSync(CONFIG.RESULTS_DIR, { recursive: true });
  }

  const baselineResults = [];
  const instrumentedResults = [];

  try {
    // Run warmup tests
    console.log('🔥 Running warmup tests...');
    for (let i = 0; i < CONFIG.WARMUP_RUNS; i++) {
      await runBaselineTest(i + 1);
      await runInstrumentedTest(i + 1);
    }

    // Run baseline tests
    console.log('\n📊 Running baseline tests...');
    for (let i = 0; i < CONFIG.BASELINE_RUNS; i++) {
      const result = await runBaselineTest(i + 1);
      if (result) {
        baselineResults.push(result);
      }
    }

    // Run instrumented tests
    console.log('\n📈 Running instrumented tests...');
    for (let i = 0; i < CONFIG.INSTRUMENTED_RUNS; i++) {
      const result = await runInstrumentedTest(i + 1);
      if (result) {
        instrumentedResults.push(result);
      }
    }

    // Validate we have enough results
    if (baselineResults.length === 0 || instrumentedResults.length === 0) {
      throw new Error('Insufficient test results for overhead calculation');
    }

    // Generate report
    const report = generateOverheadReport(baselineResults, instrumentedResults);

    // Save report
    const reportPath = path.join(CONFIG.RESULTS_DIR, 'overhead-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Print summary
    console.log('\n📋 Overhead Analysis Results');
    console.log('============================');
    console.log(
      `Duration Overhead: ${(report.overhead.duration * 100).toFixed(2)}%`
    );
    console.log(
      `Memory Overhead: ${(report.overhead.memory * 100).toFixed(2)}%`
    );
    console.log(`CPU Overhead: ${(report.overhead.cpu * 100).toFixed(2)}%`);
    console.log(
      `\nOverall Status: ${
        report.acceptable ? '✅ ACCEPTABLE' : '❌ EXCEEDS BUDGET'
      }`
    );
    console.log(`Report saved to: ${reportPath}`);

    // Exit with appropriate code
    process.exit(report.acceptable ? 0 : 1);
  } catch (error) {
    console.error('\n💥 Overhead validation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runBaselineTest,
  runInstrumentedTest,
  calculateOverhead,
  generateOverheadReport,
};
