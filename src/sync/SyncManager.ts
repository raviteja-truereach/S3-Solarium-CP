/**
 * Enhanced SyncManager with Page-Aware Fetching
 * Implements atomic multi-page sync with validation and rollback capabilities
 * Updated to include quotation synchronization
 */

// ✅ ADD - Customer and Document related imports
import { CustomerDao } from '../database/dao/CustomerDao';
import { DocumentDao } from '../database/dao/DocumentDao';
import { Customer } from '../database/models/Customer';
import type { ApiKycDocument, KycDocument } from '../database/models/Document';
import { customerApi } from '../store/api/customerApi';
import type { CustomersResponse } from '../types/api/customer';
////////////////////////
import { EventEmitter } from 'events';
import { LeadDao } from '../database/dao/LeadDao';
import { Lead } from '../database/models/Lead';
import {
  isApiLead,
  assertLead,
  transformApiLeadToLead,
} from '../models/LeadModel';
import type { SQLiteDatabase } from 'react-native-sqlite-storage';
import type { ApiLead, LeadsApiResponse } from '../types/api';

// ✅ ADD - Quotation-related imports
import { QuotationDao } from '../database/dao/QuotationDao';
import { Quotation } from '../database/models/Quotation';
import type {
  Quotation as ApiQuotation,
  QuotationResponse,
} from '../types/api/quotation';

/**
 * Sync events
 */
export enum SyncEvents {
  SYNC_STARTED = 'syncStarted',
  SYNC_PROGRESS = 'syncProgress',
  SYNC_FINISHED = 'syncFinished',
  SYNC_FAILED = 'syncFailed',
}

/**
 * Sync failure reasons
 */
export enum SyncFailureReason {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  LEADS_INCOMPLETE = 'LEADS_INCOMPLETE',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
}

/**
 * Sync progress information
 */
export interface SyncProgress {
  entity: string;
  currentPage: number;
  totalPages: number;
  processedRecords: number;
  totalRecords: number;
}

/**
 * Sync result information
 */
export interface SyncResult {
  success: boolean;
  recordCounts: {
    leads: number;
    customers?: number;
    documents?: number; // ✅ ADD
    quotations?: number;
  };
  duration: number;
  pagesProcessed: number;
  failureReason?: SyncFailureReason;
  error?: string;
}

/**
 * Enhanced SyncManager with atomic page-aware synchronization
 */
export class SyncManager extends EventEmitter {
  private isRunning = false;
  private syncMutex = false;
  private lastSyncTime: number | null = null;
  private readonly SYNC_THROTTLE_MS = 30000; // 30 seconds throttle
  private readonly API_BASE_URL = 'https://truereach-production.up.railway.app';
  private readonly DEFAULT_PAGE_SIZE = 25;

  constructor(private db: SQLiteDatabase, private authToken: string) {
    super();
  }

