/**
 * Lead Status API Types
 * Enhanced types for lead status operations - Updated for actual backend structure
 */

export interface UpdateLeadStatusRequest {
  status: string;
  remarks: string;
  followUpDate?: string;
  quotationRef?: string;
  tokenNumber?: string;
}

export interface UpdateLeadStatusResponse {
  success: boolean;
}

export interface StatusValidationError {
  field: string;
  message: string;
}
