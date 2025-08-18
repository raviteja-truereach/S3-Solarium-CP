/**
 * Quotation API Types
 * Complete types for quotation-related API operations following L3-FRS-CPAPP specifications
 * Maintains backward compatibility with existing useQuotationsByLead hook
 */

/**
 * Quotation status enum - CP users cannot use 'Draft', quotations become immutable after sharing
 */
export type QuotationStatus = 'Generated' | 'Shared' | 'Accepted' | 'Rejected';

/**
 * Basic quotation interface (maintaining backward compatibility)
 */
export interface Quotation {
  quotationId: string;
  leadId: string;
  systemKW: number;
  totalCost: number;
  status: QuotationStatus;
  createdAt: string;
}

/**
 * Extended quotation interface with full details
 */
export interface QuotationDetail extends Quotation {
  customerId?: string;
  quotationNumber?: string;
  roofType: 'RCC' | 'TinShed' | 'Other';
  subsidyAmount: number;
  finalAmount: number;
  validUntil?: string;
  updatedAt: string;
  createdBy: string;
  sharedWithCustomer: boolean;
  sharedAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  pdfUrl?: string;
  components: QuotationComponents;
  pricing: QuotationPricing;
}

/**
 * Quotation components breakdown
 */
export interface QuotationComponents {
  panels: PanelSelection[];
  inverters: InverterSelection[];
  bom: BOMSelection[];
  fees: FeesBreakdown;
  structure: StructureSelection;
}

/**
 * Panel selection in quotation
 */
export interface PanelSelection {
  panelId: string;
  make: string;
  variant: string;
  wattage: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isDCR: boolean;
}

/**
 * Inverter selection in quotation
 */
export interface InverterSelection {
  inverterId: string;
  make: string;
  model: string;
  capacity: number;
  phase: 'Single' | 'Three';
  unitPrice: number;
  totalPrice: number;
  isRecommended: boolean;
}

/**
 * BOM (Bill of Materials) selection
 */
export interface BOMSelection {
  itemId: string;
  name: string;
  type: 'Cable' | 'Structure' | 'Accessory';
  specification: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * Fees breakdown from master data
 */
export interface FeesBreakdown {
  discomFee: number;
  discomMiscCharges: number;
  installationFee: number;
  meterCharges: number;
  modemBoxCharges: number;
  total: number;
}

/**
 * Structure selection details
 */
export interface StructureSelection {
  extraHeight: number; // in meters (0, 0.5, 1.0, 1.5, 2.0)
  extraHeightCost: number;
  cableType: 'Standard' | 'Polycab';
  cableTypeCost: number;
}

/**
 * Quotation pricing breakdown
 */
export interface QuotationPricing {
  hardwareSubtotal: number;
  inflatedBasePrice: number; // hardware subtotal × 1.10
  dealerAddOn: number; // per kW, range 0-2000, default 1800
  dealerAddOnTotal: number;
  systemPrice: number; // inflated base + dealer add-on total
  centralSubsidy: number;
  stateSubsidy: number;
  totalSubsidy: number;
  finalAmount: number; // system price - total subsidy
  commissionAmount: number; // equals dealer add-on total
}

/**
 * Quotation list response from API (maintains existing structure)
 */
export interface QuotationResponse {
  success: boolean;
  data: {
    items: Quotation[];
    total: number;
    offset: number;
    limit: number;
  };
  message?: string;
}

/**
 * Single quotation detail response from API
 */
export interface QuotationDetailResponse {
  success: boolean;
  data: QuotationDetail;
  message?: string;
}

/**
 * Quotation query parameters (maintains existing structure)
 */
export interface QuotationQueryParams {
  leadId: string;
  offset?: number;
  limit?: number;
}

/**
 * Extended quotation query parameters
 */
export interface ExtendedQuotationQueryParams {
  leadId?: string;
  status?: QuotationStatus[];
  offset?: number;
  limit?: number;
  owner?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Create quotation request - matches 7-step wizard output
 */
export interface CreateQuotationRequest {
  leadId: string;
  systemKW: number;
  roofType: 'RCC' | 'TinShed' | 'Other';

  // Step 1: Location
  state: string;
  discom: string;
  phase: 'Single' | 'Three';
  hasSmartMeter: boolean;

  // Step 2: Panels
  panels: PanelSelection[];

  // Step 3: Inverter & BOM
  inverters: InverterSelection[];
  bom: BOMSelection[];
  structure: StructureSelection;

  // Step 5: Dealer Add-on
  dealerAddOnPerKW: number; // 0-2000, default 1800
}

/**
 * Create quotation response
 */
export interface CreateQuotationResponse {
  success: boolean;
  data: {
    quotationId: string;
  };
  message?: string;
}

/**
 * Share quotation request (empty body)
 */
export interface ShareQuotationRequest {
  // Empty - just triggers share action
}

/**
 * Share quotation response
 */
export interface ShareQuotationResponse {
  success: boolean;
  message?: string;
}

/**
 * Accept/Reject quotation request (empty body)
 */
export interface AcceptRejectQuotationRequest {
  // Empty - just triggers accept/reject action
}

/**
 * Accept/Reject quotation response
 */
export interface AcceptRejectQuotationResponse {
  success: boolean;
  message?: string;
}

/**
 * Quotation PDF response
 */
export interface QuotationPdfResponse {
  success: boolean;
  data: {
    pdfUrl: string; // Temporary download URL
  };
  message?: string;
}

/**
 * Email quotation request
 */
export interface EmailQuotationRequest {
  recipients: string[]; // Array of email addresses
}

/**
 * Email quotation response
 */
export interface EmailQuotationResponse {
  success: boolean;
  message?: string;
}

/**
 * Backend API Request/Response types (matching actual API structure)
 */

/**
 * Panel selection for API requests (simplified)
 */
export interface PanelRequestItem {
  id: string;
  quantity: number;
}

/**
 * Inverter selection for API requests (simplified)
 */
export interface InverterRequestItem {
  id: string;
  quantity: number;
}

/**
 * Create quotation request for backend API
 */
export interface CreateQuotationApiRequest {
  leadId: string;
  systemKW: number;
  roofType: 'RCC' | 'TinShed' | 'Other';
  panels: PanelRequestItem[];
  inverters: InverterRequestItem[];
}

/**
 * Backend API response for quotation components
 */
export interface QuotationComponentsApi {
  panels: Array<{
    id: string;
    name: string;
    quantity: number;
  }>;
  inverters: Array<{
    id: string;
    name: string;
    quantity: number;
  }>;
}

/**
 * Backend API response for quotation pricing
 */
export interface QuotationPricingApi {
  systemCost: number;
  installationFee: number;
  transportFee: number;
  gst: number;
  total: number;
}

/**
 * Full quotation detail from backend API
 */
export interface QuotationDetailApi {
  quotationId: string;
  leadId: string;
  systemKW: number;
  roofType: 'RCC' | 'TinShed' | 'Other';
  components: QuotationComponentsApi;
  pricing: QuotationPricingApi;
  status: QuotationStatus;
  sharedAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Quotation detail response from backend API
 */
export interface QuotationDetailApiResponse {
  success: boolean;
  data: QuotationDetailApi;
  error?: string;
}

/**
 * Create quotation response from backend API
 */
export interface CreateQuotationApiResponse {
  success: boolean;
  data: {
    quotationId: string;
  };
  error?: string;
}

/**
 * Share/Accept/Reject quotation response from backend API
 */
export interface QuotationActionApiResponse {
  success: boolean;
  error?: string;
}