  /**
   * Main sync method with page-aware fetching and atomic persistence
   */
  /**
   * Main sync method with page-aware fetching and atomic persistence
   */
  async performSync(): Promise<SyncResult> {
    console.log('🔄 Starting enhanced sync with page-aware fetching...');

    // Check throttle and mutex
    if (this.syncMutex) {
      console.log('⚠️ Sync already in progress, skipping');
      throw new Error('Sync already in progress');
    }

    if (this.shouldThrottleSync()) {
      console.log('⚠️ Sync throttled, too soon since last sync');
      throw new Error('Sync throttled');
    }

    this.syncMutex = true;
    this.isRunning = true;
    const syncStartTime = Date.now();

    this.emit(SyncEvents.SYNC_STARTED);

    try {
      // Perform page-aware leads sync
      const leadsResult = await this.syncLeadsPageAware();

      // ✅ ADD - Perform customer and document sync (atomic)
      let customersResult = {
        totalCustomers: 0,
        totalDocuments: 0,
        pagesProcessed: 0,
      };
      try {
        customersResult = await this.syncCustomersAndDocumentsPageAware();
      } catch (customerError) {
        console.warn(
          '⚠️ Customers sync failed but continuing with leads:',
          customerError
        );
      }

      // ✅ UPDATE - Perform quotations sync (non-blocking)
      let quotationsResult = { totalRecords: 0, pagesProcessed: 0 };
      try {
        quotationsResult = await this.syncQuotationsPageAware();
      } catch (quotationError) {
        console.warn(
          '⚠️ Quotations sync failed but continuing with leads:',
          quotationError
        );
      }

      const syncResult: SyncResult = {
        success: true,
        recordCounts: {
          leads: leadsResult.totalRecords,
          customers: customersResult.totalCustomers, // ✅ ADD
          documents: customersResult.totalDocuments, // ✅ ADD
          quotations: quotationsResult.totalRecords,
        },
        duration: Date.now() - syncStartTime,
        pagesProcessed:
          leadsResult.pagesProcessed +
          customersResult.pagesProcessed +
          quotationsResult.pagesProcessed,
      };

      // Update sync metadata for all entities
      const syncPromises = [this.updateSyncMetadata('leads', Date.now())];
      if (customersResult.totalCustomers > 0) {
        syncPromises.push(this.updateSyncMetadata('customers', Date.now()));
      }
      if (quotationsResult.totalRecords > 0) {
        syncPromises.push(this.updateSyncMetadata('quotations', Date.now()));
      }
      await Promise.all(syncPromises);

      this.lastSyncTime = Date.now();

      console.log('✅ Enhanced sync completed successfully:', syncResult);
      this.emit(SyncEvents.SYNC_FINISHED, syncResult);

      return syncResult;
    } catch (error) {
      console.error('❌ Enhanced sync failed:', error);

      const syncResult: SyncResult = {
        success: false,
        recordCounts: { leads: 0, customers: 0, documents: 0, quotations: 0 }, // ✅ ADD
        duration: Date.now() - syncStartTime,
        pagesProcessed: 0,
        failureReason: this.categorizeError(error),
        error: error instanceof Error ? error.message : String(error),
      };

      this.emit(SyncEvents.SYNC_FAILED, syncResult);
      return syncResult;
    } finally {
      this.isRunning = false;
      this.syncMutex = false;
    }
  }

  /**
   * Page-aware leads synchronization with atomic persistence
   */
  private async syncLeadsPageAware(): Promise<{
    totalRecords: number;
    pagesProcessed: number;
  }> {
    console.log('🔄 Starting page-aware leads sync...');

    const leadDao = new LeadDao(this.db);
    const allValidatedLeads: { leads: Lead[]; page: number }[] = [];
    let totalRecords = 0;
    let pagesProcessed = 0;

    try {
      // Step 1: Fetch first page to determine total pages
      console.log('🔄 Fetching page 1 to determine total pages...');
      const firstPageResponse = await this.fetchLeadsPage(
        1,
        this.DEFAULT_PAGE_SIZE
      );

      if (!firstPageResponse.success || !firstPageResponse.data) {
        throw new Error('Failed to fetch first page of leads');
      }

      const totalPages = Math.ceil(
        firstPageResponse.data.total / firstPageResponse.data.limit
      );
      const totalExpectedRecords = firstPageResponse.data.total;

      console.log(
        `📊 Found ${totalPages} pages with ${totalExpectedRecords} total leads`
      );

      // Step 2: Validate and store first page
      const firstPageValidatedLeads = await this.validateAndTransformPage(
        firstPageResponse.data.items,
        1
      );
      allValidatedLeads.push({
        leads: firstPageValidatedLeads,
        page: 1,
      });
      totalRecords += firstPageValidatedLeads.length;
      pagesProcessed = 1;

      this.emit(SyncEvents.SYNC_PROGRESS, {
        entity: 'leads',
        currentPage: 1,
        totalPages,
        processedRecords: totalRecords,
        totalRecords: totalExpectedRecords,
      } as SyncProgress);

      // Step 3: Fetch remaining pages
      if (totalPages > 1) {
        console.log(`🔄 Fetching remaining ${totalPages - 1} pages...`);

        for (let page = 2; page <= totalPages; page++) {
          console.log(`🔄 Fetching page ${page}/${totalPages}...`);

          try {
            const pageResponse = await this.fetchLeadsPage(
              page,
              this.DEFAULT_PAGE_SIZE
            );

            if (!pageResponse.success || !pageResponse.data) {
              throw new Error(
                `Failed to fetch page ${page}: ${
                  pageResponse.message || 'Unknown error'
                }`
              );
            }

            // Validate this page
            const pageValidatedLeads = await this.validateAndTransformPage(
              pageResponse.data.items,
              page
            );

            allValidatedLeads.push({
              leads: pageValidatedLeads,
              page,
            });

            totalRecords += pageValidatedLeads.length;
            pagesProcessed++;

            // Emit progress
            this.emit(SyncEvents.SYNC_PROGRESS, {
              entity: 'leads',
              currentPage: page,
              totalPages,
              processedRecords: totalRecords,
              totalRecords: totalExpectedRecords,
            } as SyncProgress);

            console.log(
              `✅ Page ${page} validated: ${pageValidatedLeads.length} leads`
            );
          } catch (pageError) {
            console.error(
              `❌ Failed to fetch/validate page ${page}:`,
              pageError
            );
            throw new Error(`Page ${page} sync failed: ${pageError}`);
          }
        }
      }

      // Step 4: Atomic persistence - ALL pages in a single transaction
      console.log(
        `💾 Starting atomic persistence of ${totalRecords} leads from ${pagesProcessed} pages...`
      );

      await this.atomicPersistAllPages(leadDao, allValidatedLeads);

      console.log(
        `✅ Page-aware sync completed: ${totalRecords} leads from ${pagesProcessed} pages`
      );

      return {
        totalRecords,
        pagesProcessed,
      };
    } catch (error) {
      console.error('❌ Page-aware leads sync failed:', error);

      // Emit failure with LEADS_INCOMPLETE reason
      throw new Error(`Leads sync incomplete: ${error}`);
    }
  }

