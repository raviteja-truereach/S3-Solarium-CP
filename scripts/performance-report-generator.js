#!/usr/bin/env node

/**
 * Performance Report Generator
 * Creates detailed markdown reports for PR comments and CI artifacts
 */

const fs = require('fs');
const path = require('path');

// Command line arguments
const args = process.argv.slice(2);
const metricsFile = args
  .find((arg) => arg.startsWith('--metrics='))
  ?.split('=')[1];
const deviceTier =
  args.find((arg) => arg.startsWith('--device='))?.split('=')[1] || 'minimum';
const platform =
  args.find((arg) => arg.startsWith('--platform='))?.split('=')[1] || 'android';
const outputFile = args
  .find((arg) => arg.startsWith('--output='))
  ?.split('=')[1];

/**
 * Load performance budget
 */
function loadPerformanceBudget() {
  const budgetPath = path.join(__dirname, 'performance-budget.json');
  try {
    return JSON.parse(fs.readFileSync(budgetPath, 'utf8'));
  } catch (error) {
    console.error('Failed to load performance budget:', error.message);
    return null;
  }
}

/**
 * Format duration in human readable format
 */
function formatDuration(ms) {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${Math.round(ms)}ms`;
}

/**
 * Format memory in human readable format
 */
function formatMemory(bytes) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
  } else if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)}KB`;
  }
  return `${bytes}B`;
}

/**
 * Get performance status emoji and text
 */
function getPerformanceStatus(actual, target, maximum) {
  if (actual <= target) {
    return { emoji: '✅', status: 'EXCELLENT', color: 'green' };
  } else if (actual <= maximum) {
    return { emoji: '⚠️', status: 'WARNING', color: 'yellow' };
  } else {
    return { emoji: '❌', status: 'FAILED', color: 'red' };
  }
}

/**
 * Generate performance comparison table
 */
function generatePerformanceTable(metrics, budget, deviceTier) {
  const deviceBudget = budget.budgets;

  let table = '| Metric | Result | Target | Maximum | Status |\n';
  table += '|--------|--------|--------|---------|--------|\n';

  // Cold Start
  if (metrics.coldStart) {
    const budgetData = deviceBudget.coldStart;
    const target =
      budgetData.deviceTiers?.[deviceTier]?.target || budgetData.target.value;
    const maximum =
      budgetData.deviceTiers?.[deviceTier]?.maximum || budgetData.maximum.value;
    const status = getPerformanceStatus(
      metrics.coldStart.duration,
      target,
      maximum
    );

    table += `| Cold Start | ${formatDuration(
      metrics.coldStart.duration
    )} | ${formatDuration(target)} | ${formatDuration(maximum)} | ${
      status.emoji
    } ${status.status} |\n`;
  }

  // Navigation
  if (metrics.navigation) {
    const budgetData = deviceBudget.navigation;
    const target =
      budgetData.deviceTiers?.[deviceTier]?.target || budgetData.target.value;
    const maximum =
      budgetData.deviceTiers?.[deviceTier]?.maximum || budgetData.maximum.value;
    const duration =
      metrics.navigation.averageDuration || metrics.navigation.duration;
    const status = getPerformanceStatus(duration, target, maximum);

    table += `| Navigation | ${formatDuration(duration)} | ${formatDuration(
      target
    )} | ${formatDuration(maximum)} | ${status.emoji} ${status.status} |\n`;
  }

  // Memory
  if (metrics.memory) {
    const budgetData = deviceBudget.memory;
    const target =
      budgetData.deviceTiers?.[deviceTier]?.target || budgetData.target.value;
    const maximum =
      budgetData.deviceTiers?.[deviceTier]?.maximum || budgetData.maximum.value;
    const usage = metrics.memory.peakUsage || metrics.memory.usage;
    const status = getPerformanceStatus(usage, target, maximum);

    table += `| Memory Usage | ${formatMemory(usage)} | ${formatMemory(
      target
    )} | ${formatMemory(maximum)} | ${status.emoji} ${status.status} |\n`;
  }

  return table;
}

/**
 * Generate detailed metrics section
 */
