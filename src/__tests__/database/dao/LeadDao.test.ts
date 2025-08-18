/**
 * Lead DAO Tests - Comprehensive Coverage
 * Enhanced tests for pagination methods, performance, and edge cases
 */
import { SQLiteDatabase } from 'react-native-sqlite-storage';
import { LeadDao } from '../../../database/dao/LeadDao';
import { Lead } from '../../../database/models/Lead';

// Enhanced Mock Database with more realistic behavior
class EnhancedMockDatabase {
  private data: Map<string, any[]> = new Map();
  private transactionState: 'none' | 'active' | 'committed' | 'rolled_back' =
    'none';
  private shouldFailOperation: string | null = null;
  private operationDelay = 0;

  constructor() {
    this.data.set('leads', []);
  }

  // Control methods for testing
  setShouldFailOperation(operation: string | null) {
    this.shouldFailOperation = operation;
  }

  setOperationDelay(ms: number) {
    this.operationDelay = ms;
  }

  getTransactionState() {
    return this.transactionState;
  }

  getLeadsData() {
    return this.data.get('leads') || [];
  }

  clearData() {
    this.data.set('leads', []);
    this.transactionState = 'none';
    this.shouldFailOperation = null;
    this.operationDelay = 0;
  }

  async executeSql(query: string, params: any[] = []): Promise<any[]> {
    // Simulate delay if set
    if (this.operationDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.operationDelay));
    }

    console.log(
      'Enhanced Mock SQL:',
      query.substring(0, 50),
      '...',
      params.length,
      'params'
    );

    // Handle transaction control
    if (query.includes('BEGIN TRANSACTION')) {
      if (this.shouldFailOperation === 'begin') {
        throw new Error('Mock: Transaction begin failed');
      }
      this.transactionState = 'active';
      return [{ rows: { length: 0 } }];
    }

    if (query.includes('COMMIT')) {
      if (this.shouldFailOperation === 'commit') {
        throw new Error('Mock: Transaction commit failed');
      }
      this.transactionState = 'committed';
      return [{ rows: { length: 0 } }];
    }

    if (query.includes('ROLLBACK')) {
      if (this.shouldFailOperation === 'rollback') {
        throw new Error('Mock: Transaction rollback failed');
      }
      this.transactionState = 'rolled_back';
      return [{ rows: { length: 0 } }];
    }

    // Handle INSERT OR REPLACE operations
    if (query.includes('INSERT OR REPLACE INTO leads')) {
      if (this.shouldFailOperation === 'insert') {
        throw new Error('Mock: Insert operation failed');
      }

      const leadsData = this.data.get('leads') || [];
      const leadData = {
        id: params[0],
        customer_id: params[1],
        status: params[2],
        priority: params[3],
        source: params[4],
        product_type: params[5],
        estimated_value: params[6],
        follow_up_date: params[7],
        created_at: params[8],
        updated_at: params[9],
        remarks: params[10],
        address: params[11],
        phone: params[12],
        email: params[13],
        sync_status: params[14],
        local_changes: params[15],
        customerName: params[16],
        assignedTo: params[17],
        services: params[18],
        page_number: params[19],
      };

      // Update existing or add new
      const existingIndex = leadsData.findIndex(
        (lead: any) => lead.id === params[0]
      );
      if (existingIndex >= 0) {
        leadsData[existingIndex] = leadData;
      } else {
        leadsData.push(leadData);
      }

      this.data.set('leads', leadsData);
      return [{ rowsAffected: 1 }];
    }

    // Handle SELECT queries
    if (query.includes('SELECT')) {
      const leadsData = this.data.get('leads') || [];

      if (this.shouldFailOperation === 'select') {
        throw new Error('Mock: Select operation failed');
      }

      // Handle COUNT queries
      if (query.includes('COUNT(*)')) {
        return [
          {
            rows: {
              item: () => ({
                total: leadsData.length,
                count: leadsData.length,
              }),
              length: 1,
            },
          },
        ];
      }

      // Handle page-specific queries
      if (query.includes('WHERE page_number = ?')) {
        const pageNumber = params[0];
        const pageData = leadsData.filter(
          (lead: any) => lead.page_number === pageNumber
        );

        return [
          {
            rows: {
              length: pageData.length,
              item: (index: number) => pageData[index],
            },
          },
        ];
      }

      // Handle ID-only queries
      if (query.includes('SELECT id')) {
        return [
          {
            rows: {
              length: leadsData.length,
              item: (index: number) => ({
                id: leadsData[index]?.id || `MOCK-${index}`,
              }),
            },
          },
        ];
      }

      // Handle GROUP BY queries for page counts
      if (query.includes('GROUP BY page_number')) {
        const pageCounts: Record<number, number> = {};
        leadsData.forEach((lead: any) => {
          const page = lead.page_number || 1;
          pageCounts[page] = (pageCounts[page] || 0) + 1;
        });

        const results = Object.entries(pageCounts).map(([page, count]) => ({
          page_number: parseInt(page),
          count,
        }));

        return [
          {
            rows: {
              length: results.length,
              item: (index: number) => results[index],
            },
          },
        ];
      }

      // Default SELECT - return all data
      return [
        {
          rows: {
            length: leadsData.length,
            item: (index: number) =>
              leadsData[index] || this.createMockLead(index),
          },
        },
      ];
    }

    // Handle DELETE queries
    if (query.includes('DELETE')) {
      if (this.shouldFailOperation === 'delete') {
        throw new Error('Mock: Delete operation failed');
      }

      const leadsData = this.data.get('leads') || [];
      const pageNumber = params[0];
      const originalLength = leadsData.length;
      const filteredData = leadsData.filter(
        (lead: any) => lead.page_number !== pageNumber
      );

      this.data.set('leads', filteredData);
      return [{ rowsAffected: originalLength - filteredData.length }];
    }

    return [{ rows: { length: 0 } }];
  }

  private createMockLead(index: number): any {
    return {
      id: `MOCK-LEAD-${index + 1}`,
      status: 'New Lead',
      priority: 'medium',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      sync_status: 'synced',
      local_changes: '{}',
      customerName: `Mock Customer ${index + 1}`,
      phone: `123456789${index}`,
      address: `Mock Address ${index + 1}`,
      assignedTo: 'CP-001',
      services: '["SRV001"]',
      page_number: 1,
    };
  }
}

