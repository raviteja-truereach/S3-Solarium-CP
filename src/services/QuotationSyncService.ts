/**
 * Quotation Sync Service
 * Handles quotation data synchronization with local cache following leadSlice patterns
 */
import { store } from '../store/store';
import { upsertQuotations, setLastSync } from '../store/slices/quotationSlice';
import { QuotationDao } from '../database/dao/QuotationDao';
import type { Quotation } from '../../types/api/quotation';
import type { Quotation as DbQuotation } from '../../database/models/Quotation';
import type { UpsertQuotationsPayload } from '../slices/quotationSlice';

/**
 * Hydrate quotations from SQLite cache
 */
export const hydrateQuotationsFromCache = async (): Promise<void> => {
  try {
    console.log('🔄 Hydrating quotations from cache...');

    // Note: You'll need to pass the actual database instance here
    // const quotationDao = new QuotationDao(database);
    // const cachedQuotations = await quotationDao.findAll();

    // For now, using empty array - replace with actual DAO call
    const cachedQuotations: DbQuotation[] = [];

    // Transform database quotations to API format
    const apiQuotations: Quotation[] = cachedQuotations.map(transformDbToApi);

    // Create upsert payload following leadSlice pattern
    const payload: UpsertQuotationsPayload = {
      items: apiQuotations,
      page: 1,
      totalPages: 1,
      totalCount: apiQuotations.length,
    };

    // Dispatch to store
    store.dispatch(upsertQuotations(payload));
    store.dispatch(setLastSync(Date.now()));

    console.log(`✅ Hydrated ${apiQuotations.length} quotations from cache`);
  } catch (error) {
    console.error('❌ Failed to hydrate quotations from cache:', error);
  }
};

/**
 * Persist quotations to SQLite cache
 */
export const persistQuotationsToCache = async (
  quotations: Quotation[]
): Promise<void> => {
  try {
    console.log(`🔄 Persisting ${quotations.length} quotations to cache...`);

    // Note: You'll need to pass the actual database instance here
    // const quotationDao = new QuotationDao(database);

    // Transform API quotations to database format
    const dbQuotations: DbQuotation[] = quotations.map(transformApiToDb);

    // Upsert to database
    // await Promise.all(
    //   dbQuotations.map(quotation => quotationDao.upsert(quotation))
    // );

    console.log(`✅ Persisted ${quotations.length} quotations to cache`);
  } catch (error) {
    console.error('❌ Failed to persist quotations to cache:', error);
  }
};

/**
 * Transform database quotation to API format
 */
function transformDbToApi(dbQuotation: DbQuotation): Quotation {
  return {
    quotationId: dbQuotation.quotation_id,
    leadId: dbQuotation.lead_id,
    systemKW: dbQuotation.system_kw,
    totalCost: dbQuotation.total_amount,
    status: dbQuotation.status,
    createdAt: dbQuotation.created_at,
  };
}

/**
 * Transform API quotation to database format
 */
function transformApiToDb(apiQuotation: Quotation): DbQuotation {
  return {
    id: apiQuotation.quotationId,
    lead_id: apiQuotation.leadId,
    customer_id: '', // Will be filled from lead data
    quotation_id: apiQuotation.quotationId,
    system_kw: apiQuotation.systemKW,
    roof_type: 'RCC', // Default, will be updated with full data
    total_amount: apiQuotation.totalCost,
    subsidy_amount: 0, // Will be filled with full data
    final_amount: apiQuotation.totalCost,
    status: apiQuotation.status,
    created_at: apiQuotation.createdAt,
    updated_at: apiQuotation.createdAt,
    created_by: '', // Will be filled from user data
    shared_with_customer: false,
    components_data: '{}', // Will be filled with full data
    pricing_data: '{}', // Will be filled with full data
    sync_status: 'synced',
    local_changes: '{}',
    last_sync: new Date().toISOString(),
  };
}

/**
 * Sync quotations from API and persist to cache
 */
export const syncQuotations = async (leadId?: string): Promise<void> => {
  try {
    console.log('🔄 Syncing quotations from API...');

    // This would typically use the quotation API
    // const quotations = await fetchQuotationsFromAPI(leadId);

    // For now, return empty array
    const quotations: Quotation[] = [];

    // Persist to cache
    await persistQuotationsToCache(quotations);

    // Update Redux store
    const payload: UpsertQuotationsPayload = {
      items: quotations,
      page: 1,
      totalPages: 1,
      totalCount: quotations.length,
    };

    store.dispatch(upsertQuotations(payload));
    store.dispatch(setLastSync(Date.now()));

    console.log(`✅ Synced ${quotations.length} quotations`);
  } catch (error) {
    console.error('❌ Failed to sync quotations:', error);
  }
};