function generateDetailedMetrics(metrics) {
  let details = '## 📊 Detailed Metrics\n\n';

  if (metrics.coldStart) {
    details += '### Cold Start Performance\n';
    details += `- **Total Duration**: ${formatDuration(
      metrics.coldStart.duration
    )}\n`;
    if (metrics.coldStart.details) {
      const d = metrics.coldStart.details;
      if (d.bundleLoadTime)
        details += `- **Bundle Load**: ${formatDuration(d.bundleLoadTime)}\n`;
      if (d.nativeInitTime)
        details += `- **Native Init**: ${formatDuration(d.nativeInitTime)}\n`;
      if (d.jsInitTime)
        details += `- **JS Init**: ${formatDuration(d.jsInitTime)}\n`;
      if (d.firstScreenRenderTime)
        details += `- **First Render**: ${formatDuration(
          d.firstScreenRenderTime
        )}\n`;
    }
    details += '\n';
  }

  if (metrics.navigation) {
    details += '### Navigation Performance\n';
    details += `- **Average Duration**: ${formatDuration(
      metrics.navigation.averageDuration || 0
    )}\n`;
    if (metrics.navigation.maxDuration) {
      details += `- **Max Duration**: ${formatDuration(
        metrics.navigation.maxDuration
      )}\n`;
    }
    if (metrics.navigation.details && metrics.navigation.details.transitions) {
      details += `- **Transitions Tested**: ${metrics.navigation.details.transitions.length}\n`;
    }
    details += '\n';
  }

  if (metrics.memory) {
    details += '### Memory Performance\n';
    details += `- **Peak Usage**: ${formatMemory(
      metrics.memory.peakUsage || 0
    )}\n`;
    if (metrics.memory.averageUsage) {
      details += `- **Average Usage**: ${formatMemory(
        metrics.memory.averageUsage
      )}\n`;
    }
    if (metrics.memory.details) {
      const d = metrics.memory.details;
      if (d.jsHeapUsed)
        details += `- **JS Heap**: ${formatMemory(d.jsHeapUsed)}\n`;
      if (d.nativeHeapUsed)
        details += `- **Native Heap**: ${formatMemory(d.nativeHeapUsed)}\n`;
    }
    details += '\n';
  }

  return details;
}

/**
 * Generate recommendations section
 */
function generateRecommendations(metrics, budget, deviceTier) {
  const recommendations = [];
  const deviceBudget = budget.budgets;

  // Check cold start performance
  if (metrics.coldStart) {
    const budgetData = deviceBudget.coldStart;
    const maximum =
      budgetData.deviceTiers?.[deviceTier]?.maximum || budgetData.maximum.value;

    if (metrics.coldStart.duration > maximum) {
      recommendations.push({
        title: '🚀 Cold Start Optimization',
        items: [
          'Consider code splitting and lazy loading',
          'Profile startup operations with React Native Performance Monitor',
          'Optimize bundle size and reduce initial JavaScript execution',
          'Review database initialization and migration strategies',
        ],
      });
    }
  }

  // Check navigation performance
  if (metrics.navigation) {
    const budgetData = deviceBudget.navigation;
    const maximum =
      budgetData.deviceTiers?.[deviceTier]?.maximum || budgetData.maximum.value;
    const duration =
      metrics.navigation.averageDuration || metrics.navigation.duration;

    if (duration > maximum) {
      recommendations.push({
        title: '🧭 Navigation Optimization',
        items: [
          'Optimize screen rendering and component mounting',
          'Implement progressive loading for heavy screens',
          'Review navigation animations and transitions',
          'Consider preloading critical screen data',
        ],
      });
    }
  }

  // Check memory usage
  if (metrics.memory) {
    const budgetData = deviceBudget.memory;
    const maximum =
      budgetData.deviceTiers?.[deviceTier]?.maximum || budgetData.maximum.value;
    const usage = metrics.memory.peakUsage || metrics.memory.usage;

    if (usage > maximum) {
      recommendations.push({
        title: '🧠 Memory Optimization',
        items: [
          'Check for memory leaks in components and services',
          'Optimize image loading and caching strategies',
          'Review data structures and object lifecycle management',
          'Consider implementing memory pressure handling',
        ],
      });
    }
  }

  if (recommendations.length === 0) {
    return '## 🎉 Great Performance!\n\nAll metrics are within acceptable ranges. Keep up the good work!\n\n';
  }

  let section = '## 🔧 Performance Recommendations\n\n';
  recommendations.forEach((rec) => {
    section += `### ${rec.title}\n`;
    rec.items.forEach((item) => {
      section += `- ${item}\n`;
    });
    section += '\n';
  });

  return section;
}

