/**
 * Lead Domain Model
 * Updated to match actual API response structure
 */

/**
 * Lead Status enumeration based on actual API responses
 */
export enum LeadStatus {
  NEW_LEAD = 'New Lead',
  IN_DISCUSSION = 'In Discussion',
  PHYSICAL_MEETING_ASSIGNED = 'Physical Meeting Assigned',
  CUSTOMER_ACCEPTED = 'Customer Accepted',
  WON = 'Won',
  PENDING_AT_SOLARIUM = 'Pending at Solarium',
  UNDER_EXECUTION = 'Under Execution',
  EXECUTED = 'Executed',
  NOT_RESPONDING = 'Not Responding',
  NOT_INTERESTED = 'Not Interested',
  OTHER_TERRITORY = 'Other Territory',
}

/**
 * Lead Priority levels (for local use)
 */
export enum LeadPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Sync status for local cache management
 */
export enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  FAILED = 'failed',
}

/**
 * API Lead model - matches actual API response
 */
export interface ApiLead {
  leadId: string;
  customerName: string;
  phone: string;
  address: string;
  status: string;
  services: string[];
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Internal Lead model - enhanced for app use
 */
export interface Lead extends ApiLead {
  // Additional fields for internal use
  priority?: LeadPriority;
  estimated_value?: number;
  follow_up_date?: string;
  remarks?: string;
  email?: string;
  quotation_ref?: string;
  token_number?: string;
  sync_status: SyncStatus;
  local_changes: string;
}

/**
 * API response envelope for leads
 */
export interface LeadsApiResponse {
  success: boolean;
  data: {
    items: ApiLead[];
    total: number;
    offset: number;
    limit: number;
  };
}

/**
 * Paginated leads response for internal use
 */
export interface PaginatedLeadsResponse {
  items: Lead[];
  total: number;
  offset: number;
  limit: number;
  page: number;
  totalPages: number;
}

/**
 * Query parameters for getting leads
 */
export interface GetLeadsParams {
  offset?: number;
  limit?: number;
}

/**
 * Runtime type guard to check if an object is a valid ApiLead
 */
export function isApiLead(obj: any): obj is ApiLead {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  // Check required fields
  if (typeof obj.leadId !== 'string' || obj.leadId.length === 0) {
    return false;
  }

  if (typeof obj.customerName !== 'string' || obj.customerName.length === 0) {
    return false;
  }

  if (typeof obj.phone !== 'string' || obj.phone.length === 0) {
    return false;
  }

  if (typeof obj.address !== 'string' || obj.address.length === 0) {
    return false;
  }

  if (typeof obj.status !== 'string' || obj.status.length === 0) {
    return false;
  }

  if (!Array.isArray(obj.services)) {
    return false;
  }

  if (typeof obj.assignedTo !== 'string' || obj.assignedTo.length === 0) {
    return false;
  }

  if (typeof obj.createdAt !== 'string' || obj.createdAt.length === 0) {
    return false;
  }

  if (typeof obj.updatedAt !== 'string' || obj.updatedAt.length === 0) {
    return false;
  }

  return true;
}

/**
 * Runtime type guard for API response envelope
 */
export function isLeadsApiResponse(obj: any): obj is LeadsApiResponse {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  if (typeof obj.success !== 'boolean') {
    return false;
  }

  if (!obj.data || typeof obj.data !== 'object') {
    return false;
  }

  const { data } = obj;

  if (!Array.isArray(data.items)) {
    return false;
  }

  if (typeof data.total !== 'number' || data.total < 0) {
    return false;
  }

  if (typeof data.offset !== 'number' || data.offset < 0) {
    return false;
  }

  if (typeof data.limit !== 'number' || data.limit <= 0) {
    return false;
  }

  return true;
}

/**
 * Transform API lead to internal lead model
 */
export function transformApiLeadToLead(apiLead: ApiLead): Lead {
  return {
    ...apiLead,
    priority: LeadPriority.MEDIUM, // Default priority
    sync_status: SyncStatus.SYNCED,
    local_changes: '{}',
  };
}

/**
 * Helper function to check if a status is terminal
 */
export function isTerminalStatus(status: string): boolean {
  return [
    LeadStatus.EXECUTED,
    LeadStatus.NOT_RESPONDING,
    LeadStatus.NOT_INTERESTED,
    LeadStatus.OTHER_TERRITORY,
  ].includes(status as LeadStatus);
}

/**
 * Helper function to get valid next statuses
 */
export function getValidNextStatuses(currentStatus: string): LeadStatus[] {
  switch (currentStatus as LeadStatus) {
    case LeadStatus.NEW_LEAD:
      return [
        LeadStatus.IN_DISCUSSION,
        LeadStatus.PHYSICAL_MEETING_ASSIGNED,
        LeadStatus.NOT_RESPONDING,
        LeadStatus.NOT_INTERESTED,
        LeadStatus.OTHER_TERRITORY,
      ];

    case LeadStatus.IN_DISCUSSION:
      return [
        LeadStatus.PHYSICAL_MEETING_ASSIGNED,
        LeadStatus.CUSTOMER_ACCEPTED,
        LeadStatus.WON,
        LeadStatus.NOT_RESPONDING,
        LeadStatus.NOT_INTERESTED,
        LeadStatus.OTHER_TERRITORY,
      ];

    case LeadStatus.PHYSICAL_MEETING_ASSIGNED:
      return [
        LeadStatus.WON,
        LeadStatus.NOT_RESPONDING,
        LeadStatus.NOT_INTERESTED,
        LeadStatus.OTHER_TERRITORY,
      ];

    case LeadStatus.CUSTOMER_ACCEPTED:
      return [LeadStatus.WON];

    case LeadStatus.WON:
      return [LeadStatus.PENDING_AT_SOLARIUM];

    case LeadStatus.PENDING_AT_SOLARIUM:
      return [LeadStatus.UNDER_EXECUTION];

    case LeadStatus.UNDER_EXECUTION:
      return [LeadStatus.EXECUTED];

    default:
      return [];
  }
}
