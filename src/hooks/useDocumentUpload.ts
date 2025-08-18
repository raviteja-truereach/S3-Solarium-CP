/**
 * Use Document Upload Hook
 * Enhanced with retry logic and failure tracking
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { DocumentAsset } from '../types/document';
import type {
  UploadState,
  UploadProgress,
  UploadResult,
} from '../types/upload';
import { documentUploadService } from '../services/DocumentUploadService';

export interface DocumentUploadHook {
  /** Current upload state */
  uploadState: UploadState;
  /** Start upload with SAS URL */
  startUpload: (
    document: DocumentAsset,
    sasUrl: string
  ) => Promise<UploadResult>;
  /** Cancel current upload */
  cancelUpload: () => void;
  /** Reset upload state */
  resetUpload: () => void;
  /** Whether upload can be cancelled */
  canCancel: boolean;
  /** Current retry attempt count */
  retryCount: number;
  /** Whether retry limit has been reached */
  maxRetriesReached: boolean;
  /** Reset retry counter manually */
  resetRetryCounter: () => void;
}

interface RetryState {
  consecutiveFailures: number;
  lastFailureTime: number | null;
  isRetrying: boolean;
}

const initialUploadState: UploadState = {
  progress: {
    percent: 0,
    loaded: 0,
    total: 0,
  },
  isUploading: false,
  isCancelled: false,
  isCompleted: false,
  error: null,
};

const initialRetryState: RetryState = {
  consecutiveFailures: 0,
  lastFailureTime: null,
  isRetrying: false,
};

const MAX_RETRY_ATTEMPTS = 2;

/**
 * Use Document Upload Hook with Retry Logic
 */
