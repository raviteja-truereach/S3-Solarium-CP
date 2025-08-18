import PerformanceObserver from '../../src/services/PerformanceObserver';
import { MemoryMetric } from '../../src/types/performance';

describe('Memory Performance Tests', () => {
  const deviceTier = process.env.DEVICE_TIER || 'minimum';
  const platform = process.env.PLATFORM || 'android';

  let memoryMetrics: MemoryMetric[] = [];
  let testResults = {
    peakUsage: 0,
    averageUsage: 0,
    memoryLeaks: false,
    success: false,
  };

  beforeAll(async () => {
    // Initialize performance observer
    PerformanceObserver.initialize({
      enableMemoryTracking: true,
      memoryTrackingInterval: 1000, // 1 second for testing
    });
  });

  describe(`${deviceTier} device tier`, () => {
    it('should track memory usage during normal operations', async () => {
      const duration = 30000; // 30 seconds
      const sampleInterval = 2000; // 2 seconds
      const samples = Math.floor(duration / sampleInterval);

      console.log(`🧠 Starting memory tracking for ${duration}ms...`);

      for (let i = 0; i < samples; i++) {
        try {
          const memoryMetric = await PerformanceObserver.getMemoryUsage();
          memoryMetrics.push(memoryMetric);

          console.log(
            `Memory sample ${i + 1}: ${(
              memoryMetric.usedMemory /
              1024 /
              1024
            ).toFixed(2)}MB`
          );

          // Simulate some app activity
          await simulateAppActivity();

          await new Promise((resolve) => setTimeout(resolve, sampleInterval));
        } catch (error) {
          console.error(`Memory sampling failed at iteration ${i}:`, error);
        }
      }

      // Calculate results
      if (memoryMetrics.length > 0) {
        const usedMemoryValues = memoryMetrics.map((m) => m.usedMemory);
        testResults.peakUsage = Math.max(...usedMemoryValues);
        testResults.averageUsage = Math.round(
          usedMemoryValues.reduce((a, b) => a + b, 0) / usedMemoryValues.length
        );
        testResults.success = true;

        // Check for memory leaks (simple heuristic)
        const firstHalf = usedMemoryValues.slice(
          0,
          Math.floor(usedMemoryValues.length / 2)
        );
        const secondHalf = usedMemoryValues.slice(
          Math.floor(usedMemoryValues.length / 2)
        );
        const firstHalfAvg =
          firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondHalfAvg =
          secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        // If memory usage increased by more than 20% between first and second half, flag as potential leak
        testResults.memoryLeaks =
          (secondHalfAvg - firstHalfAvg) / firstHalfAvg > 0.2;

        console.log(`📊 Memory Results:`);
        console.log(
          `  Peak Usage: ${(testResults.peakUsage / 1024 / 1024).toFixed(2)}MB`
        );
        console.log(
          `  Average Usage: ${(testResults.averageUsage / 1024 / 1024).toFixed(
            2
          )}MB`
        );
        console.log(
          `  Potential Memory Leaks: ${testResults.memoryLeaks ? 'Yes' : 'No'}`
        );
      }

      expect(memoryMetrics.length).toBeGreaterThan(0);
    }, 60000); // 1 minute timeout

    it('should validate memory usage against device tier budget', () => {
      if (!testResults.success) {
        console.log(
          '⏭️ Skipping budget validation due to memory tracking failure'
        );
        return;
      }

      // Device tier specific thresholds (in bytes)
      const budgets = {
        minimum: { target: 83886080, maximum: 125829120 }, // 80MB target, 120MB max
        'high-end': { target: 134217728, maximum: 201326592 }, // 128MB target, 192MB max
        ci: { target: 104857600, maximum: 157286400 }, // 100MB target, 150MB max
      };

      const budget = budgets[deviceTier as keyof typeof budgets] || budgets.ci;

      console.log(`🎯 Validating against ${deviceTier} budget:`);
      console.log(`  Target: ${(budget.target / 1024 / 1024).toFixed(0)}MB`);
      console.log(`  Maximum: ${(budget.maximum / 1024 / 1024).toFixed(0)}MB`);
      console.log(
        `  Actual Peak: ${(testResults.peakUsage / 1024 / 1024).toFixed(2)}MB`
      );

      // Validate against budget
      expect(testResults.peakUsage).toBeLessThanOrEqual(budget.maximum);

      if (testResults.peakUsage > budget.target) {
        console.warn(`⚠️  Memory usage exceeds target but within maximum`);
      }

      if (testResults.memoryLeaks) {
        console.warn(`⚠️  Potential memory leaks detected`);
      }
    });
  });

  afterAll(async () => {
    // Save results for CI
    const fs = require('fs');
    const path = require('path');

    const outputDir =
      process.env.PERFORMANCE_OUTPUT_DIR || 'reports/performance';
    const outputFile = path.join(outputDir, 'memory-results.json');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const results = {
      ...testResults,
      samples: memoryMetrics.length,
      duration: memoryMetrics.length * 2000, // Approximate duration
      timestamp: new Date().toISOString(),
      deviceTier,
      platform,
      details: {
        memoryPressureDistribution:
          getMemoryPressureDistribution(memoryMetrics),
        memoryTrend: getMemoryTrend(memoryMetrics),
      },
    };

    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`📄 Memory results saved to: ${outputFile}`);
  });
});

/**
 * Simulate typical app activity to generate realistic memory usage
 */
async function simulateAppActivity() {
  // Create some temporary objects to simulate normal app usage
  const tempData = [];
  for (let i = 0; i < 100; i++) {
    tempData.push({
      id: i,
      data: new Array(1000).fill(Math.random()),
      timestamp: new Date(),
    });
  }

  // Process the data
  tempData.forEach((item) => {
    item.processed = item.data.reduce((a, b) => a + b, 0);
  });

  // Clean up (most objects will be garbage collected)
  tempData.length = 0;
}

/**
 * Analyze memory pressure distribution
 */
function getMemoryPressureDistribution(metrics: MemoryMetric[]) {
  const distribution = { low: 0, moderate: 0, high: 0, critical: 0 };

  metrics.forEach((metric) => {
    distribution[metric.memoryPressure]++;
  });

  return distribution;
}

/**
 * Analyze memory usage trend
 */
function getMemoryTrend(metrics: MemoryMetric[]) {
  if (metrics.length < 2) return 'stable';

  const firstQuarter = metrics.slice(0, Math.floor(metrics.length / 4));
  const lastQuarter = metrics.slice(-Math.floor(metrics.length / 4));

  const firstAvg =
    firstQuarter.reduce((sum, m) => sum + m.usedMemory, 0) /
    firstQuarter.length;
  const lastAvg =
    lastQuarter.reduce((sum, m) => sum + m.usedMemory, 0) / lastQuarter.length;

  const change = (lastAvg - firstAvg) / firstAvg;

  if (change > 0.1) return 'increasing';
  if (change < -0.1) return 'decreasing';
  return 'stable';
}