/**
 * Generate CI information section
 */
function generateCIInfo(metrics) {
  let info = '## ℹ️ Test Information\n\n';
  info += `- **Timestamp**: ${metrics.timestamp}\n`;
  info += `- **Device Tier**: ${metrics.deviceTier}\n`;
  info += `- **Platform**: ${metrics.platform}\n`;
  info += `- **CI Environment**: ${process.env.CI ? 'Yes' : 'No'}\n`;

  if (process.env.GITHUB_RUN_ID) {
    info += `- **GitHub Run**: [#${process.env.GITHUB_RUN_ID}](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID})\n`;
  }

  if (process.env.GITHUB_SHA) {
    info += `- **Commit**: ${process.env.GITHUB_SHA.substring(0, 8)}\n`;
  }

  info += '\n';
  return info;
}

/**
 * Generate complete performance report
 */
function generatePerformanceReport(metrics, budget, deviceTier, platform) {
  const timestamp = new Date().toISOString();
  const overallPassing = checkOverallStatus(metrics, budget, deviceTier);

  let report = '';

  // Header
  report += `# 📱 Performance Report\n\n`;
  report += `${overallPassing ? '✅' : '❌'} **Overall Status**: ${
    overallPassing ? 'PASSED' : 'FAILED'
  }\n\n`;

  // Performance summary table
  report += '## 📈 Performance Summary\n\n';
  report += generatePerformanceTable(metrics, budget, deviceTier);
  report += '\n';

  // Detailed metrics
  report += generateDetailedMetrics(metrics);

  // Recommendations
  report += generateRecommendations(metrics, budget, deviceTier);

  // CI information
  report += generateCIInfo(metrics);

  // Footer
  report += '---\n';
  report += `*Report generated at ${timestamp}*\n`;
  report += `*Device tier: ${deviceTier} | Platform: ${platform}*\n`;

  return report;
}

/**
 * Check overall performance status
 */
function checkOverallStatus(metrics, budget, deviceTier) {
  const deviceBudget = budget.budgets;

  // Check cold start
  if (metrics.coldStart) {
    const budgetData = deviceBudget.coldStart;
    const maximum =
      budgetData.deviceTiers?.[deviceTier]?.maximum || budgetData.maximum.value;
    if (metrics.coldStart.duration > maximum) return false;
  }

  // Check navigation
  if (metrics.navigation) {
    const budgetData = deviceBudget.navigation;
    const maximum =
      budgetData.deviceTiers?.[deviceTier]?.maximum || budgetData.maximum.value;
    const duration =
      metrics.navigation.averageDuration || metrics.navigation.duration;
    if (duration > maximum) return false;
  }

  // Check memory
  if (metrics.memory) {
    const budgetData = deviceBudget.memory;
    const maximum =
      budgetData.deviceTiers?.[deviceTier]?.maximum || budgetData.maximum.value;
    const usage = metrics.memory.peakUsage || metrics.memory.usage;
    if (usage > maximum) return false;
  }

  return true;
}

/**
 * Main function
 */
function main() {
  if (!metricsFile) {
    console.error('❌ Error: --metrics parameter required');
    process.exit(1);
  }

  if (!fs.existsSync(metricsFile)) {
    console.error(`❌ Error: Metrics file not found: ${metricsFile}`);
    process.exit(1);
  }

  try {
    // Load data
    const metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
    const budget = loadPerformanceBudget();

    if (!budget) {
      console.error('❌ Error: Failed to load performance budget');
      process.exit(1);
    }

    // Generate report
    const report = generatePerformanceReport(
      metrics,
      budget,
      deviceTier,
      platform
    );

    // Output report
    if (outputFile) {
      fs.writeFileSync(outputFile, report);
      console.log(`📄 Performance report saved to: ${outputFile}`);
    } else {
      console.log(report);
    }
  } catch (error) {
    console.error('❌ Error generating report:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generatePerformanceReport,
  formatDuration,
  formatMemory,
  getPerformanceStatus,
};