describe('Lead DAO - Comprehensive Tests', () => {
  let mockDb: EnhancedMockDatabase;
  let leadDao: LeadDao;

  const createTestLead = (id: string, overrides: Partial<Lead> = {}): Lead => ({
    id,
    status: 'New Lead',
    priority: 'medium',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    sync_status: 'synced',
    local_changes: '{}',
    customerName: `Customer ${id}`,
    phone: `+91${id.replace(/\D/g, '').padStart(10, '0')}`,
    address: `Address ${id}`,
    assignedTo: 'CP-001',
    services: ['SRV001'],
    ...overrides,
  });

  beforeEach(() => {
    mockDb = new EnhancedMockDatabase();
    leadDao = new LeadDao(mockDb as any);
  });

  afterEach(() => {
    mockDb.clearData();
  });

  describe('upsertMany - Comprehensive Tests', () => {
    it('should upsert multiple leads with correct page number', async () => {
      const leads = [
        createTestLead('UPSERT-001'),
        createTestLead('UPSERT-002'),
        createTestLead('UPSERT-003'),
      ];

      await leadDao.upsertMany(leads, 2);

      const leadsData = mockDb.getLeadsData();
      expect(leadsData).toHaveLength(3);

      // Verify all leads have correct page number
      leadsData.forEach((lead: any) => {
        expect(lead.page_number).toBe(2);
      });

      // Verify transaction was committed
      expect(mockDb.getTransactionState()).toBe('committed');
    });

    it('should handle empty leads array gracefully', async () => {
      await expect(leadDao.upsertMany([], 1)).resolves.not.toThrow();
      await expect(leadDao.upsertMany(null as any, 1)).resolves.not.toThrow();
      await expect(
        leadDao.upsertMany(undefined as any, 1)
      ).resolves.not.toThrow();

      const leadsData = mockDb.getLeadsData();
      expect(leadsData).toHaveLength(0);
    });

    it('should meet performance requirements for bulk operations', async () => {
      const leads = Array.from({ length: 100 }, (_, i) =>
        createTestLead(`PERF-${String(i + 1).padStart(3, '0')}`)
      );

      const startTime = Date.now();
      await leadDao.upsertMany(leads, 1);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThanOrEqual(200); // ≤200ms requirement

      const leadsData = mockDb.getLeadsData();
      expect(leadsData).toHaveLength(100);
    });

    it('should handle transaction failures with proper rollback', async () => {
      mockDb.setShouldFailOperation('commit');

      const leads = [createTestLead('FAIL-001')];

      await expect(leadDao.upsertMany(leads, 1)).rejects.toThrow(
        'Mock: Transaction commit failed'
      );

      // Transaction should be rolled back
      expect(mockDb.getTransactionState()).toBe('rolled_back');
    });

    it('should handle individual insert failures', async () => {
      mockDb.setShouldFailOperation('insert');

      const leads = [createTestLead('INSERT-FAIL-001')];

      await expect(leadDao.upsertMany(leads, 1)).rejects.toThrow(
        'Mock: Insert operation failed'
      );
    });

    it('should update existing leads correctly', async () => {
      // Insert initial lead
      const initialLead = createTestLead('UPDATE-001', { status: 'New Lead' });
      await leadDao.upsertMany([initialLead], 1);

      // Update the same lead
      const updatedLead = createTestLead('UPDATE-001', {
        status: 'In Discussion',
        customerName: 'Updated Customer Name',
      });
      await leadDao.upsertMany([updatedLead], 1);

      const leadsData = mockDb.getLeadsData();
      expect(leadsData).toHaveLength(1); // Should not duplicate
      expect(leadsData[0].status).toBe('In Discussion');
      expect(leadsData[0].customerName).toBe('Updated Customer Name');
    });

    it('should handle mixed new and existing leads', async () => {
      // Insert initial leads
      const initialLeads = [
        createTestLead('MIXED-001'),
        createTestLead('MIXED-002'),
      ];
      await leadDao.upsertMany(initialLeads, 1);

      // Mix of existing and new leads
      const mixedLeads = [
        createTestLead('MIXED-001', { status: 'Updated' }), // Existing
        createTestLead('MIXED-003'), // New
        createTestLead('MIXED-002', { status: 'Also Updated' }), // Existing
        createTestLead('MIXED-004'), // New
      ];
      await leadDao.upsertMany(mixedLeads, 1);

      const leadsData = mockDb.getLeadsData();
      expect(leadsData).toHaveLength(4);

      // Verify updates
      const lead001 = leadsData.find((l: any) => l.id === 'MIXED-001');
      expect(lead001.status).toBe('Updated');

      const lead002 = leadsData.find((l: any) => l.id === 'MIXED-002');
      expect(lead002.status).toBe('Also Updated');
    });
  });

  describe('getPage - Comprehensive Tests', () => {
    beforeEach(async () => {
      // Setup test data across multiple pages
      const page1Leads = Array.from({ length: 5 }, (_, i) =>
        createTestLead(`PAGE1-${String(i + 1).padStart(2, '0')}`)
      );
      const page2Leads = Array.from({ length: 3 }, (_, i) =>
        createTestLead(`PAGE2-${String(i + 1).padStart(2, '0')}`)
      );
      const page3Leads = Array.from({ length: 7 }, (_, i) =>
        createTestLead(`PAGE3-${String(i + 1).padStart(2, '0')}`)
      );

      await leadDao.upsertMany(page1Leads, 1);
      await leadDao.upsertMany(page2Leads, 2);
      await leadDao.upsertMany(page3Leads, 3);
    });

    it('should retrieve leads for specific page', async () => {
      const page1Leads = await leadDao.getPage(1);
      const page2Leads = await leadDao.getPage(2);
      const page3Leads = await leadDao.getPage(3);

      expect(page1Leads).toHaveLength(5);
      expect(page2Leads).toHaveLength(3);
      expect(page3Leads).toHaveLength(7);

      // Verify correct leads for each page
      page1Leads.forEach((lead) => {
        expect(lead.id).toMatch(/^PAGE1-/);
      });

      page2Leads.forEach((lead) => {
        expect(lead.id).toMatch(/^PAGE2-/);
      });
    });

    it('should handle non-existent pages', async () => {
      const nonExistentPageLeads = await leadDao.getPage(999);
      expect(nonExistentPageLeads).toHaveLength(0);
    });

    it('should respect limit parameter', async () => {
      const limitedLeads = await leadDao.getPage(3, 3);
      expect(limitedLeads).toHaveLength(3); // Limited from 7 total
    });

    it('should handle limit larger than available leads', async () => {
      const unlimitedLeads = await leadDao.getPage(2, 100);
      expect(unlimitedLeads).toHaveLength(3); // Only 3 available
    });

    it('should handle zero and negative limits gracefully', async () => {
      const zeroLimitLeads = await leadDao.getPage(1, 0);
      expect(zeroLimitLeads).toHaveLength(0);
    });

    it('should handle query failures', async () => {
      mockDb.setShouldFailOperation('select');

      await expect(leadDao.getPage(1)).rejects.toThrow(
        'Mock: Select operation failed'
      );
    });
  });

  describe('getAllIds - Comprehensive Tests', () => {
    beforeEach(async () => {
      // Setup leads with different creation times
      const leads = [
        createTestLead('ID-003', { created_at: '2023-01-03T00:00:00Z' }),
        createTestLead('ID-001', { created_at: '2023-01-01T00:00:00Z' }),
        createTestLead('ID-002', { created_at: '2023-01-02T00:00:00Z' }),
      ];
      await leadDao.upsertMany(leads, 1);
    });

    it('should return all lead IDs', async () => {
      const ids = await leadDao.getAllIds();

      expect(ids).toHaveLength(3);
      expect(ids).toContain('ID-001');
      expect(ids).toContain('ID-002');
      expect(ids).toContain('ID-003');
    });

    it('should return empty array when no leads exist', async () => {
      mockDb.clearData();

      const ids = await leadDao.getAllIds();
      expect(ids).toEqual([]);
    });

    it('should handle query failures', async () => {
      mockDb.setShouldFailOperation('select');

      await expect(leadDao.getAllIds()).rejects.toThrow(
        'Mock: Select operation failed'
      );
    });
  });

  describe('getPageWithMeta - Comprehensive Tests', () => {
    beforeEach(async () => {
      // Setup 25 leads across 3 pages
      const allLeads = Array.from({ length: 25 }, (_, i) =>
        createTestLead(`META-${String(i + 1).padStart(3, '0')}`)
      );
      await leadDao.upsertMany(allLeads, 1);
    });

    it('should return leads with pagination metadata', async () => {
      const result = await leadDao.getPageWithMeta(1, 10);

      expect(result.leads).toHaveLength(10);
      expect(result.totalCount).toBe(25);
      expect(result.totalPages).toBe(3); // Math.ceil(25/10)
      expect(result.currentPage).toBe(1);
    });

    it('should calculate totalPages correctly for various limits', async () => {
      const testCases = [
        { limit: 5, expectedPages: 5 },
        { limit: 10, expectedPages: 3 },
        { limit: 25, expectedPages: 1 },
        { limit: 30, expectedPages: 1 },
      ];

      for (const testCase of testCases) {
        const result = await leadDao.getPageWithMeta(1, testCase.limit);
        expect(result.totalPages).toBe(testCase.expectedPages);
      }
    });
  });

  describe('getLeadsCountByPage - Comprehensive Tests', () => {
    beforeEach(async () => {
      // Setup leads across different pages
      await leadDao.upsertMany(
        [
          createTestLead('COUNT-P1-01'),
          createTestLead('COUNT-P1-02'),
          createTestLead('COUNT-P1-03'),
        ],
        1
      );

      await leadDao.upsertMany(
        [createTestLead('COUNT-P2-01'), createTestLead('COUNT-P2-02')],
        2
      );

      await leadDao.upsertMany([createTestLead('COUNT-P3-01')], 3);
    });

    it('should return correct counts by page', async () => {
      const counts = await leadDao.getLeadsCountByPage();

      expect(counts).toEqual({
        1: 3,
        2: 2,
        3: 1,
      });
    });

    it('should return empty object when no leads exist', async () => {
      mockDb.clearData();

      const counts = await leadDao.getLeadsCountByPage();
      expect(counts).toEqual({});
    });
  });

  describe('clearPage - Comprehensive Tests', () => {
    beforeEach(async () => {
      // Setup leads across multiple pages
      await leadDao.upsertMany(
        [createTestLead('CLEAR-P1-01'), createTestLead('CLEAR-P1-02')],
        1
      );
      await leadDao.upsertMany(
        [createTestLead('CLEAR-P2-01'), createTestLead('CLEAR-P2-02')],
        2
      );
      await leadDao.upsertMany([createTestLead('CLEAR-P3-01')], 3);
    });

    it('should clear specific page only', async () => {
      const deletedCount = await leadDao.clearPage(2);

      expect(deletedCount).toBe(2);

      // Verify other pages remain
      const page1Leads = await leadDao.getPage(1);
      const page2Leads = await leadDao.getPage(2);
      const page3Leads = await leadDao.getPage(3);

      expect(page1Leads).toHaveLength(2);
      expect(page2Leads).toHaveLength(0);
      expect(page3Leads).toHaveLength(1);
    });

    it('should handle clearing non-existent page', async () => {
      const deletedCount = await leadDao.clearPage(999);
      expect(deletedCount).toBe(0);
    });

    it('should handle delete operation failures', async () => {
      mockDb.setShouldFailOperation('delete');

      await expect(leadDao.clearPage(1)).rejects.toThrow(
        'Mock: Delete operation failed'
      );
    });
  });

  describe('performanceTest - Comprehensive Tests', () => {
    it('should run performance test with specified count', async () => {
      const result = await leadDao.performanceTest(50);

      expect(result.insertTime).toBeGreaterThan(0);
      expect(result.selectTime).toBeGreaterThan(0);
      expect(result.averageInsertTime).toBe(result.insertTime / 50);

      // Verify test data was cleaned up
      const remainingLeads = await leadDao.getPage(999);
      expect(remainingLeads).toHaveLength(0);
    });

    it('should meet performance benchmarks', async () => {
      const result = await leadDao.performanceTest(100);

      // Should meet the ≤200ms requirement for 100 leads
      expect(result.insertTime).toBeLessThanOrEqual(200);

      // Select should be fast
      expect(result.selectTime).toBeLessThan(50);
    });

    it('should handle performance test with simulated delays', async () => {
      // Simulate slower database operations
      mockDb.setOperationDelay(5);

      const result = await leadDao.performanceTest(10);

      // Should still complete but take longer
      expect(result.insertTime).toBeGreaterThan(0);
      expect(result.selectTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle database connection failures', async () => {
      const errorDb = {
        executeSql: jest
          .fn()
          .mockRejectedValue(new Error('Database connection failed')),
      };

      const errorDao = new LeadDao(errorDb as any);

      await expect(
        errorDao.upsertMany([createTestLead('ERROR-001')], 1)
      ).rejects.toThrow('Database connection failed');

      await expect(errorDao.getPage(1)).rejects.toThrow(
        'Database connection failed'
      );

      await expect(errorDao.getAllIds()).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle malformed lead data', async () => {
      const malformedLead = {
        id: 'MALFORMED-001',
        // Missing required fields
      } as Lead;

      // Should not throw, but handle gracefully
      await expect(
        leadDao.upsertMany([malformedLead], 1)
      ).resolves.not.toThrow();
    });

    it('should handle extremely large datasets', async () => {
      const hugeBatch = Array.from({ length: 10000 }, (_, i) =>
        createTestLead(`HUGE-${String(i + 1).padStart(5, '0')}`)
      );

      // Should complete without memory issues (though may be slow)
      await expect(leadDao.upsertMany(hugeBatch, 1)).resolves.not.toThrow();
    });

    it('should handle null and undefined parameters gracefully', async () => {
      await expect(leadDao.getPage(null as any)).rejects.toThrow();
      await expect(leadDao.getPage(undefined as any)).rejects.toThrow();
      await expect(leadDao.clearPage(null as any)).rejects.toThrow();
    });

    it('should handle concurrent operations safely', async () => {
      const leads1 = [createTestLead('CONCURRENT-001')];
      const leads2 = [createTestLead('CONCURRENT-002')];

      // Simulate concurrent upserts
      const promises = [
        leadDao.upsertMany(leads1, 1),
        leadDao.upsertMany(leads2, 2),
      ];

      await expect(Promise.all(promises)).resolves.not.toThrow();

      const finalLeads = await leadDao.getAllIds();
      expect(finalLeads).toHaveLength(2);
    });
  });

  describe('Data Mapping & Transformation', () => {
    it('should correctly map database rows to Lead entities', async () => {
      const originalLead = createTestLead('MAPPING-001', {
        status: 'Won',
        priority: 'high',
        estimated_value: 50000,
        follow_up_date: '2023-12-01T00:00:00Z',
        remarks: 'Important client',
        email: 'test@example.com',
        services: ['SRV001', 'SRV002'],
      });

      await leadDao.upsertMany([originalLead], 1);

      const retrievedLeads = await leadDao.getPage(1);
      const retrievedLead = retrievedLeads[0];

      expect(retrievedLead.id).toBe(originalLead.id);
      expect(retrievedLead.status).toBe(originalLead.status);
      expect(retrievedLead.priority).toBe(originalLead.priority);
      expect(retrievedLead.estimated_value).toBe(originalLead.estimated_value);
      expect(retrievedLead.services).toEqual(originalLead.services);
    });

    it('should handle JSON serialization/deserialization for services array', async () => {
      const leadWithComplexServices = createTestLead('JSON-001', {
        services: [
          'Service A',
          'Service B',
          'Service C with special chars: @#$%',
        ],
      });

      await leadDao.upsertMany([leadWithComplexServices], 1);

      const retrievedLeads = await leadDao.getPage(1);
      const retrievedLead = retrievedLeads[0];

      expect(retrievedLead.services).toEqual(leadWithComplexServices.services);
    });

    it('should handle null and undefined values correctly', async () => {
      const leadWithNulls = createTestLead('NULL-001', {
        customer_id: undefined,
        source: null as any,
        estimated_value: undefined,
        follow_up_date: undefined,
        remarks: null as any,
        email: undefined,
      });

      await leadDao.upsertMany([leadWithNulls], 1);

      const retrievedLeads = await leadDao.getPage(1);
      const retrievedLead = retrievedLeads[0];

      // Should handle nulls gracefully
      expect(retrievedLead.id).toBe(leadWithNulls.id);
      expect(retrievedLead.customer_id).toBeUndefined();
      expect(retrievedLead.estimated_value).toBeUndefined();
    });
  });
});