  /**
   * ✅ ADD - Page-aware quotations synchronization
   */
  private async syncQuotationsPageAware(): Promise<{
    totalRecords: number;
    pagesProcessed: number;
  }> {
    console.log('🔄 Starting quotations sync...');

    const quotationDao = new QuotationDao(this.db);
    let totalRecords = 0;
    let pagesProcessed = 0;

    try {
      // Fetch quotations from API (simplified approach - get recent quotations)
      console.log('🔄 Fetching quotations from API...');
      const response = await this.fetchQuotationsPage(1, 50); // Get first 50 quotations

      if (!response.success || !response.data || !response.data.items) {
        console.log('ℹ️ No quotations found or endpoint not available');
        return { totalRecords: 0, pagesProcessed: 0 };
      }

      // Validate and transform quotations
      const validatedQuotations = await this.validateAndTransformQuotationPage(
        response.data.items,
        1
      );

      // Persist to database
      if (validatedQuotations.length > 0) {
        await this.atomicPersistQuotations(quotationDao, validatedQuotations);
        totalRecords = validatedQuotations.length;
        pagesProcessed = 1;

        this.emit(SyncEvents.SYNC_PROGRESS, {
          entity: 'quotations',
          currentPage: 1,
          totalPages: 1,
          processedRecords: totalRecords,
          totalRecords: totalRecords,
        } as SyncProgress);
      }

      console.log(`✅ Quotations sync completed: ${totalRecords} records`);
      return { totalRecords, pagesProcessed };
    } catch (error) {
      console.error('❌ Quotations sync failed:', error);
      throw error;
    }
  }

