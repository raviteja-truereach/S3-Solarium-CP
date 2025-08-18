import { Platform } from 'react-native';
// import {
//   manipulateAsync,
//   SaveFormat,
//   ImageResult,
// } from 'react-native-image-manipulator';
import RNImageManipulator from "@oguzhnatly/react-native-image-manipulator";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from './Logger';
import { PerformanceMonitor, PerformanceMetric } from './PerformanceMonitor';

/**
 * Image compression utility with performance optimization
 * Follows existing utility patterns for logging and performance monitoring
 */

export interface CompressionOptions {
  /** Quality factor (0.1-1.0) */
  quality?: number;
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** Target size in bytes */
  targetSize?: number;
  /** Compression format */
  format?: 'jpeg' | 'png';
}

export interface CompressedImage {
  /** Compressed image URI */
  uri: string;
  /** Original size in bytes */
  originalSize: number;
  /** Compressed size in bytes */
  compressedSize: number;
  /** Compression ratio (0-1) */
  compressionRatio: number;
  /** Whether compression was successful */
  success: boolean;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Original image dimensions */
  originalDimensions?: { width: number; height: number };
  /** Compressed image dimensions */
  compressedDimensions?: { width: number; height: number };
  /** Error message if compression failed */
  error?: string;
}

export interface CompressionMetrics {
  totalImages: number;
  successCount: number;
  failureCount: number;
  averageProcessingTime: number;
  averageCompressionRatio: number;
  totalTimeSaved: number;
}

class ImageCompressor {
  private readonly logger: Logger;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly COMPRESSION_THRESHOLD = 2 * 1024 * 1024; // 2MB
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly DEFAULT_QUALITY = 0.8;
  private readonly MAX_PROCESSING_TIME = 3000; // 3 seconds
  private readonly STORAGE_KEY = 'image_compression_metrics';

