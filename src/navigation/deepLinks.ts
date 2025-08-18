/**
 * Deep Links Registry
 * Central configuration for all deep link patterns in the app
 */

export const DEEP_LINK_PATTERNS = {
  // Auth routes
  LOGIN: 'auth/login',

  // Home routes
  HOME: 'home',
  MY_LEADS: 'leads',
  ADD_LEAD: 'leads/add',
  LEAD_DETAIL: 'leads/:leadId',
  CUSTOMERS: 'customers',
  CUSTOMER_DETAIL: 'customers/:customerId',
  
  // ✅ ADD - Commission routes
  COMMISSIONS: 'commissions',
  COMMISSION_DETAIL: 'commissions/:commissionId',
} as const;

export type DeepLinkPattern =
  (typeof DEEP_LINK_PATTERNS)[keyof typeof DEEP_LINK_PATTERNS];

/**
 * Utility to generate deep link URLs
 */
export const generateDeepLink = (
  pattern: DeepLinkPattern,
  params?: Record<string, string>
): string => {
  const baseUrl = 'solariumcp://';
  let url = pattern;

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value);
    });
  }

  return baseUrl + url;
};

// ✅ ADD - Commission-specific deep link helpers
export const generateCommissionDeepLink = (commissionId: string): string => {
  return generateDeepLink(DEEP_LINK_PATTERNS.COMMISSION_DETAIL, { commissionId });
};

/**
 * Example usage:
 * generateDeepLink(DEEP_LINK_PATTERNS.LEAD_DETAIL, { leadId: 'LEAD-123' })
 * // Returns: 'solariumcp://leads/LEAD-123'
 * 
 * generateCommissionDeepLink('COMM-456')
 * // Returns: 'solariumcp://commissions/COMM-456'
 */