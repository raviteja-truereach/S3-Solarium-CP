/**
 * Document handling types for the Channel Partner app
 * Defines interfaces for document upload, validation, and management
 */

export interface DocumentAsset {
  /** Unique identifier for the document */
  id: string;
  /** Local file URI */
  uri: string;
  /** Original filename */
  fileName: string;
  /** File type (image/jpeg, image/png, application/pdf) */
  type: string;
  /** File size in bytes */
  fileSize: number;
  /** Timestamp when document was selected */
  timestamp: number;
  /** Compressed URI (for images) */
  compressedUri?: string;
  /** Whether the document has been compressed */
  isCompressed?: boolean;
}

export interface DocumentValidationResult {
  /** Whether the document is valid */
  isValid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Field that failed validation */
  field?: 'fileSize' | 'fileType' | 'documentCount' | 'fileContent';
}

export interface DocumentUploadState {
  /** Array of selected documents */
  documents: DocumentAsset[];
  /** Current document count for the lead */
  documentCount: number;
  /** Whether count is being fetched */
  isLoadingCount: boolean;
  /** Whether documents are being compressed */
  isCompressing: boolean;
  /** Error message if any */
  error: string | null;
}

export interface CompressionOptions {
  /** Quality factor (0-1) */
  quality?: number;
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** Target size in bytes */
  targetSize?: number;
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
}

export interface PickerOptions {
  /** Whether to allow multiple selection */
  multiple?: boolean;
  /** Maximum number of files to select */
  maxCount?: number;
  /** Media type to select */
  mediaType?: 'photo' | 'video' | 'mixed';
  /** Whether to include base64 data */
  includeBase64?: boolean;
}

export interface PermissionStatus {
  /** Camera permission status */
  camera: 'granted' | 'denied' | 'blocked' | 'unavailable';
  /** Photo library permission status */
  photoLibrary: 'granted' | 'denied' | 'blocked' | 'unavailable';
}

export type DocumentSource = 'camera' | 'gallery' | 'files';

export interface DocumentUploadScreenProps {
  route: {
    params: {
      leadId: string;
      initialDocuments?: DocumentAsset[];
    };
  };
  navigation: any;
}

/** API Document structure from backend */
export interface ApiDocument {
  docId: string;
  leadId: string;
  docType: string;
  status: 'pending' | 'uploaded' | 'failed';
  uploadedAt: string;
  uploadedBy: string;
}

/** Extended DocumentAsset for existing documents */
export interface ExistingDocumentAsset extends DocumentAsset {
  /** API document ID */
  docId: string;
  /** Document status from API */
  status: 'pending' | 'uploaded' | 'failed';
  /** Upload timestamp */
  uploadedAt: string;
  /** Who uploaded the document */
  uploadedBy: string;
  /** Whether this is an existing document (read-only) */
  isExisting: boolean;
}

/**
 * Convert API document to DocumentAsset format
 */
export const convertApiDocumentToAsset = (
  apiDoc: ApiDocument
): ExistingDocumentAsset => {
  return {
    id: apiDoc.docId,
    uri: '', // No local URI for existing documents
    fileName: `${apiDoc.docType}.pdf`, // Use docType as filename
    type: 'application/pdf', // Assume PDF for all existing documents
    fileSize: 0, // Don't show file size as per requirement
    timestamp: new Date(apiDoc.uploadedAt).getTime(),

    // Extended fields
    docId: apiDoc.docId,
    status: apiDoc.status,
    uploadedAt: apiDoc.uploadedAt,
    uploadedBy: apiDoc.uploadedBy,
    isExisting: true,
  };
};
