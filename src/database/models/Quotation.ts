/**
 * Quotation Entity Model
 * TypeScript interface for Quotation database records - Updated for full quotation support
 */

import type { QuotationStatus } from '../../types/api/quotation';

/**
 * Database quotation entity (for SQLite local storage)
 */
export interface Quotation {
  id: string;
  lead_id: string;
  customer_id?: string;
  quotation_number?: string;
  quotation_id: string; // Backend quotation ID
  system_kw: number;
  roof_type: 'RCC' | 'TinShed' | 'Other';
  total_amount: number;
  subsidy_amount: number;
  final_amount: number;
  status: QuotationStatus;
  valid_until?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  shared_with_customer: boolean;
  shared_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  pdf_url?: string;

  // JSON strings for complex data
  components_data: string; // JSON stringified QuotationComponents
  pricing_data: string; // JSON stringified QuotationPricing
  wizard_data?: string; // JSON stringified QuotationWizardData (for draft recovery)

  // Sync metadata
  sync_status: 'synced' | 'pending' | 'failed';
  local_changes: string; // JSON string of changes made offline
  last_sync: string;
}

/**
 * Quotation creation request for local database
 */
export interface CreateQuotationRequest {
  id?: string;
  lead_id: string;
  customer_id?: string;
  quotation_id: string;
  system_kw: number;
  roof_type: 'RCC' | 'TinShed' | 'Other';
  total_amount: number;
  subsidy_amount?: number;
  final_amount: number;
  status?: QuotationStatus;
  valid_until?: string;
  components_data: string;
  pricing_data: string;
  wizard_data?: string;
  created_by: string;
  shared_with_customer?: boolean;
}

/**
 * Quotation update request for local database
 */
export interface UpdateQuotationRequest {
  id: string;
  system_kw?: number;
  roof_type?: 'RCC' | 'TinShed' | 'Other';
  total_amount?: number;
  subsidy_amount?: number;
  final_amount?: number;
  status?: QuotationStatus;
  valid_until?: string;
  components_data?: string;
  pricing_data?: string;
  wizard_data?: string;
  shared_with_customer?: boolean;
  shared_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  pdf_url?: string;
}
