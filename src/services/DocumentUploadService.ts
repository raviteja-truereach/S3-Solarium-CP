import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import type { DocumentAsset } from '../types/document';
import type {
  UploadProgress,
  UploadOptions,
  UploadResult,
} from '../types/upload';
import { getFriendlyMessage } from '../utils/errorMessage';
import { DOCUMENT_VALIDATION_MESSAGES } from '../constants/strings';

/**
 * Document Upload Service
 * Handles file upload to Azure Blob Storage with progress tracking
 */
class DocumentUploadService {
  private static instance: DocumentUploadService;
  private activeUploads = new Map<string, XMLHttpRequest>();
  private progressThrottle = new Map<string, number>();

  static getInstance(): DocumentUploadService {
    if (!DocumentUploadService.instance) {
      DocumentUploadService.instance = new DocumentUploadService();
    }
    return DocumentUploadService.instance;
  }

  /**
   * Read file data from React Native URI as binary
   */
  private async readFileData(uri: string): Promise<ArrayBuffer> {
    try {
      let filePath = uri;

      // Handle different URI formats
      if (Platform.OS === 'android' && uri.startsWith('content://')) {
        // Android content URI - copy to cache first
        const fileName = `temp_${Date.now()}.tmp`;
        const cachePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
        await RNFS.copyFile(uri, cachePath);
        filePath = cachePath;
      } else if (uri.startsWith('file://')) {
        // Remove file:// prefix
        filePath = uri.replace('file://', '');
      }

      // Check if file exists
      const exists = await RNFS.exists(filePath);
      if (!exists) {
        throw new Error(DOCUMENT_VALIDATION_MESSAGES.FILE_NOT_FOUND);
      }

      // Read file as base64 first
      const base64Data = await RNFS.readFile(filePath, 'base64');

      // Convert base64 to ArrayBuffer using React Native compatible method
      const arrayBuffer = this.base64ToArrayBuffer(base64Data);

      // Clean up temp file if created
      if (Platform.OS === 'android' && uri.startsWith('content://')) {
        try {
          await RNFS.unlink(filePath);
        } catch (cleanupError) {
          console.warn('Warning: Failed to cleanup temp file:', cleanupError);
        }
      }

      return arrayBuffer;
    } catch (error) {
      console.error('❌ Error reading file data:', error);
      throw new Error(DOCUMENT_VALIDATION_MESSAGES.FILE_NOT_FOUND);
    }
  }

  /**
   * Convert base64 to ArrayBuffer (React Native compatible)
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    // Use Buffer if available (React Native has Buffer polyfill)
    if (typeof Buffer !== 'undefined') {
      const buffer = Buffer.from(base64, 'base64');
      return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
    }

    // Fallback: Manual base64 decoding
    const binaryString = this.base64Decode(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Manual base64 decode (React Native compatible)
   */
  private base64Decode(base64: string): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;

    base64 = base64.replace(/[^A-Za-z0-9+/]/g, '');

    while (i < base64.length) {
      const a = chars.indexOf(base64.charAt(i++));
      const b = chars.indexOf(base64.charAt(i++));
      const c = chars.indexOf(base64.charAt(i++));
      const d = chars.indexOf(base64.charAt(i++));

      const bitmap = (a << 18) | (b << 12) | (c << 6) | d;

      result += String.fromCharCode((bitmap >> 16) & 255);
      if (c !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
      if (d !== 64) result += String.fromCharCode(bitmap & 255);
    }

    return result;
  }

  /**
   * Create XMLHttpRequest for upload with progress tracking
   */
  private createXHRUpload(
    document: DocumentAsset,
    sasUrl: string,
    options: UploadOptions = {}
  ): XMLHttpRequest {
    const xhr = new XMLHttpRequest();
    const uploadId = document.id;

    // Configure request
    xhr.open('PUT', sasUrl, true);

    // Set required headers for Azure Blob Storage
    xhr.setRequestHeader('Content-Type', document.type);
    xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');

    // Set custom headers if provided
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }

