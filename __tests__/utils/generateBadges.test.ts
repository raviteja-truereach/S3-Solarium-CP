/**
 * Coverage Badge Generator Tests
 * Tests badge generation utility functions
 */
import fs from 'fs';
import path from 'path';

// Import the functions to test
const {
  getCoverageColor,
  generateBadgeConfig,
  generateCoverageBadges,
  writeBadgeFile,
} = require('../../scripts/generate-badges.js');

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Coverage Badge Generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCoverageColor', () => {
    it('should return brightgreen for coverage >= 80%', () => {
      expect(getCoverageColor(100)).toBe('brightgreen');
      expect(getCoverageColor(90)).toBe('brightgreen');
      expect(getCoverageColor(80)).toBe('brightgreen');
    });

    it('should return yellow for coverage 60-79%', () => {
      expect(getCoverageColor(79)).toBe('yellow');
      expect(getCoverageColor(70)).toBe('yellow');
      expect(getCoverageColor(60)).toBe('yellow');
    });

    it('should return red for coverage < 60%', () => {
      expect(getCoverageColor(59)).toBe('red');
      expect(getCoverageColor(30)).toBe('red');
      expect(getCoverageColor(0)).toBe('red');
    });

    it('should handle edge cases', () => {
      expect(getCoverageColor(79.9)).toBe('yellow');
      expect(getCoverageColor(80.1)).toBe('brightgreen');
      expect(getCoverageColor(59.9)).toBe('red');
      expect(getCoverageColor(60.1)).toBe('yellow');
    });

    it('should handle negative numbers', () => {
      expect(getCoverageColor(-1)).toBe('red');
      expect(getCoverageColor(-100)).toBe('red');
    });

    it('should handle numbers over 100', () => {
      expect(getCoverageColor(150)).toBe('brightgreen');
    });
  });

  describe('generateBadgeConfig', () => {
    it('should generate correct badge config for high coverage', () => {
      const config = generateBadgeConfig('lines', 85);

      expect(config).toEqual({
        name: 'lines',
        value: 85,
        color: 'brightgreen',
        url: 'https://img.shields.io/badge/coverage%20lines-85%25-brightgreen',
      });
    });

    it('should generate correct badge config for medium coverage', () => {
      const config = generateBadgeConfig('functions', 65);

      expect(config).toEqual({
        name: 'functions',
        value: 65,
        color: 'yellow',
        url: 'https://img.shields.io/badge/coverage%20functions-65%25-yellow',
      });
    });

    it('should generate correct badge config for low coverage', () => {
      const config = generateBadgeConfig('branches', 45);

      expect(config).toEqual({
        name: 'branches',
        value: 45,
        color: 'red',
        url: 'https://img.shields.io/badge/coverage%20branches-45%25-red',
      });
    });

    it('should handle special characters in metric names', () => {
      const config = generateBadgeConfig('statements', 75);

      expect(config.url).toContain('coverage%20statements');
      expect(config.name).toBe('statements');
    });
  });

  describe('writeBadgeFile', () => {
    it('should write badge file with correct content', () => {
      const badgesDir = '/test/badges';
      const badgeConfig = {
        name: 'lines',
        value: 85,
        color: 'brightgreen',
        url: 'https://img.shields.io/badge/coverage%20lines-85%25-brightgreen',
      };

      writeBadgeFile(badgesDir, badgeConfig);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(badgesDir, 'lines.svg'),
        expect.stringContaining(
          'Badge URL: https://img.shields.io/badge/coverage%20lines-85%25-brightgreen'
        )
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Coverage: 85%')
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Color: brightgreen')
      );
    });
  });

  describe('generateCoverageBadges', () => {
    const mockCoverageData = {
      total: {
        lines: { pct: 85 },
        functions: { pct: 90 },
        branches: { pct: 75 },
        statements: { pct: 88 },
      },
    };

    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockCoverageData));
      mockFs.mkdirSync.mockImplementation(() => {});
      mockFs.writeFileSync.mockImplementation(() => {});
    });

    it('should generate badges for all coverage metrics', () => {
      const result = generateCoverageBadges(
        '/test/coverage.json',
        '/test/badges'
      );

      expect(result.badges).toHaveLength(5); // 4 metrics + overall
      expect(result.badges.map((b) => b.name)).toEqual([
        'lines',
        'functions',
        'branches',
        'statements',
        'overall',
      ]);
    });

    it('should calculate overall average correctly', () => {
      const result = generateCoverageBadges(
        '/test/coverage.json',
        '/test/badges'
      );

      // (85 + 90 + 75 + 88) / 4 = 84.5, rounded = 85
      expect(result.summary.overallAverage).toBe(85);
    });

    it('should create badges directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);

      generateCoverageBadges('/test/coverage.json', '/test/badges');

      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/badges', {
        recursive: true,
      });
    });

    it('should exit with error if coverage file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      expect(() => {
        generateCoverageBadges('/nonexistent/coverage.json', '/test/badges');
      }).toThrow('process.exit called');

      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
    });

    it('should write all badge files', () => {
      generateCoverageBadges('/test/coverage.json', '/test/badges');

      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(5); // 4 metrics + overall
    });
  });
});
