/**
 * Quotation Status Constants
 * Valid quotation statuses as per the API specifications
 */

export const QUOTATION_STATUSES = [
  'Generated',
  'Shared',
  'Accepted',
  'Rejected',
] as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];