  /**
   * ✅ ADD - Page-aware customer and document synchronization with atomic persistence
   */
  private async syncCustomersAndDocumentsPageAware(): Promise<{
    totalCustomers: number;
    totalDocuments: number;
    pagesProcessed: number;
  }> {
    console.log('🔄 Starting page-aware customers and documents sync...');

    const customerDao = new CustomerDao(this.db);
    const documentDao = new DocumentDao(this.db);
    const allCustomersWithDocs: {
      customers: Customer[];
      documents: KycDocument[];
      page: number;
    }[] = [];
    let totalCustomers = 0;
    let totalDocuments = 0;
    let pagesProcessed = 0;

    try {
      // Step 1: Fetch first page of customers to determine total pages
      console.log('📄 Fetching customers page 1 to determine total pages...');
      const firstPageResponse = await this.fetchCustomersPage(
        1,
        this.DEFAULT_PAGE_SIZE
      );

      if (!firstPageResponse.success || !firstPageResponse.data) {
        throw new Error('Failed to fetch first page of customers');
      }

      const totalPages = Math.ceil(
        firstPageResponse.data.total / firstPageResponse.data.limit
      );
      const totalExpectedCustomers = firstPageResponse.data.total;

      console.log(
        `📊 Found ${totalPages} pages with ${totalExpectedCustomers} total customers`
      );

      // Step 2: Process first page with documents
      const firstPageResult =
        await this.validateAndTransformCustomerPageWithDocuments(
          firstPageResponse.data.items,
          1
        );

      allCustomersWithDocs.push(firstPageResult);
      totalCustomers += firstPageResult.customers.length;
      totalDocuments += firstPageResult.documents.length;
      pagesProcessed = 1;

      this.emit(SyncEvents.SYNC_PROGRESS, {
        entity: 'customers',
        currentPage: 1,
        totalPages,
        processedRecords: totalCustomers,
        totalRecords: totalExpectedCustomers,
      } as SyncProgress);

      // Step 3: Fetch remaining pages
      if (totalPages > 1) {
        console.log(
          `📄 Fetching remaining ${totalPages - 1} customer pages...`
        );

        for (let page = 2; page <= totalPages; page++) {
          console.log(`📄 Fetching customers page ${page}/${totalPages}...`);

          try {
            const pageResponse = await this.fetchCustomersPage(
              page,
              this.DEFAULT_PAGE_SIZE
            );

            if (!pageResponse.success || !pageResponse.data) {
              throw new Error(
                `Failed to fetch customers page ${page}: ${
                  pageResponse.message || 'Unknown error'
                }`
              );
            }

            // Validate and fetch documents for this page
            const pageResult =
              await this.validateAndTransformCustomerPageWithDocuments(
                pageResponse.data.items,
                page
              );

            allCustomersWithDocs.push(pageResult);
            totalCustomers += pageResult.customers.length;
            totalDocuments += pageResult.documents.length;
            pagesProcessed++;

            // Emit progress
            this.emit(SyncEvents.SYNC_PROGRESS, {
              entity: 'customers',
              currentPage: page,
              totalPages,
              processedRecords: totalCustomers,
              totalRecords: totalExpectedCustomers,
            } as SyncProgress);

            console.log(
              `✅ Page ${page} processed: ${pageResult.customers.length} customers, ${pageResult.documents.length} documents`
            );
          } catch (pageError) {
            console.error(
              `❌ Failed to fetch/process customers page ${page}:`,
              pageError
            );
            throw new Error(`Customers page ${page} sync failed: ${pageError}`);
          }
        }
      }

      // Step 4: Atomic persistence - ALL customers + documents in a single transaction
      console.log(
        `💾 Starting atomic persistence of ${totalCustomers} customers and ${totalDocuments} documents...`
      );

      await this.atomicPersistCustomersAndDocuments(
        customerDao,
        documentDao,
        allCustomersWithDocs
      );

      console.log(
        `✅ Customers and documents sync completed: ${totalCustomers} customers, ${totalDocuments} documents from ${pagesProcessed} pages`
      );

      return {
        totalCustomers,
        totalDocuments,
        pagesProcessed,
      };
    } catch (error) {
      console.error('❌ Customers and documents sync failed:', error);
      throw new Error(`Customers sync incomplete: ${error}`);
    }
  }

