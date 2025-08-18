/**
 * Commission API Response Types
 * TypeScript interfaces for commission-related API endpoints
 */

/**
 * Commission item interface for list view
 */
export interface CommissionListItem {
  commissionId: string;
  cpId: string;
  leadId: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled' | 'processing';
  createdAt: string;
}

/**
 * Commission detail interface (complete details)
 */
export interface CommissionDetail {
  commissionId: string;
  cpId: string;
  leadId: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled' | 'processing';
  approvedAt?: string;
  paidAt?: string;
  utrNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Get commissions list API response
 */
export interface CommissionsResponse {
  success: boolean;
  data: {
    items: CommissionListItem[];
    total: number;
    offset: number;
    limit: number;
  };
}

/**
 * Get commission detail API response
 */
export interface CommissionDetailResponse {
  success: boolean;
  data: CommissionDetail;
}

/**
 * Commission query parameters
 */
export interface GetCommissionsParams {
  cpId: string; // Required - extracted from auth state
  limit?: number;
  offset?: number;
  status?: 'pending' | 'approved' | 'paid' | 'cancelled' | 'processing';
  startDate?: string; // ISO date string for date range filtering
  endDate?: string; // ISO date string for date range filtering
  searchTerm?: string;
}

/**
 * Get commission by ID parameters
 */
export interface GetCommissionByIdParams {
  commissionId: string;
  cpId: string; // Required - extracted from auth state
}
