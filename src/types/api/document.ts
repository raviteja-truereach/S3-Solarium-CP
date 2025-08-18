/**
 * Document API types for SAS token requests and responses
 */

export interface KycSasTokenRequest {
  /** Lead ID for document association */
  leadId: string;
  /** Customer ID */
  customerId: string;
  /** Document type (PAN, AADHAAR, etc.) */
  docType: string;
}

export interface LeadDocSasTokenRequest {
  /** Lead ID for document association */
  leadId: string;
  /** Document type */
  docType: string;
}

export interface SasTokenResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Response data containing SAS token info */
  data: {
    /** Pre-signed URL for upload */
    sasUrl: string;
  };
  /** Error message if request failed */
  message?: string;
}

export interface DocumentMetadata {
  /** Unique document ID */
  id: string;
  /** Associated lead ID */
  leadId: string;
  /** Original filename */
  fileName: string;
  /** File content type */
  contentType: string;
  /** File size in bytes */
  fileSize: number;
  /** Document type */
  docType: string;
  /** Upload timestamp */
  uploadedAt: string;
  /** Backend storage URL */
  downloadUrl?: string;
  /** Upload status */
  status: 'pending' | 'uploaded' | 'failed';
}

export interface DocumentListResponse {
  /** Whether the request was successful */
  success: boolean;
  /** List of documents for the lead */
  data: {
    /** Array of document metadata */
    documents: DocumentMetadata[];
  };
  /** Error message if request failed */
  message?: string;
}

export interface DocumentCountResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Document count data */
  data: {
    /** Current document count for the lead */
    count: number;
    /** Maximum allowed documents per lead */
    maxDocuments: number;
    /** Whether limit is reached */
    limitReached: boolean;
  };
  /** Error message if request failed */
  message?: string;
}
