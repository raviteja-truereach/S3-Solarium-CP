export interface Lead {
  id: string;
  customerName: string;
  phone: string;
  email?: string | null;
  address: string;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  status: string;
  nextFollowUpDate?: string | null;
  remarks?: string;
  quotationRef?: string | null;
  tokenNumber?: string | null;
  services?: string[];
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  documents?: any[];
  quotations?: any[];
}

/**
 * Status Change Draft - Input for validation
 */
export interface StatusChangeDraft {
  currentStatus: string;
  newStatus: string;
  remarks: string;
  nextFollowUpDate?: string;
  quotationRef?: string;
  tokenNumber?: string;
}

/**
 * Validation Result - Output from validation
 */
export interface ValidationResult {
  valid: boolean;
  errors?: Record<string, string>;
}
