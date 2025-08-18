/**
 * Document Entity Model
 * TypeScript interface for Document database records
 */

export interface Document {
  id: string; // docId from API
  leadId: string; // leadId from API
  docType: string; // docType from API (e.g., "PAN")
  status: string; // status from API (e.g., "pending")
  uploadedAt: string; // uploadedAt from API (ISO timestamp)
  uploadedBy: string; // uploadedBy from API (e.g., "CP-001")
  created_at: string; // Local creation timestamp
  updated_at: string; // Local update timestamp
  sync_status: 'synced' | 'pending' | 'failed';
  local_changes: string; // JSON string for local modifications
}

/**
 * Document creation interface (optional fields for insert)
 */
export interface CreateDocumentRequest {
  id: string; // docId from API
  leadId: string;
  docType: string;
  status?: string;
  uploadedAt: string;
  uploadedBy: string;
}

/**
 * Document update interface (all fields optional except id)
 */
export interface UpdateDocumentRequest {
  id: string;
  leadId?: string;
  docType?: string;
  status?: string;
  uploadedAt?: string;
  uploadedBy?: string;
}

/**
 * API Document interface (from backend response)
 */
export interface ApiDocument {
  docId: string;
  leadId: string;
  docType: string;
  status: string;
  uploadedAt: string;
  uploadedBy: string;
}

/**
 * KYC Document interface (for customer documents)
 */
export interface KycDocument extends Omit<Document, 'leadId'> {
  customerId: string; // customer_id instead of lead_id
}

/**
 * Create KYC Document request
 */
export interface CreateKycDocumentRequest {
  id: string; // docId from API
  customerId: string;
  docType: string;
  status?: string;
  uploadedAt: string;
  uploadedBy: string;
}

/**
 * API KYC Document interface (from backend response)
 */
export interface ApiKycDocument {
  docId: string;
  customerId: string;
  docType: string;
  status: string;
  uploadedAt: string;
  uploadedBy: string;
}

/**
 * KYC Status aggregation result
 */
export interface KycStatus {
  customerId: string;
  overallStatus: 'pending' | 'submitted' | 'approved' | 'rejected';
  documentCount: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  documents: KycDocument[];
}