  constructor() {
    this.logger = new Logger('ImageCompressor');
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Compress a single image if it exceeds the threshold
   * @param uri - Image URI to compress
   * @param options - Compression options
   * @returns Promise resolving to compressed image data
   */
  async compressImage(
    uri: string,
    options: CompressionOptions = {}
  ): Promise<CompressedImage> {
    const startTime = Date.now();
    const metricName = `compress_image_${Date.now()}`;

    this.performanceMonitor.startMetric(metricName, {
      uri,
      options,
      platform: Platform.OS,
    });

    this.logger.info('Starting image compression', {
      uri,
      options,
      timestamp: startTime,
    });

    try {
      // Calculate original image size
      const originalSize = await this.calculateImageSize(uri);

      // Check if compression is needed
      if (!this.shouldCompress(originalSize)) {
        this.logger.info('Image compression skipped - below threshold', {
          uri,
          originalSize,
          threshold: this.COMPRESSION_THRESHOLD,
        });

        return {
          uri,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1,
          success: true,
          processingTime: Date.now() - startTime,
        };
      }

      // Perform compression
      const compressedResult = await this.performCompression(uri, options);
      const processingTime = Date.now() - startTime;

      // Check processing time constraint
      if (processingTime > this.MAX_PROCESSING_TIME) {
        this.logger.warn('Compression exceeded time limit', {
          uri,
          processingTime,
          maxTime: this.MAX_PROCESSING_TIME,
        });
      }

      const result: CompressedImage = {
        uri: compressedResult.uri,
        originalSize,
        compressedSize: await this.calculateImageSize(compressedResult.uri),
        compressionRatio: 0,
        success: true,
        processingTime,
        originalDimensions: {
          width: compressedResult.width,
          height: compressedResult.height,
        },
        compressedDimensions: {
          width: compressedResult.width,
          height: compressedResult.height,
        },
      };

      result.compressionRatio = result.compressedSize / result.originalSize;

      // Log performance metrics
      this.performanceMonitor.endMetric(metricName, {
        success: true,
        originalSize,
        compressedSize: result.compressedSize,
        compressionRatio: result.compressionRatio,
        processingTime,
      });

      // Store metrics for monitoring
      await this.storeCompressionMetrics(result);

      this.logger.info('Image compression completed successfully', {
        uri,
        originalSize,
        compressedSize: result.compressedSize,
        compressionRatio: result.compressionRatio,
        processingTime,
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error('Image compression failed', {
        uri,
        error: error.message,
        processingTime,
      });

      this.performanceMonitor.endMetric(metricName, {
        success: false,
        error: error.message,
        processingTime,
      });

      // Return original image on failure
      const originalSize = await this.calculateImageSize(uri).catch(() => 0);

      return {
        uri, // Return original URI
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        success: false,
        processingTime,
        error: error.message,
      };
    }
  }

  /**
   * Calculate image file size in bytes
   * @param uri - Image URI
   * @returns Promise resolving to file size in bytes
   */
  async calculateImageSize(uri: string): Promise<number> {
    try {
      // For file:// URIs, we need to estimate size
      // This is a simplified approach - in production, you might want to use react-native-fs
      const response = await fetch(uri);
      const blob = await response.blob();
      return blob.size;
    } catch (error) {
      this.logger.warn('Failed to calculate image size', {
        uri,
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Check if image should be compressed based on size
   * @param sizeInBytes - Image size in bytes
   * @returns True if compression is needed
   */
  shouldCompress(sizeInBytes: number): boolean {
    return (
      sizeInBytes > this.COMPRESSION_THRESHOLD &&
      sizeInBytes <= this.MAX_FILE_SIZE
    );
  }

  /**
   * Compress multiple images in batch
   * @param uris - Array of image URIs
   * @param options - Compression options
   * @returns Promise resolving to array of compressed images
   */
  async compressImageBatch(
    uris: string[],
    options: CompressionOptions = {}
  ): Promise<CompressedImage[]> {
    const batchStartTime = Date.now();
    const batchMetricName = `compress_batch_${Date.now()}`;

    this.performanceMonitor.startMetric(batchMetricName, {
      imageCount: uris.length,
      options,
    });

    this.logger.info('Starting batch image compression', {
      imageCount: uris.length,
      options,
    });

    const results: CompressedImage[] = [];

    for (const uri of uris) {
      const result = await this.compressImage(uri, options);
      results.push(result);
    }

    const batchProcessingTime = Date.now() - batchStartTime;
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    this.performanceMonitor.endMetric(batchMetricName, {
      imageCount: uris.length,
      successCount,
      failureCount,
      batchProcessingTime,
    });

    this.logger.info('Batch image compression completed', {
      imageCount: uris.length,
      successCount,
      failureCount,
      batchProcessingTime,
    });

    return results;
  }

  /**
   * Perform the actual compression using react-native-image-manipulator
   * @param uri - Image URI
   * @param options - Compression options
   * @returns Promise resolving to compressed image result
   */
  private async performCompression(
    uri: string,
    options: CompressionOptions
  ): Promise<any> {
    const {
      quality = this.DEFAULT_QUALITY,
      maxWidth = 1920,
      maxHeight = 1080,
      format = 'jpeg',
    } = options;

    const manipulateOptions = [];

    // Add resize if needed
    if (maxWidth && maxHeight) {
      manipulateOptions.push({
        resize: {
          width: maxWidth,
          height: maxHeight,
        },
      });
    }

    // Determine save format
    const saveFormat = format === 'png' ? 'png' : 'jpeg';

    return await RNImageManipulator.manipulate(uri, manipulateOptions, {
      compress: quality,
      format: saveFormat,
    });
  }

  /**
   * Store compression metrics for monitoring
   * @param result - Compression result
   */
  private async storeCompressionMetrics(
    result: CompressedImage
  ): Promise<void> {
    try {
      const existingMetrics = await this.getStoredMetrics();

      const updatedMetrics: CompressionMetrics = {
        totalImages: existingMetrics.totalImages + 1,
        successCount: existingMetrics.successCount + (result.success ? 1 : 0),
        failureCount: existingMetrics.failureCount + (result.success ? 0 : 1),
        averageProcessingTime:
          (existingMetrics.averageProcessingTime * existingMetrics.totalImages +
            result.processingTime) /
          (existingMetrics.totalImages + 1),
        averageCompressionRatio:
          (existingMetrics.averageCompressionRatio *
            existingMetrics.totalImages +
            result.compressionRatio) /
          (existingMetrics.totalImages + 1),
        totalTimeSaved:
          existingMetrics.totalTimeSaved +
          (result.originalSize - result.compressedSize),
      };

      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(updatedMetrics)
      );
    } catch (error) {
      this.logger.error('Failed to store compression metrics', {
        error: error.message,
      });
    }
  }

  /**
   * Get stored compression metrics
   * @returns Promise resolving to compression metrics
   */
  async getCompressionMetrics(): Promise<CompressionMetrics> {
    return await this.getStoredMetrics();
  }

  /**
   * Clear stored compression metrics
   */
  async clearCompressionMetrics(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      this.logger.info('Compression metrics cleared');
    } catch (error) {
      this.logger.error('Failed to clear compression metrics', {
        error: error.message,
      });
    }
  }

  /**
   * Get stored metrics with defaults
   * @returns Promise resolving to stored metrics
   */
  private async getStoredMetrics(): Promise<CompressionMetrics> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      this.logger.warn('Failed to retrieve stored metrics', {
        error: error.message,
      });
    }

    // Return default metrics
    return {
      totalImages: 0,
      successCount: 0,
      failureCount: 0,
      averageProcessingTime: 0,
      averageCompressionRatio: 0,
      totalTimeSaved: 0,
    };
  }
}

// Export singleton instance
export const imageCompressor = new ImageCompressor();

// Export individual functions for convenience
export const compressImage =
  imageCompressor.compressImage.bind(imageCompressor);
export const calculateImageSize =
  imageCompressor.calculateImageSize.bind(imageCompressor);
export const shouldCompress =
  imageCompressor.shouldCompress.bind(imageCompressor);
export const compressImageBatch =
  imageCompressor.compressImageBatch.bind(imageCompressor);
export const getCompressionMetrics =
  imageCompressor.getCompressionMetrics.bind(imageCompressor);
export const clearCompressionMetrics =
  imageCompressor.clearCompressionMetrics.bind(imageCompressor);
