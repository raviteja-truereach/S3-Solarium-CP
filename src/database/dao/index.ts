/**
 * DAO Module Exports
 * Barrel file for all DAO exports
 */

// Base DAO
export { BaseDao } from './BaseDao';

// Entity DAOs
export {
  LeadDao,
  getInstance as getLeadDao,
  resetInstance as resetLeadDao,
} from './LeadDao';
export {
  CustomerDao,
  getInstance as getCustomerDao,
  resetInstance as resetCustomerDao,
} from './CustomerDao';
export {
  QuotationDao,
  getInstance as getQuotationDao,
  resetInstance as resetQuotationDao,
} from './QuotationDao';
export {
  SyncDao,
  getInstance as getSyncDao,
  resetInstance as resetSyncDao,
} from './SyncDao';
export {
  CommissionDao,
  getInstance as getCommissionDao,
  resetInstance as resetCommissionDao,
} from './CommissionDao';

// Entity Models
export type {
  Lead,
  CreateLeadRequest,
  UpdateLeadRequest,
} from '../models/Lead';
export type {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from '../models/Customer';
export type { Quotation, CreateQuotationRequest } from '../models/Quotation';
export type {
  SyncMetadata,
  UpdateSyncMetadataRequest,
} from '../models/SyncMetadata';
export type {
  Commission,
  CreateCommissionRequest,
  UpdateCommissionRequest,
  CommissionFilters,
  CommissionKPIStats,
} from '../models/Commission';

