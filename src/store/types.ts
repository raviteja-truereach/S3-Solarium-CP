/**
 * Dashboard summary data structure from API
 */
export interface DashboardSummary {
  /** Total number of leads */
  totalLeads: number;
  /** Number of leads marked as won */
  leadsWon: number;
  /** Number of leads in customer accepted state */
  customerAccepted: number;
  /** Number of leads currently being followed up */
  followUpPending: number;
  /** Number of active quotations */
  activeQuotations: number;
  /** Total commission earned (in currency units) */
  totalCommission: number;
  /** Commission pending approval */
  pendingCommission: number;
  /** Last updated timestamp from server */
  lastUpdatedAt: string;
}

/**
 * Network slice state interface
 */
export interface NetworkState {
  /** Whether sync is currently in progress */
  syncInProgress: boolean;
  /** Timestamp of last successful sync */
  lastSyncAt: number | null;
  /** Timestamp when next sync is allowed (guard mechanism) */
  nextAllowedSyncAt: number;
  /** Dashboard summary data */
  dashboardSummary: DashboardSummary | null;
  /** Last sync error if any */
  lastError: string | null;
}

/**
 * Dashboard API request/response types
 */
export interface DashboardSummaryRequest {
  /** Optional date range filter */
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Dashboard API response structure
 */
export interface DashboardSummaryResponse {
  success: boolean;
  data: DashboardSummary;
  message?: string;
  timestamp: string;
}

/**
 * Dashboard API error response
 */
export interface DashboardErrorResponse {
  success: false;
  error: string;
  code?: string;
  timestamp: string;
}
