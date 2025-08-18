/**
 * Quotation Domain Types
 * Internal types for quotation business logic and wizard state management
 */

import type { QuotationStatus } from './api/quotation';

/**
 * Quotation wizard step enumeration
 */
export enum QuotationWizardStep {
  LOCATION = 1,
  PANELS = 2,
  INVERTER_BOM = 3,
  FEES_LOOKUP = 4,
  DEALER_ADDON = 5,
  PRICING_SUBSIDY = 6,
  REVIEW_GENERATE = 7,
}

/**
 * Quotation wizard state for UI management
 */
export interface QuotationWizardState {
  currentStep: QuotationWizardStep;
  totalSteps: 7;
  isValid: boolean;
  canProceed: boolean;
  data: QuotationWizardData;
  errors: QuotationWizardErrors;
}

/**
 * Complete wizard data collected across all steps
 */
export interface QuotationWizardData {
  // Step 1: Location
  location: {
    state?: string;
    discom?: string;
    phase?: 'Single' | 'Three';
    hasSmartMeter?: boolean;
  };

  // Step 2: Panels
  panels: {
    selectedPanels: Array<{
      panelId: string;
      make: string;
      variant: string;
      wattage: number;
      quantity: number;
      unitPrice: number;
      isDCR: boolean;
    }>;
    totalCapacityKW: number;
  };

  // Step 3: Inverter & BOM
  inverterBom: {
    selectedInverter?: {
      inverterId: string;
      make: string;
      model: string;
      capacityKW: number;
      phase: 'Single' | 'Three';
      unitPrice: number;
    };
    cableType: 'Standard' | 'Polycab';
    extraStructureHeight: number; // 0, 0.5, 1.0, 1.5, 2.0
    bomItems: Array<{
      itemId: string;
      name: string;
      type: string;
      quantity: number;
      unitPrice: number;
    }>;
  };

  // Step 4: Fees (read-only, auto-calculated)
  fees: {
    discomFee: number;
    discomMiscCharges: number;
    installationFee: number;
    meterCharges: number;
    modemBoxCharges: number;
    total: number;
  };

  // Step 5: Dealer Add-on
  dealerAddon: {
    perKWAmount: number; // 0-2000, default 1800
    totalAmount: number;
  };

  // Step 6: Pricing & Subsidy (calculated, read-only)
  pricing: {
    hardwareSubtotal: number;
    inflatedBasePrice: number;
    systemPrice: number;
    centralSubsidy: number;
    stateSubsidy: number;
    totalSubsidy: number;
    finalAmount: number;
    commissionAmount: number;
  };

  // Common data
  leadId: string;
  roofType: 'RCC' | 'TinShed' | 'Other';
}

/**
 * Wizard validation errors by step
 */
export interface QuotationWizardErrors {
  location: Record<string, string>;
  panels: Record<string, string>;
  inverterBom: Record<string, string>;
  dealerAddon: Record<string, string>;
  general: string[];
}

/**
 * Quotation filter options for UI
 */
export interface QuotationFilters {
  status: QuotationStatus[];
  dateRange?: {
    from: string;
    to: string;
  };
  leadId?: string;
  customerName?: string;
  amountRange?: {
    min: number;
    max: number;
  };
}

/**
 * Quotation sort options
 */
export type QuotationSortBy =
  | 'createdAt'
  | 'updatedAt'
  | 'totalCost'
  | 'systemKW'
  | 'status';
export type QuotationSortOrder = 'asc' | 'desc';

/**
 * Quotation list configuration
 */
export interface QuotationListConfig {
  filters: QuotationFilters;
  sortBy: QuotationSortBy;
  sortOrder: QuotationSortOrder;
  page: number;
  limit: number;
}

/**
 * Type guards for quotation status validation
 */

/**
 * Check if a status is valid for quotations
 */
export function isValidQuotationStatus(
  status: string
): status is QuotationStatus {
  return ['Generated', 'Shared', 'Accepted', 'Rejected'].includes(status);
}

/**
 * Check if a status transition is valid
 * CP users cannot create 'Draft' status, quotations become immutable after 'Shared'
 */
export function isValidQuotationTransition(
  currentStatus: QuotationStatus | undefined,
  newStatus: QuotationStatus
): boolean {
  // New quotations can only be created as 'Generated'
  if (!currentStatus) {
    return newStatus === 'Generated';
  }

  // Valid transitions based on business rules
  const validTransitions: Record<QuotationStatus, QuotationStatus[]> = {
    Generated: ['Shared'], // Can only share a generated quotation
    Shared: ['Accepted', 'Rejected'], // Customer can accept or reject shared quotation
    Accepted: [], // Terminal state - no further transitions
    Rejected: [], // Terminal state - no further transitions
  };

  return validTransitions[currentStatus].includes(newStatus);
}

/**
 * Check if quotation can be edited (only 'Generated' status allows editing)
 */
export function canEditQuotation(status: QuotationStatus): boolean {
  return status === 'Generated';
}

/**
 * Check if quotation can be shared
 */
export function canShareQuotation(status: QuotationStatus): boolean {
  return status === 'Generated';
}

/**
 * Check if quotation is in terminal state
 */
export function isTerminalQuotationStatus(status: QuotationStatus): boolean {
  return ['Accepted', 'Rejected'].includes(status);
}

/**
 * Get user-friendly status display text
 */
export function getQuotationStatusDisplayText(status: QuotationStatus): string {
  const statusMap: Record<QuotationStatus, string> = {
    Generated: 'Generated',
    Shared: 'Shared with Customer',
    Accepted: 'Accepted by Customer',
    Rejected: 'Rejected by Customer',
  };

  return statusMap[status] || status;
}

/**
 * Calculate panel capacity constraints based on phase
 */
export function getPanelQuantityRange(phase: 'Single' | 'Three'): {
  min: number;
  max: number;
} {
  return phase === 'Single' ? { min: 4, max: 9 } : { min: 7, max: 18 };
}

/**
 * Calculate total system capacity from panels
 */
export function calculateSystemCapacity(
  panels: Array<{ wattage: number; quantity: number }>
): number {
  const totalWattage = panels.reduce(
    (sum, panel) => sum + panel.wattage * panel.quantity,
    0
  );
  return Math.round((totalWattage / 1000) * 100) / 100; // Convert to kW, round to 2 decimal places
}

/**
 * Check if inverter capacity is within acceptable range (±15% of system capacity)
 */
export function isInverterCapacityCompatible(
  systemCapacityKW: number,
  inverterCapacityKW: number,
  tolerance: number = 0.15
): boolean {
  const minCapacity = systemCapacityKW * (1 - tolerance);
  const maxCapacity = systemCapacityKW * (1 + tolerance);
  return inverterCapacityKW >= minCapacity && inverterCapacityKW <= maxCapacity;
}
