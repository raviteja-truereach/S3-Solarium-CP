/**
 * Feature Flag Configuration
 * Centralized feature flag management for build-time configuration
 */
import { ENABLE_DOCUMENT_UPLOAD } from './Config';

/**
 * Check if document upload feature is enabled
 * @returns true if document upload is enabled, false otherwise
 */
export function isDocumentUploadEnabled(): boolean {
  return ENABLE_DOCUMENT_UPLOAD;
}

/**
 * Get feature flag configuration for document upload
 */
export const DocumentUploadFeature = {
  enabled: ENABLE_DOCUMENT_UPLOAD,

  /**
   * Get user-friendly message when feature is disabled
   */
  getDisabledMessage(): string {
    return 'Document upload is currently unavailable. Please try again later.';
  },

  /**
   * Get accessibility label when feature is disabled
   */
  getDisabledAccessibilityLabel(): string {
    return 'Document upload feature is disabled';
  },
} as const;

export default {
  isDocumentUploadEnabled,
  DocumentUploadFeature,
};
