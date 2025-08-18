/**
 * Customer Data Access Object
 * Handles database operations for Customer entities
 */
import { BaseDao } from './BaseDao';
import type {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from '../models/Customer';
import type { SQLiteDatabase } from '../database';
import type { CustomerFilters } from '../../store/slices/customerSlice';

/**
 * Customer DAO implementation
 */
export class CustomerDao extends BaseDao<Customer> {
  protected tableName = 'customers';

  constructor(db: SQLiteDatabase) {
    super(db);
  }

  /**
   * Build upsert query for customer records
   */
  protected buildUpsertQuery(record: Partial<Customer>): {
    sql: string;
    params: any[];
  } {
    // Add default values
    const customerRecord = {
      ...record,
      sync_status: record.sync_status || 'pending',
      local_changes: record.local_changes || '{}',
      kyc_status: record.kyc_status || 'pending',
    };

    // Add timestamps
    this.addTimestamps(customerRecord, !!record.id);

    // Generate ID if not provided
    if (!customerRecord.id) {
      customerRecord.id = this.generateId();
    }

    const sql = `
      INSERT OR REPLACE INTO customers (
        id, name, phone, email, address, city, state, pincode,
        created_at, updated_at, kyc_status, sync_status, local_changes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      customerRecord.id,
      customerRecord.name,
      customerRecord.phone,
      customerRecord.email || null,
      customerRecord.address || null,
      customerRecord.city || null,
      customerRecord.state || null,
      customerRecord.pincode || null,
      customerRecord.created_at,
      customerRecord.updated_at,
      customerRecord.kyc_status,
      customerRecord.sync_status,
      customerRecord.local_changes,
    ];

    return { sql, params };
  }

  /**
   * Find customer by phone number
   * @param phone - Phone number
   * @returns Promise<Customer | undefined>
   */
  async findByPhone(phone: string): Promise<Customer | undefined> {
    const customers = await this.findAll('phone = ?', [phone]);
    return customers.length > 0 ? customers[0] : undefined;
  }

  /**
   * Find customer by email
   * @param email - Email address
   * @returns Promise<Customer | undefined>
   */
  async findByEmail(email: string): Promise<Customer | undefined> {
    const customers = await this.findAll('email = ?', [email]);
    return customers.length > 0 ? customers[0] : undefined;
  }

  /**
   * Find customers by KYC status
   * @param kycStatus - KYC status
   * @returns Promise<Customer[]>
   */
  async findByKycStatus(kycStatus: string): Promise<Customer[]> {
    return this.findAll('kyc_status = ?', [kycStatus]);
  }

  /**
   * Find customers by city
   * @param city - City name
   * @returns Promise<Customer[]>
   */
  async findByCity(city: string): Promise<Customer[]> {
    return this.findAll('city = ?', [city]);
  }

  /**
   * Find customers by state
   * @param state - State name
   * @returns Promise<Customer[]>
   */
  async findByState(state: string): Promise<Customer[]> {
    return this.findAll('state = ?', [state]);
  }

  /**
   * Find customers pending sync
   * @returns Promise<Customer[]>
   */
  async findPendingSync(): Promise<Customer[]> {
    return this.findAll('sync_status = ?', ['pending']);
  }

  /**
   * Search customers by name or phone
   * @param searchTerm - Search term
   * @returns Promise<Customer[]>
   */
  async search(searchTerm: string): Promise<Customer[]> {
    const term = `%${searchTerm}%`;
    return this.findAll('name LIKE ? OR phone LIKE ?', [term, term]);
  }

  /**
   * Advanced search customers by multiple criteria
   * @param criteria - Search criteria
   * @returns Promise<Customer[]>
   */
  async advancedSearch(criteria: {
    name?: string;
    phone?: string;
    email?: string;
    city?: string;
    state?: string;
    kycStatus?: string;
  }): Promise<Customer[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (criteria.name) {
      conditions.push('name LIKE ?');
      params.push(`%${criteria.name}%`);
    }

    if (criteria.phone) {
      conditions.push('phone LIKE ?');
      params.push(`%${criteria.phone}%`);
    }

    if (criteria.email) {
      conditions.push('email LIKE ?');
      params.push(`%${criteria.email}%`);
    }

    if (criteria.city) {
      conditions.push('city = ?');
      params.push(criteria.city);
    }

    if (criteria.state) {
      conditions.push('state = ?');
      params.push(criteria.state);
    }

    if (criteria.kycStatus) {
      conditions.push('kyc_status = ?');
      params.push(criteria.kycStatus);
    }

    if (conditions.length === 0) {
      return this.findAll();
    }

    const whereClause = conditions.join(' AND ');
    return this.findAll(whereClause, params);
  }

  /**
   * Enhanced search with filters (NEW METHOD for Sub-task 3)
   * Optimized search combining text search with multiple filters
   * @param searchTerm - Text to search in name, phone, email
   * @param filters - Filter criteria for KYC status, location, etc.
   * @returns Promise<Customer[]>
   */
  async searchWithFilters(
    searchTerm: string = '',
    filters: CustomerFilters = {}
  ): Promise<Customer[]> {
    console.log('🔍 CustomerDao.searchWithFilters:', { searchTerm, filters });

    const conditions: string[] = [];
    const params: any[] = [];

    // Text search across multiple fields (if provided)
    if (searchTerm && searchTerm.trim()) {
      const trimmedTerm = searchTerm.trim();
      conditions.push(
        '(name LIKE ? COLLATE NOCASE OR phone LIKE ? OR email LIKE ? COLLATE NOCASE)'
      );
      const searchPattern = `%${trimmedTerm}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // KYC status filter
    if (filters.kycStatus) {
      conditions.push('kyc_status = ?');
      params.push(filters.kycStatus);
    }

    // City filter
    if (filters.city) {
      conditions.push('city = ?');
      params.push(filters.city);
    }

    // State filter
    if (filters.state) {
      conditions.push('state = ?');
      params.push(filters.state);
    }

    // Sync status filter (if provided)
    if (filters.status) {
      conditions.push('sync_status = ?');
      params.push(filters.status);
    }

    // Build final query
    let whereClause = '';
    if (conditions.length > 0) {
      whereClause = conditions.join(' AND ');
    }

    // Add ordering for consistent results
    const orderBy = 'ORDER BY name COLLATE NOCASE ASC, created_at DESC';
    const fullWhereClause = whereClause
      ? `${whereClause} ${orderBy}`
      : orderBy.substring(9); // Remove "ORDER BY" if no WHERE clause

    console.log('🔍 Search query conditions:', whereClause || 'none');
    console.log('🔍 Search query params:', params);

    const startTime = Date.now();
    const results = await this.findAll(fullWhereClause, params);
    const duration = Date.now() - startTime;

    console.log(`✅ Found ${results.length} customers in ${duration}ms`);

    // Performance warning for slow queries
    if (duration > 100) {
      console.warn(
        `⚠️ Slow customer search: ${duration}ms (consider adding indexes)`
      );
    }

    return results;
  }

  /**
   * Get available filter options for UI dropdowns
   * @returns Promise<{cities: string[], states: string[], kycStatuses: string[]}>
   */
  async getFilterOptions(): Promise<{
    cities: string[];
    states: string[];
    kycStatuses: string[];
  }> {
    console.log('🔧 Getting filter options...');

    const startTime = Date.now();

    try {
      // Get all in parallel for better performance
      const [cities, states] = await Promise.all([
        this.getUniqueCities(),
        this.getUniqueStates(),
      ]);

      // KYC statuses are predefined
      const kycStatuses = ['pending', 'submitted', 'approved', 'rejected'];

      const duration = Date.now() - startTime;
      console.log(`✅ Retrieved filter options in ${duration}ms`);

      return {
        cities: cities.filter(Boolean), // Remove null/empty values
        states: states.filter(Boolean), // Remove null/empty values
        kycStatuses,
      };
    } catch (error) {
      console.error('❌ Error getting filter options:', error);
      throw error;
    }
  }

  /**
   * Optimized count query for search results (useful for pagination)
   * @param searchTerm - Text to search
   * @param filters - Filter criteria
   * @returns Promise<number>
   */
  async countWithFilters(
    searchTerm: string = '',
    filters: CustomerFilters = {}
  ): Promise<number> {
    const conditions: string[] = [];
    const params: any[] = [];

    // Same logic as searchWithFilters but for count
    if (searchTerm && searchTerm.trim()) {
      const trimmedTerm = searchTerm.trim();
      conditions.push(
        '(name LIKE ? COLLATE NOCASE OR phone LIKE ? OR email LIKE ? COLLATE NOCASE)'
      );
      const searchPattern = `%${trimmedTerm}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (filters.kycStatus) {
      conditions.push('kyc_status = ?');
      params.push(filters.kycStatus);
    }

    if (filters.city) {
      conditions.push('city = ?');
      params.push(filters.city);
    }

    if (filters.state) {
      conditions.push('state = ?');
      params.push(filters.state);
    }

    if (filters.status) {
      conditions.push('sync_status = ?');
      params.push(filters.status);
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '';
    return this.count(whereClause, params);
  }

  /**
   * Create a new customer
   * @param customerRequest - Customer creation data
   * @returns Promise<string> - Created customer ID
   */
  async create(customerRequest: CreateCustomerRequest): Promise<string> {
    const id = customerRequest.id || this.generateId();
    const customer: Partial<Customer> = {
      ...customerRequest,
      id,
      sync_status: 'pending',
      local_changes: '{}',
      kyc_status: 'pending',
    };

    await this.upsertAll([customer]);
    return id;
  }

  /**
   * Update an existing customer
   * @param updateRequest - Customer update data
   * @returns Promise<void>
   */
  async update(updateRequest: UpdateCustomerRequest): Promise<void> {
    const existingCustomer = await this.findById(updateRequest.id);
    if (!existingCustomer) {
      throw new Error(`Customer with ID ${updateRequest.id} not found`);
    }

    const updatedCustomer: Partial<Customer> = {
      ...existingCustomer,
      ...updateRequest,
      sync_status: 'pending',
      local_changes: JSON.stringify(updateRequest),
    };

    await this.upsertAll([updatedCustomer]);
  }

  /**
   * Update customer KYC status
   * @param customerId - Customer ID
   * @param kycStatus - New KYC status
   * @returns Promise<void>
   */
  async updateKycStatus(
    customerId: string,
    kycStatus: Customer['kyc_status']
  ): Promise<void> {
    const existingCustomer = await this.findById(customerId);
    if (!existingCustomer) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }

    const updatedCustomer: Partial<Customer> = {
      ...existingCustomer,
      kyc_status: kycStatus,
      sync_status: 'pending',
      local_changes: JSON.stringify({ kyc_status: kycStatus }),
    };

    await this.upsertAll([updatedCustomer]);
  }

  /**
   * Get customer statistics by KYC status
   * @returns Promise<{total: number, pending: number, approved: number, rejected: number}>
   */
  async getKycStatistics(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    submitted: number;
  }> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(
          `SELECT
            COUNT(*) as total,
            SUM(CASE WHEN kyc_status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN kyc_status = 'submitted' THEN 1 ELSE 0 END) as submitted,
            SUM(CASE WHEN kyc_status = 'approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN kyc_status = 'rejected' THEN 1 ELSE 0 END) as rejected
          FROM customers`,
          [],
          (_, result) => {
            const stats = result.rows.item(0);
            resolve({
              total: stats.total || 0,
              pending: stats.pending || 0,
              submitted: stats.submitted || 0,
              approved: stats.approved || 0,
              rejected: stats.rejected || 0,
            });
          },
          (_, error) => {
            console.error('Failed to get customer KYC statistics:', error);
            reject(new Error(`Statistics query failed: ${error.message}`));
          }
        );
      });
    });
  }

  /**
   * Get customers by location (city/state combination)
   * @param city - City name
   * @param state - State name
   * @returns Promise<Customer[]>
   */
  async findByLocation(city?: string, state?: string): Promise<Customer[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (city) {
      conditions.push('city = ?');
      params.push(city);
    }

    if (state) {
      conditions.push('state = ?');
      params.push(state);
    }

    if (conditions.length === 0) {
      return this.findAll();
    }

    const whereClause = conditions.join(' AND ');
    return this.findAll(whereClause, params);
  }

  /**
   * Get unique cities from customers
   * @returns Promise<string[]>
   */
  async getUniqueCities(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(
          'SELECT DISTINCT city FROM customers WHERE city IS NOT NULL AND city != "" ORDER BY city',
          [],
          (_, result) => {
            const cities: string[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              cities.push(result.rows.item(i).city);
            }
            resolve(cities);
          },
          (_, error) => {
            console.error('Failed to get unique cities:', error);
            reject(new Error(`Query failed: ${error.message}`));
          }
        );
      });
    });
  }

  /**
   * Get unique states from customers
   * @returns Promise<string[]>
   */
  async getUniqueStates(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        tx.executeSql(
          'SELECT DISTINCT state FROM customers WHERE state IS NOT NULL AND state != "" ORDER BY state',
          [],
          (_, result) => {
            const states: string[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              states.push(result.rows.item(i).state);
            }
            resolve(states);
          },
          (_, error) => {
            console.error('Failed to get unique states:', error);
            reject(new Error(`Query failed: ${error.message}`));
          }
        );
      });
    });
  }

  /**
   * Bulk update KYC status for multiple customers
   * @param customerIds - Array of customer IDs
   * @param kycStatus - New KYC status
   * @returns Promise<number> - Number of updated customers
   */
  async bulkUpdateKycStatus(
    customerIds: string[],
    kycStatus: Customer['kyc_status']
  ): Promise<number> {
    if (customerIds.length === 0) {
      return 0;
    }

    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          const placeholders = customerIds.map(() => '?').join(',');
          const now = new Date().toISOString();

          tx.executeSql(
            `UPDATE customers
             SET kyc_status = ?, updated_at = ?, sync_status = 'pending',
                 local_changes = ?
             WHERE id IN (${placeholders})`,
            [
              kycStatus,
              now,
              JSON.stringify({ kyc_status: kycStatus }),
              ...customerIds,
            ],
            (_, result) => {
              console.log(
                `Bulk updated ${result.rowsAffected} customers KYC status to ${kycStatus}`
              );
            },
            (_, error) => {
              console.error('Failed to bulk update KYC status:', error);
              throw new Error(`Bulk update failed: ${error.message}`);
            }
          );
        },
        (error) => {
          console.error('Transaction failed for bulk KYC update:', error);
          reject(new Error(`Transaction failed: ${error.message}`));
        },
        () => {
          console.log(
            `Successfully bulk updated KYC status for ${customerIds.length} customers`
          );
          resolve(customerIds.length);
        }
      );
    });
  }

  /**
   * Check if phone number is already registered
   * @param phone - Phone number to check
   * @param excludeId - Customer ID to exclude from check (for updates)
   * @returns Promise<boolean>
   */
  async isPhoneRegistered(phone: string, excludeId?: string): Promise<boolean> {
    const whereClause = excludeId ? 'phone = ? AND id != ?' : 'phone = ?';
    const params = excludeId ? [phone, excludeId] : [phone];

    const count = await this.count(whereClause, params);
    return count > 0;
  }

  /**
   * Check if email is already registered
   * @param email - Email to check
   * @param excludeId - Customer ID to exclude from check (for updates)
   * @returns Promise<boolean>
   */
  async isEmailRegistered(email: string, excludeId?: string): Promise<boolean> {
    const whereClause = excludeId ? 'email = ? AND id != ?' : 'email = ?';
    const params = excludeId ? [email, excludeId] : [email];

    const count = await this.count(whereClause, params);
    return count > 0;
  }

  /**
   * Get recently added customers
   * @param days - Number of days to look back
   * @returns Promise<Customer[]>
   */
  async getRecentCustomers(days: number = 7): Promise<Customer[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffIso = cutoffDate.toISOString();

    return this.findAll('created_at >= ? ORDER BY created_at DESC', [
      cutoffIso,
    ]);
  }
}

// Singleton instance
let customerDaoInstance: CustomerDao | null = null;

/**
 * Get singleton instance of CustomerDao
 * @param db - Database instance
 * @returns CustomerDao instance
 */
export function getInstance(db: SQLiteDatabase): CustomerDao {
  if (!customerDaoInstance) {
    customerDaoInstance = new CustomerDao(db);
  }
  return customerDaoInstance;
}

/**
 * Reset singleton instance (for testing)
 */
export function resetInstance(): void {
  customerDaoInstance = null;
}
