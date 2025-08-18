/**
 * Documents module exports
 * Centralizes all document-related component exports
 */

// Mock service re-export
export { documentMockService } from '../../services/mocks/documentMockService';

// Types re-exports for convenience
export type {
  DocumentAsset,
  DocumentValidationResult,
  DocumentUploadState,
  CompressionOptions,
  CompressedImage,
  PickerOptions,
  PermissionStatus,
  DocumentSource,
  DocumentUploadScreenProps,
} from '../../types/document';

// Constants re-exports
export {
  MAX_FILE_SIZE,
  MAX_DOCUMENT_COUNT,
  COMPRESSION_THRESHOLD,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_DOCUMENT_TYPES,
  FILE_EXTENSIONS,
  COMPRESSION_OPTIONS,
  DOCUMENT_ERROR_MESSAGES,
  DOCUMENT_TYPE_LABELS,
  PICKER_CONFIG,
} from '../../constants/document';

// ADD to existing exports
export { DocumentThumbnail } from './DocumentThumbnail';
export { DocumentGrid } from './DocumentGrid';
export type { DocumentThumbnailProps } from './DocumentThumbnail';
export type { DocumentGridProps } from './DocumentGrid';