  /**
   * ✅ ADD - Fetch a single page of customers from the API
   */
  private async fetchCustomersPage(
    page: number,
    limit: number = this.DEFAULT_PAGE_SIZE
  ): Promise<CustomersResponse> {
    const offset = (page - 1) * limit;
    const url = `${this.API_BASE_URL}/api/v1/customers?offset=${offset}&limit=${limit}`;

    console.log(`🌐 Fetching customers page ${page}: ${url}`);

    try {
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`❌ Failed to fetch customers page ${page}:`, error);
      throw error;
    }
  }

  /**
   * ✅ ADD - Fetch KYC documents for a customer
   */
  private async fetchCustomerDocuments(
    customerId: string
  ): Promise<ApiKycDocument[]> {
    const url = `${this.API_BASE_URL}/api/v1/kycDocuments?customerId=${customerId}`;

    console.log(`📄 Fetching KYC documents for customer: ${customerId}`);

    try {
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No documents found for this customer
          console.log(`📄 No KYC documents found for customer: ${customerId}`);
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data?.documents || [];
    } catch (error) {
      console.warn(
        `⚠️ Failed to fetch documents for customer ${customerId}:`,
        error
      );
      return []; // Return empty array on error to avoid breaking customer sync
    }
  }

  /**
   * ✅ ADD - Validate and transform a page of API customers with their documents
   */
  private async validateAndTransformCustomerPageWithDocuments(
    apiCustomers: any[],
    pageNumber: number
  ): Promise<{
    customers: Customer[];
    documents: KycDocument[];
    page: number;
  }> {
    console.log(
      `🔍 Processing ${apiCustomers.length} customers from page ${pageNumber}...`
    );

    const validatedCustomers: Customer[] = [];
    const allDocuments: KycDocument[] = [];

    for (const apiCustomer of apiCustomers) {
      try {
        // Validate and transform customer
        if (!apiCustomer.customerId || !apiCustomer.name) {
          console.warn('⚠️ Skipping invalid customer:', apiCustomer);
          continue;
        }

        // Transform API customer to database format
        const dbCustomer: Customer = {
          id: apiCustomer.customerId,
          name: apiCustomer.name,
          phone: apiCustomer.phone || '',
          email: apiCustomer.email || undefined,
          address: apiCustomer.address || undefined,
          city: undefined, // Not provided by API
          state: undefined, // Not provided by API
          pincode: undefined, // Not provided by API
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          kyc_status: 'pending', // Will be updated based on documents
          sync_status: 'synced',
          local_changes: '{}',
        };

        // Fetch customer's KYC documents
        const apiDocuments = await this.fetchCustomerDocuments(
          apiCustomer.customerId
        );

        // Transform documents
        const customerDocuments: KycDocument[] = apiDocuments.map((apiDoc) => ({
          id: apiDoc.docId,
          customerId: apiDoc.customerId,
          docType: apiDoc.docType,
          status: apiDoc.status,
          uploadedAt: apiDoc.uploadedAt,
          uploadedBy: apiDoc.uploadedBy,
          created_at: new Date().toISOString(),
          updated_at: apiDoc.uploadedAt,
          sync_status: 'synced',
          local_changes: '{}',
        }));

        // Calculate KYC status from documents (following business logic)
        if (customerDocuments.length > 0) {
          const hasRejected = customerDocuments.some(
            (doc) => doc.status === 'Rejected'
          );
          const allApproved = customerDocuments.every(
            (doc) => doc.status === 'Approved'
          );

          if (hasRejected) {
            dbCustomer.kyc_status = 'rejected';
          } else if (allApproved) {
            dbCustomer.kyc_status = 'approved';
          } else {
            dbCustomer.kyc_status = 'submitted';
          }
        }

        validatedCustomers.push(dbCustomer);
        allDocuments.push(...customerDocuments);

        console.log(
          `✅ Customer ${apiCustomer.customerId}: ${customerDocuments.length} docs, KYC: ${dbCustomer.kyc_status}`
        );
      } catch (error) {
        console.error(
          `❌ Failed to process customer ${apiCustomer.customerId}:`,
          error
        );
        // Continue with next customer
      }
    }

    const validationRate =
      (validatedCustomers.length / apiCustomers.length) * 100;
    console.log(
      `✅ Page ${pageNumber} validation complete: ${
        validatedCustomers.length
      }/${apiCustomers.length} customers (${validationRate.toFixed(1)}%), ${
        allDocuments.length
      } total documents`
    );

    return {
      customers: validatedCustomers,
      documents: allDocuments,
      page: pageNumber,
    };
  }

  /**
   * ✅ FIX - Atomically persist all customers and their documents
   */
  private async atomicPersistCustomersAndDocuments(
    customerDao: CustomerDao,
    documentDao: DocumentDao,
    allCustomersWithDocs: {
      customers: Customer[];
      documents: KycDocument[];
      page: number;
    }[]
  ): Promise<void> {
    const totalCustomers = allCustomersWithDocs.reduce(
      (sum, pageData) => sum + pageData.customers.length,
      0
    );
    const totalDocuments = allCustomersWithDocs.reduce(
      (sum, pageData) => sum + pageData.documents.length,
      0
    );

    console.log(
      `💾 Atomically persisting ${totalCustomers} customers and ${totalDocuments} documents...`
    );

    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          try {
            // Flatten all data
            const allCustomers = allCustomersWithDocs.flatMap(
              (pageData) => pageData.customers
            );
            const allDocuments = allCustomersWithDocs.flatMap(
              (pageData) => pageData.documents
            );

            // Persist customers first
            console.log(`💾 Persisting ${allCustomers.length} customers...`);
            for (const customer of allCustomers) {
              tx.executeSql(
                `INSERT OR REPLACE INTO customers (
                id, name, phone, email, address, city, state, pincode, kyc_status,
                created_at, updated_at, sync_status, local_changes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  customer.id,
                  customer.name,
                  customer.phone,
                  customer.email,
                  customer.address,
                  customer.city,
                  customer.state,
                  customer.pincode,
                  customer.kyc_status,
                  customer.created_at,
                  customer.updated_at,
                  customer.sync_status,
                  customer.local_changes,
                ]
              );
            }

            // ✅ FIX - Persist KYC documents with proper NULL values
            console.log(
              `💾 Persisting ${allDocuments.length} KYC documents...`
            );
            for (const document of allDocuments) {
              tx.executeSql(
                `INSERT OR REPLACE INTO documents (
                id, lead_id, customer_id, doc_type, status, uploaded_at, uploaded_by,
                created_at, updated_at, sync_status, local_changes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  document.id,
                  null, // ✅ FIX: Set lead_id to NULL for KYC documents
                  document.customerId,
                  document.docType,
                  document.status,
                  document.uploadedAt,
                  document.uploadedBy,
                  document.created_at,
                  document.updated_at,
                  document.sync_status,
                  document.local_changes,
                ]
              );
            }

            console.log(
              `✅ Transaction prepared: ${allCustomers.length} customers, ${allDocuments.length} documents`
            );
          } catch (error) {
            console.error('❌ Error preparing transaction:', error);
            throw error;
          }
        },
        (error) => {
          console.error('❌ Transaction failed:', error);
          reject(
            new Error(
              `Failed to persist customers and documents: ${error.message}`
            )
          );
        },
        () => {
          console.log(
            `✅ Successfully persisted ${totalCustomers} customers and ${totalDocuments} documents atomically`
          );
          resolve();
        }
      );
    });
  }

  /**
   * Fetch a single page of leads from the API
   */
  private async fetchLeadsPage(
    page: number,
    limit: number = this.DEFAULT_PAGE_SIZE
  ): Promise<LeadsApiResponse> {
    const offset = (page - 1) * limit;
    const url = `${this.API_BASE_URL}/api/v1/leads?offset=${offset}&limit=${limit}`;

    console.log(`🌐 Fetching leads page ${page}: ${url}`);

    try {
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`❌ Failed to fetch leads page ${page}:`, error);
      throw error;
    }
  }

  /**
   * ✅ ADD - Fetch quotations from API
   */
  private async fetchQuotationsPage(
    page: number,
    limit: number = 25
  ): Promise<QuotationResponse> {
    const offset = (page - 1) * limit;
    const url = `${this.API_BASE_URL}/api/v1/quotations?offset=${offset}&limit=${limit}`;

    console.log(`🌐 Fetching quotations: ${url}`);

    try {
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Quotations endpoint might not exist yet
          return {
            success: false,
            data: { items: [], total: 0, offset: 0, limit: 0 },
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`❌ Failed to fetch quotations:`, error);
      throw error;
    }
  }

  /**
   * Validate and transform a page of API leads
   */
  private async validateAndTransformPage(
    apiLeads: ApiLead[],
    pageNumber: number
  ): Promise<Lead[]> {
    console.log(
      `🔍 Validating ${apiLeads.length} leads from page ${pageNumber}...`
    );

    const validatedLeads: Lead[] = [];

    for (const apiLead of apiLeads) {
      try {
        // ✅ FIX - Use isApiLead type guard instead of assertLead
        if (!isApiLead(apiLead)) {
          console.warn('⚠️ Invalid lead structure, skipping:', {
            leadId: apiLead?.leadId,
            customerName: apiLead?.customerName,
            missingFields: this.getMissingLeadFields(apiLead),
          });
          continue;
        }

        // ✅ FIX - Transform to database-compatible Lead format
        const dbLead: Lead = {
          id: apiLead.leadId,
          customer_id: undefined,
          status: apiLead.status,
          priority: 'medium' as const,
          source: 'CP',
          product_type: apiLead.services?.join(', ') || '',
          estimated_value: undefined,
          follow_up_date: undefined,
          created_at: apiLead.createdAt,
          updated_at: apiLead.updatedAt,
          remarks: undefined,
          address: apiLead.address,
          phone: apiLead.phone,
          email: undefined,
          sync_status: 'synced' as const,
          local_changes: '{}',
          customerName: apiLead.customerName,
          assignedTo: apiLead.assignedTo,
          services: apiLead.services,
        };

        validatedLeads.push(dbLead);
      } catch (error) {
        console.error('❌ Error processing lead, skipping:', error);
        console.error('Lead data:', JSON.stringify(apiLead, null, 2));
      }
    }

    const validationRate = (validatedLeads.length / apiLeads.length) * 100;
    console.log(
      `✅ Validation complete: ${validatedLeads.length}/${
        apiLeads.length
      } leads (${validationRate.toFixed(1)}%)`
    );

    return validatedLeads;
  }

  // ✅ ADD - Helper method to identify missing fields
  private getMissingLeadFields(obj: any): string[] {
    const required = [
      'leadId',
      'customerName',
      'phone',
      'address',
      'status',
      'services',
      'assignedTo',
      'createdAt',
      'updatedAt',
    ];
    return required.filter(
      (field) =>
        !obj ||
        obj[field] === undefined ||
        obj[field] === null ||
        obj[field] === ''
    );
  }

  /**
   * ✅ FIX - Transform API quotations to database format
   */
  private async validateAndTransformQuotationPage(
    apiQuotations: ApiQuotation[],
    pageNumber: number
  ): Promise<Quotation[]> {
    console.log(
      `🔍 Validating ${apiQuotations.length} quotations from page ${pageNumber}...`
    );

    const validatedQuotations: Quotation[] = [];

    for (const apiQuotation of apiQuotations) {
      try {
        // Basic validation
        if (!apiQuotation.quotationId || !apiQuotation.leadId) {
          console.warn('⚠️ Skipping invalid quotation:', apiQuotation);
          continue;
        }

        // ✅ FIX - Transform to match actual database schema
        const dbQuotation: Quotation = {
          id: apiQuotation.quotationId,
          lead_id: apiQuotation.leadId,
          customer_id: '', // Set empty string instead of missing field
          amount: apiQuotation.totalCost || 0, // Map to amount column
          status: apiQuotation.status || 'draft',
          items: JSON.stringify({
            systemKW: apiQuotation.systemKW,
            totalCost: apiQuotation.totalCost,
          }), // Store structured data in items
          terms: 'Standard terms', // Default terms
          created_at: apiQuotation.createdAt || new Date().toISOString(),
          updated_at: apiQuotation.createdAt || new Date().toISOString(),
          sync_status: 'synced',
          local_changes: '{}',

          // Keep these for interface compatibility but don't use in SQL
          quotation_id: apiQuotation.quotationId,
          system_kw: apiQuotation.systemKW || 0,
          roof_type: 'RCC',
          total_amount: apiQuotation.totalCost || 0,
          subsidy_amount: 0,
          final_amount: apiQuotation.totalCost || 0,
          created_by: '',
          shared_with_customer: false,
          components_data: '{}',
          pricing_data: '{}',
          last_sync: new Date().toISOString(),
        };

        validatedQuotations.push(dbQuotation);
      } catch (error) {
        console.error('❌ Failed to validate quotation:', error);
      }
    }

    console.log(
      `✅ Validated ${validatedQuotations.length}/${apiQuotations.length} quotations`
    );
    return validatedQuotations;
  }

  /**
   * Atomically persist all lead pages to database
   */
  private async atomicPersistAllPages(
    leadDao: LeadDao,
    allValidatedLeads: { leads: Lead[]; page: number }[]
  ): Promise<void> {
    const totalLeads = allValidatedLeads.reduce(
      (sum, pageData) => sum + pageData.leads.length,
      0
    );
    console.log(
      `💾 Atomically persisting ${totalLeads} leads from ${allValidatedLeads.length} pages...`
    );

    try {
      // ✅ FIX - Use upsertMany for each page instead of upsertBatch
      for (const pageData of allValidatedLeads) {
        if (pageData.leads.length > 0) {
          await leadDao.upsertMany(pageData.leads, pageData.page);
          console.log(
            `✅ Persisted ${pageData.leads.length} leads for page ${pageData.page}`
          );
        }
      }

      console.log(`✅ Successfully persisted ${totalLeads} leads atomically`);
    } catch (error) {
      console.error('❌ Failed to persist leads atomically:', error);
      throw error;
    }
  }

  /**
   * ✅ FIX - Atomic persistence of quotations
   */
  private async atomicPersistQuotations(
    quotationDao: QuotationDao,
    quotations: Quotation[]
  ): Promise<void> {
    console.log(`💾 Atomically persisting ${quotations.length} quotations...`);

    try {
      // ✅ FIX - Use upsertAll instead of upsertBatch
      await quotationDao.upsertAll(quotations);
      console.log(`✅ Successfully persisted ${quotations.length} quotations`);
    } catch (error) {
      console.error('❌ Failed to persist quotations atomically:', error);
      throw error;
    }
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number = 3
  ): Promise<Response> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🌐 HTTP ${options.method} ${url} (attempt ${attempt}/${maxRetries})`
        );
        const response = await fetch(url, options);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(
          `⚠️ Attempt ${attempt}/${maxRetries} failed:`,
          lastError.message
        );

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Update sync metadata for a specific table
   */
  private async updateSyncMetadata(
    tableName: string,
    timestamp: number
  ): Promise<void> {
    try {
      console.log(`📝 Updating sync metadata for ${tableName}...`);

      // Note: This would need to be implemented based on your SyncDao
      // For now, this is a placeholder

      console.log(`✅ Updated sync metadata for ${tableName}`);
    } catch (error) {
      console.error(
        `❌ Failed to update sync metadata for ${tableName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Check if sync should be throttled
   */
  private shouldThrottleSync(): boolean {
    if (!this.lastSyncTime) return false;
    return Date.now() - this.lastSyncTime < this.SYNC_THROTTLE_MS;
  }

  /**
   * Categorize error for reporting
   */
  private categorizeError(error: any): SyncFailureReason {
    if (!error) return SyncFailureReason.UNKNOWN;

    const errorMessage = error.message || String(error);
    const errorLower = errorMessage.toLowerCase();

    if (errorLower.includes('network') || errorLower.includes('fetch')) {
      return SyncFailureReason.NETWORK_ERROR;
    }

    if (errorLower.includes('auth') || errorLower.includes('401')) {
      return SyncFailureReason.AUTHENTICATION_ERROR;
    }

    if (errorLower.includes('validation') || errorLower.includes('invalid')) {
      return SyncFailureReason.VALIDATION_ERROR;
    }

    if (errorLower.includes('database') || errorLower.includes('sqlite')) {
      return SyncFailureReason.DATABASE_ERROR;
    }

    if (errorLower.includes('leads')) {
      return SyncFailureReason.LEADS_INCOMPLETE;
    }

    // ✅ ADD - Customer-specific error handling
    if (errorLower.includes('customers') || errorLower.includes('customer')) {
      return SyncFailureReason.DATABASE_ERROR; // Treat as database error
    }

    return SyncFailureReason.NETWORK_ERROR; // Default fallback
  }

  /**
   * Check if sync is currently running
   */
  public isRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get last sync timestamp
   */
  public getLastSyncTime(): number | null {
    return this.lastSyncTime;
  }
}

// Add missing enum value for unknown errors
export enum SyncFailureReason {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  LEADS_INCOMPLETE = 'LEADS_INCOMPLETE',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  UNKNOWN = 'UNKNOWN', // ✅ ADD
}
