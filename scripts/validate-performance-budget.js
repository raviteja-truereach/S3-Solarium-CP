#!/usr/bin/env node

/**
 * Performance Budget Validation Script
 * Validates actual performance metrics against defined budgets
 */

const fs = require('fs');
const path = require('path');

// Load performance budget configuration
const budgetPath = path.join(__dirname, 'performance-budget.json');
const budget = JSON.parse(fs.readFileSync(budgetPath, 'utf8'));

// Command line arguments
const args = process.argv.slice(2);
const deviceTier =
  args.find((arg) => arg.startsWith('--device='))?.split('=')[1] || 'ci';
const platform =
  args.find((arg) => arg.startsWith('--platform='))?.split('=')[1] || 'android';
const metricsFile = args
  .find((arg) => arg.startsWith('--metrics='))
  ?.split('=')[1];

/**
 * Validate metrics against budget
 */
function validateBudget(metrics, budgetConfig, deviceTier) {
  const results = {
    passed: [],
    warnings: [],
    failures: [],
    summary: {
      total: 0,
      passed: 0,
      warnings: 0,
      failed: 0,
    },
  };

  for (const [metricType, metricBudget] of Object.entries(
    budgetConfig.budgets
  )) {
    const metricValue = metrics[metricType];
    if (metricValue === undefined) {
      console.warn(`⚠️  Metric ${metricType} not found in results`);
      continue;
    }

    results.summary.total++;

    // Get device-specific thresholds
    const deviceBudget = metricBudget.deviceTiers?.[deviceTier] || metricBudget;
    const target = deviceBudget.target || metricBudget.target.value;
    const maximum = deviceBudget.maximum || metricBudget.maximum.value;

    const result = {
      metric: metricType,
      value: metricValue,
      target: target,
      maximum: maximum,
      unit: metricBudget.target.unit || 'ms',
    };

    if (metricValue <= target) {
      result.status = 'PASS';
      result.message = `✅ ${metricType}: ${metricValue}${result.unit} (target: ${target}${result.unit})`;
      results.passed.push(result);
      results.summary.passed++;
    } else if (metricValue <= maximum) {
      result.status = 'WARNING';
      result.message = `⚠️  ${metricType}: ${metricValue}${result.unit} exceeds target ${target}${result.unit} but within max ${maximum}${result.unit}`;
      results.warnings.push(result);
      results.summary.warnings++;
    } else {
      result.status = 'FAIL';
      result.message = `❌ ${metricType}: ${metricValue}${result.unit} exceeds maximum ${maximum}${result.unit}`;
      results.failures.push(result);
      results.summary.failed++;
    }
  }

  return results;
}

/**
 * Generate performance report
 */
function generateReport(results, deviceTier, platform) {
  const timestamp = new Date().toISOString();

  let report = `# Performance Budget Validation Report\n\n`;
  report += `**Generated**: ${timestamp}\n`;
  report += `**Device Tier**: ${deviceTier}\n`;
  report += `**Platform**: ${platform}\n\n`;

  // Summary
  report += `## Summary\n\n`;
  report += `| Status | Count |\n`;
  report += `|--------|-------|\n`;
  report += `| ✅ Passed | ${results.summary.passed} |\n`;
  report += `| ⚠️ Warnings | ${results.summary.warnings} |\n`;
  report += `| ❌ Failed | ${results.summary.failed} |\n`;
  report += `| **Total** | **${results.summary.total}** |\n\n`;

  // Detailed results
  if (results.failures.length > 0) {
    report += `## ❌ Budget Violations (Critical)\n\n`;
    results.failures.forEach((result) => {
      report += `- ${result.message}\n`;
    });
    report += `\n`;
  }

  if (results.warnings.length > 0) {
    report += `## ⚠️ Performance Warnings\n\n`;
    results.warnings.forEach((result) => {
      report += `- ${result.message}\n`;
    });
    report += `\n`;
  }

  if (results.passed.length > 0) {
    report += `## ✅ Passing Metrics\n\n`;
    results.passed.forEach((result) => {
      report += `- ${result.message}\n`;
    });
    report += `\n`;
  }

  // Recommendations
  if (results.failures.length > 0 || results.warnings.length > 0) {
    report += `## 🔧 Recommendations\n\n`;

    if (results.failures.find((r) => r.metric === 'coldStart')) {
      report += `### Cold Start Optimization\n`;
      report += `- Review bundle size and lazy loading\n`;
      report += `- Profile startup operations\n`;
      report += `- Consider code splitting\n\n`;
    }

    if (results.failures.find((r) => r.metric === 'navigation')) {
      report += `### Navigation Optimization\n`;
      report += `- Optimize screen rendering\n`;
      report += `- Review component mounting logic\n`;
      report += `- Check for unnecessary re-renders\n\n`;
    }

    if (results.failures.find((r) => r.metric === 'memory')) {
      report += `### Memory Optimization\n`;
      report += `- Check for memory leaks\n`;
      report += `- Optimize image loading\n`;
      report += `- Review data caching strategies\n\n`;
    }
  }

  return report;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Performance Budget Validation');
  console.log('================================');

  if (!metricsFile) {
    console.error('❌ Error: --metrics parameter required');
    console.log(
      'Usage: node validate-performance-budget.js --metrics=path/to/metrics.json [--device=minimum|high-end] [--platform=ios|android]'
    );
    process.exit(1);
  }

  if (!fs.existsSync(metricsFile)) {
    console.error(`❌ Error: Metrics file not found: ${metricsFile}`);
    process.exit(1);
  }

  try {
    // Load metrics
    const metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
    console.log(`📊 Loaded metrics from: ${metricsFile}`);
    console.log(`🎯 Device tier: ${deviceTier}`);
    console.log(`📱 Platform: ${platform}\n`);

    // Validate against budget
    const results = validateBudget(metrics, budget, deviceTier);

    // Generate and display report
    const report = generateReport(results, deviceTier, platform);
    console.log(report);

    // Save report to file
    const reportPath = `performance-report-${deviceTier}-${platform}-${Date.now()}.md`;
    fs.writeFileSync(reportPath, report);
    console.log(`📄 Report saved to: ${reportPath}`);

    // Set exit code based on results
    if (results.summary.failed > 0) {
      console.log('❌ Performance budget validation FAILED');
      process.exit(1);
    } else if (results.summary.warnings > 0) {
      console.log('⚠️  Performance budget validation passed with warnings');
      process.exit(0);
    } else {
      console.log('✅ Performance budget validation PASSED');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error during validation:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { validateBudget, generateReport };
