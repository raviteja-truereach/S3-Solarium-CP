/**
 * File Upload Types and Interfaces
 */
import type { DocumentAsset } from './document';

export interface UploadProgress {
  /** Upload progress percentage (0-100) */
  percent: number;
  /** Bytes loaded */
  loaded: number;
  /** Total bytes */
  total: number;
  /** Upload speed in bytes per second */
  speed?: number;
}

export interface UploadState {
  /** Current upload progress */
  progress: UploadProgress;
  /** Whether upload is in progress */
  isUploading: boolean;
  /** Whether upload was cancelled */
  isCancelled: boolean;
  /** Whether upload completed successfully */
  isCompleted: boolean;
  /** Error message if upload failed */
  error: string | null;
  /** Upload start time */
  startTime?: number;
  /** Upload end time */
  endTime?: number;
}

export interface UploadOptions {
  /** Progress callback function */
  onProgress?: (progress: UploadProgress) => void;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
  /** Custom headers */
  headers?: Record<string, string>;
}

export interface UploadResult {
  /** Whether upload was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** HTTP status code */
  status?: number;
  /** Upload duration in milliseconds */
  duration?: number;
}
