/**
 * Commission Entity Model
 * TypeScript interface for Commission database records
 * Maps to API response from /api/v1/commissions
 */

export interface Commission {
  id: string; // commissionId from API
  cp_id: string; // cpId from API
  lead_id?: string; // leadId from API (optional)
  customer_id?: string; // Not in API yet, for future use
  amount: number; // amount from API
  status: 'pending' | 'paid' | 'approved' | 'cancelled' | 'processing'; // API statuses + local statuses
  created_at: string; // createdAt from API (ISO date string)
  updated_at: string; // Local timestamp (ISO date string)
  payment_date?: string; // When commission was paid (ISO date string)
  description?: string; // Optional description
  sync_status: 'synced' | 'pending' | 'failed'; // For offline support
  local_changes: string; // JSON string for offline changes
}

/**
 * Commission creation interface
 */
export interface CreateCommissionRequest {
  id?: string;
  cp_id: string;
  lead_id?: string;
  customer_id?: string;
  amount: number;
  status: 'pending' | 'paid' | 'approved' | 'cancelled' | 'processing';
  payment_date?: string;
  description?: string;
}

/**
 * Commission update interface
 */
export interface UpdateCommissionRequest {
  id: string;
  cp_id?: string;
  lead_id?: string;
  customer_id?: string;
  amount?: number;
  status?: 'pending' | 'paid' | 'approved' | 'cancelled' | 'processing';
  payment_date?: string;
  description?: string;
}

/**
 * Commission filters for queries
 */
export interface CommissionFilters {
  dateRange?: { startDate: string; endDate: string };
  status?: string;
  cp_id?: string;
  lead_id?: string;
}

/**
 * Commission KPI statistics
 */
export interface CommissionKPIStats {
  totalCommission: number;
  paidCommission: number;
  pendingCommission: number;
  approvedCommission: number;
  totalCount: number;
  paidCount: number;
  pendingCount: number;
  approvedCount: number;
}