export const useDocumentUpload = (): DocumentUploadHook => {
  const [uploadState, setUploadState] =
    useState<UploadState>(initialUploadState);
  const [retryState, setRetryState] = useState<RetryState>(initialRetryState);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(
    null
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  /**
   * Track retry attempt and check if max retries reached
   * @returns true if retry is allowed, false if max retries reached
   */
  const trackRetryAttempt = useCallback((): boolean => {
    console.log(
      '🔄 Tracking retry attempt, current failures:',
      retryState.consecutiveFailures
    );

    if (retryState.consecutiveFailures >= MAX_RETRY_ATTEMPTS) {
      console.warn('❌ Maximum retry attempts reached');
      return false;
    }

    setRetryState((prev) => ({
      ...prev,
      consecutiveFailures: prev.consecutiveFailures + 1,
      lastFailureTime: Date.now(),
      isRetrying: true,
    }));

    return true;
  }, [retryState.consecutiveFailures]);

  /**
   * Reset retry counter on success or manual reset
   */
  const resetRetryCounter = useCallback(() => {
    console.log('✅ Resetting retry counter');
    setRetryState(initialRetryState);
  }, []);

  /**
   * Handle upload progress updates
   */
  const handleProgress = useCallback((progress: UploadProgress) => {
    setUploadState((prev) => ({
      ...prev,
      progress,
    }));
  }, []);

  /**
   * Start document upload with retry logic
   */
  const startUpload = useCallback(
    async (document: DocumentAsset, sasUrl: string): Promise<UploadResult> => {
      console.log('🚀 Starting upload for:', document.fileName);

      // Check if max retries reached
      if (
        retryState.consecutiveFailures >= MAX_RETRY_ATTEMPTS &&
        !retryState.isRetrying
      ) {
        const errorMessage = `Upload failed after ${MAX_RETRY_ATTEMPTS} attempts. Please reset and try again.`;
        console.error('❌ Max retries reached:', errorMessage);

        return {
          success: false,
          error: errorMessage,
          duration: 0,
        };
      }

      // Reset state
      setCurrentDocumentId(document.id);
      startTimeRef.current = Date.now();

      // Create abort controller
      abortControllerRef.current = new AbortController();

      // Set initial upload state
      setUploadState({
        progress: {
          percent: 0,
          loaded: 0,
          total: document.fileSize,
        },
        isUploading: true,
        isCancelled: false,
        isCompleted: false,
        error: null,
        startTime: startTimeRef.current,
      });

      // Clear retry flag
      setRetryState((prev) => ({ ...prev, isRetrying: false }));

      try {
        // Start upload with progress tracking
        const result = await documentUploadService.uploadToBlob(
          document,
          sasUrl,
          {
            onProgress: handleProgress,
            abortSignal: abortControllerRef.current.signal,
          }
        );

        const endTime = Date.now();

        if (result.success) {
          // Upload completed successfully - reset retry counter
          resetRetryCounter();

          setUploadState((prev) => ({
            ...prev,
            isUploading: false,
            isCompleted: true,
            endTime,
            progress: {
              ...prev.progress,
              percent: 100,
            },
          }));

          console.log('✅ Upload completed successfully');
        } else {
          // Upload failed - track retry attempt
          const isCancelled = result.error === 'Upload cancelled';

          if (!isCancelled) {
            const canRetry = trackRetryAttempt();
            console.log('❌ Upload failed, can retry:', canRetry);
          }

          setUploadState((prev) => ({
            ...prev,
            isUploading: false,
            isCancelled,
            error: result.error || 'Upload failed',
            endTime,
          }));

          if (isCancelled) {
            console.log('🛑 Upload was cancelled');
          } else {
            console.error('❌ Upload failed:', result.error);
          }
        }

        return result;
      } catch (error: any) {
        const endTime = Date.now();

        // Track retry attempt for exceptions
        const canRetry = trackRetryAttempt();
        console.log('❌ Upload exception, can retry:', canRetry);

        setUploadState((prev) => ({
          ...prev,
          isUploading: false,
          error: error.message || 'Upload failed',
          endTime,
        }));

        console.error('❌ Upload hook error:', error);
        return {
          success: false,
          error: error.message || 'Upload failed',
          duration: endTime - startTimeRef.current,
        };
      } finally {
        // Cleanup
        setCurrentDocumentId(null);
        abortControllerRef.current = null;
      }
    },
    [
      handleProgress,
      retryState.consecutiveFailures,
      retryState.isRetrying,
      trackRetryAttempt,
      resetRetryCounter,
    ]
  );

  /**
   * Cancel current upload
   */
  const cancelUpload = useCallback(() => {
    if (currentDocumentId && uploadState.isUploading) {
      console.log('🛑 Cancelling upload via hook');

      // Abort via AbortController
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Also cancel via service (backup)
      documentUploadService.cancelUpload(currentDocumentId);

      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        isCancelled: true,
        error: 'Upload cancelled by user',
        endTime: Date.now(),
      }));
    }
  }, [currentDocumentId, uploadState.isUploading]);

  /**
   * Reset upload state
   */
  const resetUpload = useCallback(() => {
    console.log('🔄 Resetting upload state');

    // Cancel any active upload first
    if (uploadState.isUploading) {
      cancelUpload();
    }

    setUploadState(initialUploadState);
    setCurrentDocumentId(null);
    abortControllerRef.current = null;
    startTimeRef.current = 0;
  }, [uploadState.isUploading, cancelUpload]);

  /**
   * Whether upload can be cancelled
   */
  const canCancel = uploadState.isUploading && !uploadState.isCancelled;

  // Computed properties
  const maxRetriesReached =
    retryState.consecutiveFailures >= MAX_RETRY_ATTEMPTS;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentDocumentId && uploadState.isUploading) {
        documentUploadService.cancelUpload(currentDocumentId);
      }
    };
  }, [currentDocumentId, uploadState.isUploading]);

  return {
    uploadState,
    startUpload,
    cancelUpload,
    resetUpload,
    canCancel,
    retryCount: retryState.consecutiveFailures,
    maxRetriesReached,
    resetRetryCounter,
  };
};

export default useDocumentUpload;
