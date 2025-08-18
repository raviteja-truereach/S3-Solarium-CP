// Mock dependencies at the top
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockImplementation(async (uri: string) => {
    // Simulate compression time based on image size
    const delay = Math.random() * 1000 + 500; // 500ms - 1.5s
    await new Promise((resolve) => setTimeout(resolve, delay));

    return {
      uri: uri.replace('.jpg', '_compressed.jpg'),
      width: 1920,
      height: 1080,
    };
  }),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
  },
}));

// Mock performance and types
jest.mock('../../src/services/PerformanceObserver', () => ({
  default: {
    initialize: jest.fn(),
    cleanup: jest.fn(),
  },
}));

jest.mock('../../src/types/performance', () => ({
  MemoryMetric: {},
}));

import {
  compressImage,
  compressImageBatch,
  clearCompressionMetrics,
} from '../../src/utils/imageCompressor';

describe('Image Compression Performance Tests', () => {
  const deviceTier = process.env.DEVICE_TIER || 'minimum';
  const platform = process.env.PLATFORM || 'android';

  let testResults = {
    peakUsage: 0,
    averageUsage: 0,
    memoryLeaks: false,
    success: false,
    averageCompressionTime: 0,
    maxCompressionTime: 0,
    compressionRatio: 0,
    throughput: 0,
  };

  beforeAll(async () => {
    // Clear previous metrics
    await clearCompressionMetrics();

    // Mock fetch for various image sizes
    global.fetch = jest.fn();
  });

  beforeEach(() => {
    testResults = {
      peakUsage: 0,
      averageUsage: 0,
      memoryLeaks: false,
      success: false,
      averageCompressionTime: 0,
      maxCompressionTime: 0,
      compressionRatio: 0,
      throughput: 0,
    };
  });

  describe('Single Image Compression Performance', () => {
    const testCases = [
      { name: '1MB Image', size: 1024 * 1024, expectedTime: 500 },
      { name: '2MB Image', size: 2 * 1024 * 1024, expectedTime: 1000 },
      { name: '5MB Image', size: 5 * 1024 * 1024, expectedTime: 2000 },
    ];

    testCases.forEach(({ name, size, expectedTime }) => {
      it(`should compress ${name} within performance budget`, async () => {
        // Mock image size
        (global.fetch as jest.Mock).mockResolvedValue({
          blob: () => Promise.resolve({ size }),
        });

        const startTime = Date.now();
        const result = await compressImage(`file://test_${size}.jpg`);
        const endTime = Date.now();
        const processingTime = endTime - startTime;

        // Performance assertions
        expect(processingTime).toBeLessThan(expectedTime);
        expect(result.success).toBe(true);

        testResults.success = true;
        testResults.averageCompressionTime = processingTime;

        console.log(`${name} Performance:`, {
          processingTime,
          compressionRatio: result.compressionRatio,
          deviceTier,
          platform,
        });
      });
    });
  });

  describe('Batch Compression Performance', () => {
    it('should handle batch compression efficiently', async () => {
      const imageCount = 3; // Reduced for faster tests
      const imageSize = 2 * 1024 * 1024; // 2MB each
      const uris = Array.from(
        { length: imageCount },
        (_, i) => `file://batch_${i}.jpg`
      );

      // Mock image sizes
      (global.fetch as jest.Mock).mockResolvedValue({
        blob: () => Promise.resolve({ size: imageSize }),
      });

      const startTime = Date.now();
      const results = await compressImageBatch(uris);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Performance assertions
      expect(totalTime).toBeLessThan(5000); // 5 seconds max for 3 images
      expect(results).toHaveLength(imageCount);

      const averageTimePerImage = totalTime / imageCount;
      const throughput = imageCount / (totalTime / 1000); // images per second

      testResults.averageCompressionTime = averageTimePerImage;
      testResults.throughput = throughput;

      console.log('Batch Compression Performance:', {
        totalTime,
        averageTimePerImage,
        throughput: `${throughput.toFixed(2)} images/sec`,
        deviceTier,
        platform,
      });
    });
  });

  describe('Performance Budget Validation', () => {
    it('should stay within performance budget', async () => {
      const budget = {
        maxProcessingTime: 3000, // 3 seconds
      };

      // Test with 5MB image
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          blob: () => Promise.resolve({ size: 5 * 1024 * 1024 }),
        })
        .mockResolvedValueOnce({
          blob: () => Promise.resolve({ size: 1.5 * 1024 * 1024 }),
        });

      const startTime = Date.now();
      const result = await compressImage('file://budget_test.jpg');
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Budget assertions
      expect(processingTime).toBeLessThan(budget.maxProcessingTime);

      testResults.success = true;
      testResults.averageCompressionTime = processingTime;
      testResults.compressionRatio = result.compressionRatio;

      console.log('Performance Budget Validation:', {
        processingTime: `${processingTime}ms (budget: ${budget.maxProcessingTime}ms)`,
        compressionRatio: `${(result.compressionRatio * 100).toFixed(1)}%`,
        withinBudget: true,
        deviceTier,
        platform,
      });
    });
  });
});
