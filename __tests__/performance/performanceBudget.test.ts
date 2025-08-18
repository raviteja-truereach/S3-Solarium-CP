import {
  validateBudget,
  generateReport,
} from '../../scripts/validate-performance-budget';
import performanceBudget from '../../scripts/performance-budget.json';

describe('Performance Budget Validation', () => {
  const mockMetrics = {
    coldStart: 2500,
    navigation: 250,
    screenRender: 350,
    memory: 120 * 1024 * 1024, // 120MB in bytes
    apiResponse: 3500,
  };

  describe('validateBudget', () => {
    it('should pass all metrics within target', () => {
      const goodMetrics = {
        coldStart: 1500,
        navigation: 150,
        screenRender: 200,
        memory: 80 * 1024 * 1024,
        apiResponse: 2000,
      };

      const results = validateBudget(goodMetrics, performanceBudget, 'highEnd');

      expect(results.summary.failed).toBe(0);
      expect(results.summary.warnings).toBe(0);
      expect(results.summary.passed).toBeGreaterThan(0);
    });

    it('should generate warnings for metrics between target and maximum', () => {
      const warningMetrics = {
        coldStart: 2500, // Between target (2000) and max (3000)
        navigation: 250, // Between target (200) and max (300)
        screenRender: 400, // Between target (300) and max (500)
        memory: 130 * 1024 * 1024, // Between target and max
        apiResponse: 4000, // Between target (3000) and max (5000)
      };

      const results = validateBudget(warningMetrics, performanceBudget, 'ci');

      expect(results.summary.warnings).toBeGreaterThan(0);
      expect(results.summary.failed).toBe(0);
    });

    it('should fail metrics exceeding maximum', () => {
      const failingMetrics = {
        coldStart: 4000, // Exceeds max (3000)
        navigation: 400, // Exceeds max (300)
        screenRender: 600, // Exceeds max (500)
        memory: 200 * 1024 * 1024, // Exceeds max
        apiResponse: 6000, // Exceeds max (5000)
      };

      const results = validateBudget(failingMetrics, performanceBudget, 'ci');

      expect(results.summary.failed).toBeGreaterThan(0);
    });

    it('should adjust budgets for device tiers', () => {
      const metrics = { coldStart: 3200 };

      // Should fail for high-end (max 2000ms)
      const highEndResults = validateBudget(
        metrics,
        performanceBudget,
        'highEnd'
      );
      expect(highEndResults.summary.failed).toBe(1);

      // Should pass for minimum spec (max 3500ms)
      const minSpecResults = validateBudget(
        metrics,
        performanceBudget,
        'minimum'
      );
      expect(minSpecResults.summary.failed).toBe(0);
    });
  });

  describe('generateReport', () => {
    it('should generate markdown report with all sections', () => {
      const results = validateBudget(mockMetrics, performanceBudget, 'ci');
      const report = generateReport(results, 'ci', 'android');

      expect(report).toContain('# Performance Budget Validation Report');
      expect(report).toContain('## Summary');
      expect(report).toContain('Device Tier**: ci');
      expect(report).toContain('Platform**: android');
    });

    it('should include recommendations for failing metrics', () => {
      const failingMetrics = {
        coldStart: 4000,
        navigation: 400,
        memory: 200 * 1024 * 1024,
      };

      const results = validateBudget(failingMetrics, performanceBudget, 'ci');
      const report = generateReport(results, 'ci', 'android');

      expect(report).toContain('🔧 Recommendations');
      expect(report).toContain('Cold Start Optimization');
      expect(report).toContain('Navigation Optimization');
      expect(report).toContain('Memory Optimization');
    });
  });
});
