/**
 * Document handling constants
 * Defines limits, supported types, and configuration for document upload
 */

/** Maximum file size in bytes (10MB) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Maximum number of documents per lead */
export const MAX_DOCUMENT_COUNT = 7;

/** File size threshold for compression (2MB) */
export const COMPRESSION_THRESHOLD = 2 * 1024 * 1024;

/** Supported image types */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
] as const;

/** Supported document types */
export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  ...SUPPORTED_IMAGE_TYPES,
] as const;

/** File extensions mapping */
export const FILE_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
} as const;

/** Compression options */
export const COMPRESSION_OPTIONS = {
  /** Default quality factor */
  DEFAULT_QUALITY: 0.8,
  /** Maximum width for compressed images */
  MAX_WIDTH: 1920,
  /** Maximum height for compressed images */
  MAX_HEIGHT: 1080,
  /** Target size for compression */
  TARGET_SIZE: 1.5 * 1024 * 1024, // 1.5MB
} as const;

/** Error messages */
export const DOCUMENT_ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'File size must be less than 10MB',
  UNSUPPORTED_TYPE: 'Only JPEG, PNG, and PDF files are supported',
  MAX_DOCUMENTS_EXCEEDED: 'Maximum 7 documents allowed per lead',
  PERMISSION_DENIED: 'Permission required to access camera/gallery',
  COMPRESSION_FAILED: 'Failed to compress image',
  INVALID_FILE: 'Invalid or corrupted file',
  NETWORK_ERROR: 'Check your internet connection',
  UNKNOWN_ERROR: 'An unexpected error occurred',
} as const;

/** Document type labels for UI */
export const DOCUMENT_TYPE_LABELS = {
  'image/jpeg': 'JPEG Image',
  'image/jpg': 'JPEG Image',
  'image/png': 'PNG Image',
  'application/pdf': 'PDF Document',
} as const;

/** Picker configuration */
export const PICKER_CONFIG = {
  /** Image picker options */
  IMAGE_OPTIONS: {
    mediaType: 'photo' as const,
    includeBase64: false,
    maxHeight: 2000,
    maxWidth: 2000,
    quality: 0.8,
  },
  /** Document picker options */
  DOCUMENT_OPTIONS: {
    type: ['application/pdf'],
    allowMultiSelection: true,
    copyTo: 'documentDirectory',
  },
} as const;

/** Magic bytes for file type detection */
export const MAGIC_BYTES = {
  JPEG: [0xff, 0xd8, 0xff],
  PNG: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  PDF: [0x25, 0x50, 0x44, 0x46], // %PDF
} as const;

/** File extension to magic byte mapping */
export const EXTENSION_TO_MAGIC = {
  '.jpg': 'JPEG',
  '.jpeg': 'JPEG',
  '.png': 'PNG',
  '.pdf': 'PDF',
} as const;