    // Handle upload progress with throttling
    if (xhr.upload && options.onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const now = Date.now();
          const lastUpdate = this.progressThrottle.get(uploadId) || 0;

          // Throttle progress updates (max every 100ms)
          if (now - lastUpdate >= 100) {
            const progress: UploadProgress = {
              percent: Math.round((event.loaded / event.total) * 100),
              loaded: event.loaded,
              total: event.total,
              speed: this.calculateUploadSpeed(uploadId, event.loaded),
            };

            options.onProgress!(progress);
            this.progressThrottle.set(uploadId, now);
          }
        }
      };
    }

    // Handle abort signal
    if (options.abortSignal) {
      options.abortSignal.addEventListener('abort', () => {
        xhr.abort();
      });
    }

    // Store active upload
    this.activeUploads.set(uploadId, xhr);

    return xhr;
  }

  /**
   * Calculate upload speed
   */
  private calculateUploadSpeed(uploadId: string, loaded: number): number {
    const now = Date.now();
    const key = `${uploadId}_speed`;
    const lastData = this.progressThrottle.get(key);

    if (!lastData) {
      this.progressThrottle.set(key, now);
      return 0;
    }

    const timeDiff = (now - lastData) / 1000; // Convert to seconds
    const speed = loaded / timeDiff;

    return Math.round(speed);
  }

  /**
   * Detect SAS expiry error from XMLHttpRequest
   */
  private detectSasExpiryError(xhr: XMLHttpRequest): boolean {
    if (xhr.status === 403) {
      // Check response text for Azure-specific SAS expiry messages
      const responseText = xhr.responseText || '';
      return (
        responseText.includes('AuthenticationFailed') ||
        responseText.includes('AuthorizationFailure') ||
        responseText.includes('SignatureDoesNotMatch') ||
        xhr.status === 403
      );
    }
    return false;
  }

  /**
   * Upload file to Azure Blob Storage using SAS URL
   */
  async uploadToBlob(
    document: DocumentAsset,
    sasUrl: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const uploadId = document.id;
    const startTime = Date.now();

    try {
      console.log('📤 Starting upload for document:', document.fileName);

      // Read file data as binary
      const binaryData = await this.readFileData(document.uri);

      // Create XMLHttpRequest
      const xhr = this.createXHRUpload(document, sasUrl, options);

      // Upload with progress tracking
      const result = await new Promise<UploadResult>((resolve, reject) => {
        xhr.onreadystatechange = () => {
          if (xhr.readyState === XMLHttpRequest.DONE) {
            // Cleanup
            this.activeUploads.delete(uploadId);
            this.progressThrottle.delete(uploadId);
            this.progressThrottle.delete(`${uploadId}_speed`);

            const duration = Date.now() - startTime;

            if (xhr.status === 0) {
              // Request was aborted
              resolve({
                success: false,
                error: 'Upload cancelled',
                status: 0,
                duration,
              });
            } else if (xhr.status >= 200 && xhr.status < 300) {
              // Success
              console.log('✅ Upload completed successfully');
              resolve({
                success: true,
                status: xhr.status,
                duration,
              });
            } else {
              // Error
              let errorMessage: string;

              if (this.detectSasExpiryError(xhr)) {
                errorMessage = 'Upload token has expired. Please try again.';
              } else {
                errorMessage = getFriendlyMessage(xhr.status);
              }

              console.error('❌ Upload failed:', xhr.status, xhr.statusText);
              resolve({
                success: false,
                error: errorMessage,
                status: xhr.status,
                duration,
              });
            }
          }
        };

        xhr.onerror = () => {
          const duration = Date.now() - startTime;
          console.error('❌ Upload network error');

          this.activeUploads.delete(uploadId);
          this.progressThrottle.delete(uploadId);

          resolve({
            success: false,
            error: 'Network error occurred during upload',
            status: xhr.status,
            duration,
          });
        };

        xhr.ontimeout = () => {
          const duration = Date.now() - startTime;
          console.error('❌ Upload timeout');

          this.activeUploads.delete(uploadId);
          this.progressThrottle.delete(uploadId);

          resolve({
            success: false,
            error: 'Upload request timed out',
            status: xhr.status,
            duration,
          });
        };

        // Set timeout (30 seconds)
        xhr.timeout = 30000;

        // Send binary data
        xhr.send(binaryData);
      });

      return result;
    } catch (error: any) {
      // Cleanup on error
      this.activeUploads.delete(uploadId);
      this.progressThrottle.delete(uploadId);
      this.progressThrottle.delete(`${uploadId}_speed`);

      console.error('❌ Upload service error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload file',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Cancel active upload
   */
  cancelUpload(documentId: string): boolean {
    const xhr = this.activeUploads.get(documentId);
    if (xhr) {
      console.log('🛑 Cancelling upload for document:', documentId);
      xhr.abort();
      this.activeUploads.delete(documentId);
      this.progressThrottle.delete(documentId);
      this.progressThrottle.delete(`${documentId}_speed`);
      return true;
    }
    return false;
  }

  /**
   * Check if upload is active
   */
  isUploadActive(documentId: string): boolean {
    return this.activeUploads.has(documentId);
  }

  /**
   * Cancel all active uploads
   */
  cancelAllUploads(): void {
    console.log('🛑 Cancelling all active uploads');
    this.activeUploads.forEach((xhr, documentId) => {
      xhr.abort();
    });
    this.activeUploads.clear();
    this.progressThrottle.clear();
  }

  /**
   * Calculate progress percentage with precision
   */
  calculateProgress(loaded: number, total: number): number {
    if (total === 0) return 0;
    return Math.min(100, Math.round((loaded / total) * 100));
  }
}

// Export singleton instance
export const documentUploadService = DocumentUploadService.getInstance();

// Export individual functions for convenience
export const uploadToBlob = documentUploadService.uploadToBlob.bind(
  documentUploadService
);
export const cancelUpload = documentUploadService.cancelUpload.bind(
  documentUploadService
);
export const isUploadActive = documentUploadService.isUploadActive.bind(
  documentUploadService
);
export const calculateProgress = documentUploadService.calculateProgress.bind(
  documentUploadService
);

export default documentUploadService;
