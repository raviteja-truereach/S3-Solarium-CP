// Add these Lead-related types to the existing api.ts file

/**
 * Lead API Types
 * Following the same pattern as Dashboard types
 */

import type { Lead } from './lead';

// API Lead model - matches actual API response
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

// API response for leads list
export interface LeadsApiResponse {
  success: boolean;
  data: {
    items: ApiLead[];
    total: number;
    offset: number;
    limit: number;
  };
}

// Processed leads data for internal use
export interface LeadsData {
  items: ApiLead[];
  total: number;
  offset: number;
  limit: number;
  page: number;
  totalPages: number;
}

// Query parameters for leads
export interface GetLeadsParams {
  offset?: number;
  limit?: number;
}

export interface UseLeadByIdResult {
  lead?: Lead;
  loading: boolean;
  error?: Error | 'cache-miss';
  source: 'api' | 'cache';
  onRetry: () => void;
}

/**
 * Data Source Types
 */
export type DataSource = 'api' | 'cache';

/**
 * Cache Miss Error Type
 */
export type CacheMissError = 'cache-miss';

/**
 * Hook Error Union Type
 */
export type HookError = Error | CacheMissError;
