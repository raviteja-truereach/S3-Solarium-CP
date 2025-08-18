/**
 * Master Data API Types
 * Types for product catalog and configuration data from backend
 */

/**
 * Master data response containing all product catalogs
 */
export interface MasterDataResponse {
  success: boolean;
  data: MasterData;
  message?: string;
}

/**
 * Complete master data structure
 */
export interface MasterData {
  panels: PanelMaster[];
  inverters: InverterMaster[];
  bomItems: BOMItemMaster[];
  fees: FeesMaster[];
  states: StateMaster[];
  discoms: DiscomMaster[];
  subsidyRules: SubsidyRulesMaster;
  lastUpdated: string;
}

/**
 * Panel master data
 */
export interface PanelMaster {
  panelId: string;
  make: string;
  variant: string;
  wattage: number;
  unitPrice: number;
  isDCR: boolean; // Domestic Content Requirement
  isRecommended: boolean;
  isActive: boolean;
  specifications: {
    technology: string;
    efficiency: number;
    warranty: number;
    dimensions?: {
      length: number;
      width: number;
      thickness: number;
    };
  };
}

/**
 * Inverter master data
 */
export interface InverterMaster {
  inverterId: string;
  make: string;
  model: string;
  capacityKW: number;
  phase: 'Single' | 'Three';
  unitPrice: number;
  isRecommended: boolean;
  isActive: boolean;
  compatibilityRange: {
    minCapacityKW: number;
    maxCapacityKW: number;
  };
  specifications: {
    efficiency: number;
    warranty: number;
    features: string[];
  };
}

/**
 * BOM (Bill of Materials) item master data
 */
export interface BOMItemMaster {
  itemId: string;
  name: string;
  type: 'Cable' | 'Structure' | 'Accessory';
  subType?: string;
  unitPrice: number;
  unit: string; // 'meter', 'piece', 'kg', etc.
  isActive: boolean;
  specifications: {
    material?: string;
    rating?: string;
    description?: string;
  };
}

/**
 * Fees master data by state/discom/phase combination
 */
export interface FeesMaster {
  id: string;
  state: string;
  discom: string;
  phase: 'Single' | 'Three';
  hasSmartMeter: boolean;
  fees: {
    discomFee: number;
    discomMiscCharges: number;
    installationFee: number;
    meterCharges: number;
    modemBoxCharges: number;
  };
  isActive: boolean;
}

/**
 * State master data
 */
export interface StateMaster {
  stateId: string;
  stateName: string;
  stateCode: string;
  isActive: boolean;
  subsidyType: 'S1' | 'S2' | 'S3'; // No Subsidy, Tiered, Higher Tiered
}

/**
 * DISCOM master data
 */
export interface DiscomMaster {
  discomId: string;
  discomName: string;
  stateId: string;
  isActive: boolean;
  supportedPhases: ('Single' | 'Three')[];
  smartMeterOptions: boolean[]; // [true, false] means both, [true] means only smart meter
}

/**
 * Subsidy calculation rules
 */
export interface SubsidyRulesMaster {
  central: CentralSubsidyRules;
  state: StateSubsidyRules;
}

/**
 * Central subsidy calculation rules
 */
export interface CentralSubsidyRules {
  rules: Array<{
    condition: 'lessThan1kW' | 'upTo2kW' | 'between2And3kW' | '3kWOrMore';
    amount?: number;
    ratePerKW?: number;
    baseAmount?: number;
    additionalRatePerKW?: number;
    maxAmount?: number;
  }>;
}

/**
 * State subsidy calculation rules
 */
export interface StateSubsidyRules {
  S1: {
    name: 'No Subsidy';
    amount: 0;
    conditions: never[];
  };
  S2: {
    name: 'Tiered Subsidy';
    rules: Array<{
      condition: 'upTo5kW' | 'above5kW';
      ratePerKW?: number;
      flatAmount?: number;
    }>;
    requiresDCR: true;
  };
  S3: {
    name: 'Higher Tiered Subsidy';
    rules: Array<{
      condition: 'upTo2kW' | 'above2kW';
      ratePerKW?: number;
      flatAmount?: number;
    }>;
    requiresDCR: true;
  };
}

/**
 * Query parameters for master data (usually none, but keeping for extensibility)
 */
export interface MasterDataQueryParams {
  category?:
    | 'panels'
    | 'inverters'
    | 'bom'
    | 'fees'
    | 'states'
    | 'discoms'
    | 'subsidies';
  activeOnly?: boolean;
}
