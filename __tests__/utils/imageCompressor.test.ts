// Mock AsyncStorage first, before any other imports
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-image-manipulator
jest.mock('react-native-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
  },
}));

// Mock Logger and PerformanceMonitor
jest.mock('../../src/utils/Logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('../../src/utils/PerformanceMonitor', () => ({
  PerformanceMonitor: jest.fn().mockImplementation(() => ({
    startMetric: jest.fn(),
    endMetric: jest.fn(),
  })),
}));

import {
  compressImage,
  calculateImageSize,
  shouldCompress,
  compressImageBatch,
  getCompressionMetrics,
  clearCompressionMetrics,
} from '../../src/utils/imageCompressor';

// Get mocked modules
const mockAsyncStorage = require('@react-native-async-storage/async-storage');
const mockManipulateAsync =
  require('react-native-image-manipulator').manipulateAsync;

// Mock fetch for image size calculation
global.fetch = jest.fn();

describe('ImageCompressor', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default fetch mock for image size calculation
    (global.fetch as jest.Mock).mockResolvedValue({
      blob: () => Promise.resolve({ size: 1024 * 1024 * 3 }), // 3MB
    });

    // Setup default manipulateAsync mock
    mockManipulateAsync.mockResolvedValue({
      uri: 'file://compressed.jpg',
      width: 1920,
      height: 1080,
    });
  });

  describe('shouldCompress', () => {
    it('should return true for files larger than 2MB', () => {
      const size = 3 * 1024 * 1024; // 3MB
      expect(shouldCompress(size)).toBe(true);
    });

    it('should return false for files smaller than 2MB', () => {
      const size = 1 * 1024 * 1024; // 1MB
      expect(shouldCompress(size)).toBe(false);
    });

    it('should return false for files larger than 10MB', () => {
      const size = 11 * 1024 * 1024; // 11MB
      expect(shouldCompress(size)).toBe(false);
    });
  });

  describe('calculateImageSize', () => {
    it('should calculate image size correctly', async () => {
      const mockSize = 2 * 1024 * 1024; // 2MB
      (global.fetch as jest.Mock).mockResolvedValue({
        blob: () => Promise.resolve({ size: mockSize }),
      });

      const size = await calculateImageSize('file://test.jpg');
      expect(size).toBe(mockSize);
    });

    it('should return 0 on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const size = await calculateImageSize('file://test.jpg');
      expect(size).toBe(0);
    });
  });

  describe('compressImage', () => {
    it('should skip compression for small images', async () => {
      // Mock small image (1MB)
      (global.fetch as jest.Mock).mockResolvedValue({
        blob: () => Promise.resolve({ size: 1024 * 1024 }),
      });

      const result = await compressImage('file://small.jpg');

      expect(result.success).toBe(true);
      expect(result.compressionRatio).toBe(1);
      expect(mockManipulateAsync).not.toHaveBeenCalled();
    });

    it('should compress large images successfully', async () => {
      // Mock large image (5MB original, 1.5MB compressed)
      const originalSize = 5 * 1024 * 1024;
      const compressedSize = 1.5 * 1024 * 1024;

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          blob: () => Promise.resolve({ size: originalSize }),
        })
        .mockResolvedValueOnce({
          blob: () => Promise.resolve({ size: compressedSize }),
        });

      const result = await compressImage('file://large.jpg');

      expect(result.success).toBe(true);
      expect(result.originalSize).toBe(originalSize);
      expect(result.compressedSize).toBe(compressedSize);
      expect(result.compressionRatio).toBe(compressedSize / originalSize);
      expect(mockManipulateAsync).toHaveBeenCalled();
    });

    it('should handle compression errors gracefully', async () => {
      // Mock large image
      (global.fetch as jest.Mock).mockResolvedValue({
        blob: () => Promise.resolve({ size: 5 * 1024 * 1024 }),
      });

      mockManipulateAsync.mockRejectedValue(new Error('Compression failed'));

      const result = await compressImage('file://error.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Compression failed');
      expect(result.compressionRatio).toBe(1);
    });

    it('should use custom compression options', async () => {
      // Mock large image
      (global.fetch as jest.Mock).mockResolvedValue({
        blob: () => Promise.resolve({ size: 5 * 1024 * 1024 }),
      });

      const options = {
        quality: 0.7,
        maxWidth: 1600,
        maxHeight: 900,
        format: 'png' as const,
      };

      await compressImage('file://test.jpg', options);

      expect(mockManipulateAsync).toHaveBeenCalledWith(
        'file://test.jpg',
        [{ resize: { width: 1600, height: 900 } }],
        {
          compress: 0.7,
          format: 'png',
          base64: false,
        }
      );
    });
  });

  describe('compressImageBatch', () => {
    it('should compress multiple images', async () => {
      const uris = [
        'file://image1.jpg',
        'file://image2.jpg',
        'file://image3.jpg',
      ];

      // Mock small images to skip compression
      (global.fetch as jest.Mock).mockResolvedValue({
        blob: () => Promise.resolve({ size: 1024 * 1024 }),
      });

      const results = await compressImageBatch(uris);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
    });
  });

  describe('compression metrics', () => {
    beforeEach(() => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();
      mockAsyncStorage.removeItem.mockResolvedValue();
    });

    it('should store compression metrics', async () => {
      // Mock large image that needs compression
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          blob: () => Promise.resolve({ size: 3 * 1024 * 1024 }),
        })
        .mockResolvedValueOnce({
          blob: () => Promise.resolve({ size: 1.5 * 1024 * 1024 }),
        });

      await compressImage('file://test.jpg');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'image_compression_metrics',
        expect.stringContaining('totalImages')
      );
    });

    it('should get compression metrics with defaults', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const metrics = await getCompressionMetrics();

      expect(metrics.totalImages).toBe(0);
      expect(metrics.successCount).toBe(0);
      expect(metrics.failureCount).toBe(0);
    });

    it('should get stored compression metrics', async () => {
      const mockMetrics = {
        totalImages: 5,
        successCount: 4,
        failureCount: 1,
        averageProcessingTime: 1200,
        averageCompressionRatio: 0.6,
        totalTimeSaved: 1024 * 1024 * 10,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockMetrics));

      const metrics = await getCompressionMetrics();
      expect(metrics).toEqual(mockMetrics);
    });

    it('should clear compression metrics', async () => {
      await clearCompressionMetrics();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        'image_compression_metrics'
      );
    });
  });
});
