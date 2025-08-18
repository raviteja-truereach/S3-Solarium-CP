/**
 * Sync System Integration Tests
 * Tests page-aware sync with validation and atomic persistence
 */
import { SQLiteDatabase } from 'react-native-sqlite-storage';
import {
  SyncManager,
  SyncEvents,
  SyncFailureReason,
} from '../../sync/SyncManager';
import { LeadDao } from '../../database/dao/LeadDao';
import { Lead } from '../../database/models/Lead';

// Mock fetch for testing
global.fetch = jest.fn();

// Mock database
class MockSyncDatabase {
  private data: Map<string, any[]> = new Map();
  private inTransaction = false;
  private shouldFailTransaction = false;

  constructor() {
    this.data.set('leads', []);
    this.data.set('sync_metadata', []);
  }

  setShouldFailTransaction(fail: boolean) {
    this.shouldFailTransaction = fail;
  }

  async executeSql(query: string, params: any[] = []): Promise<any[]> {
    console.log('Mock SQL:', query, params);

    if (query.includes('BEGIN TRANSACTION')) {
      this.inTransaction = true;
      if (
        this.shouldFailTransaction &&
        query.includes('some_failure_trigger')
      ) {
        throw new Error('Mock transaction failure');
      }
      return [{ rows: { length: 0 } }];
    }

    if (query.includes('COMMIT')) {
      if (this.shouldFailTransaction) {
        throw new Error('Mock commit failure');
      }
      this.inTransaction = false;
      return [{ rows: { length: 0 } }];
    }

    if (query.includes('ROLLBACK')) {
      this.inTransaction = false;
      return [{ rows: { length: 0 } }];
    }

    // Handle INSERT OR REPLACE for leads
    if (query.includes('INSERT OR REPLACE INTO leads')) {
      const leadsData = this.data.get('leads') || [];
      // Mock successful insert
      leadsData.push({
        id: params[0],
        customerName: params[16],
        page_number: params[19],
      });
      this.data.set('leads', leadsData);
      return [{ rowsAffected: 1 }];
    }

    // Handle sync_metadata insert
    if (query.includes('INSERT OR REPLACE INTO sync_metadata')) {
      const metadataData = this.data.get('sync_metadata') || [];
      metadataData.push({
        id: params[0],
        entity_type: params[1],
        last_sync: params[3],
      });
      this.data.set('sync_metadata', metadataData);
      return [{ rowsAffected: 1 }];
    }

    // Handle SELECT queries
    if (query.includes('SELECT') && query.includes('sync_metadata')) {
      const metadataData = this.data.get('sync_metadata') || [];
      return [
        {
          rows: {
            length: metadataData.length,
            item: (index: number) => metadataData[index],
          },
        },
      ];
    }

    return [{ rows: { length: 0 } }];
  }

  getLeadsData() {
    return this.data.get('leads') || [];
  }

  getSyncMetadata() {
    return this.data.get('sync_metadata') || [];
  }
}

describe('SyncSystemIntegration', () => {
  let mockDb: MockSyncDatabase;
  let syncManager: SyncManager;
  const mockAuthToken = 'test-auth-token';

  beforeEach(() => {
    mockDb = new MockSyncDatabase();
    syncManager = new SyncManager(mockDb as any, mockAuthToken);
    (fetch as jest.Mock).mockClear();
  });

  describe('Happy Path - Multi-page sync success', () => {
    it('should sync 3 pages of leads atomically', async () => {
      // Mock API responses for 3 pages
      const mockPage1Response = {
        success: true,
        data: {
          items: [
            {
              leadId: 'LEAD-001',
              customerName: 'Customer 1',
              phone: '1111111111',
              address: 'Address 1',
              status: 'New Lead',
              services: ['SRV001'],
              assignedTo: 'CP-001',
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            },
            {
              leadId: 'LEAD-002',
              customerName: 'Customer 2',
              phone: '2222222222',
              address: 'Address 2',
              status: 'In Discussion',
              services: ['SRV002'],
              assignedTo: 'CP-001',
              createdAt: '2023-01-02T00:00:00Z',
              updatedAt: '2023-01-02T00:00:00Z',
            },
          ],
          total: 60,
          offset: 0,
          limit: 25,
        },
      };

      const mockPage2Response = {
        success: true,
        data: {
          items: Array.from({ length: 25 }, (_, i) => ({
            leadId: `LEAD-P2-${i.toString().padStart(3, '0')}`,
            customerName: `Page 2 Customer ${i}`,
            phone: `222222222${i}`,
            address: `Page 2 Address ${i}`,
            status: 'New Lead',
            services: ['SRV001'],
            assignedTo: 'CP-001',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          })),
          total: 60,
          offset: 25,
          limit: 25,
        },
      };

      const mockPage3Response = {
        success: true,
        data: {
          items: Array.from({ length: 10 }, (_, i) => ({
            leadId: `LEAD-P3-${i.toString().padStart(3, '0')}`,
            customerName: `Page 3 Customer ${i}`,
            phone: `333333333${i}`,
            address: `Page 3 Address ${i}`,
            status: 'Won',
            services: ['SRV003'],
            assignedTo: 'CP-001',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          })),
          total: 60,
          offset: 50,
          limit: 25,
        },
      };

      // Mock fetch responses
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPage1Response,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPage2Response,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPage3Response,
        });

      // Track sync events
      const events: any[] = [];
      syncManager.on(SyncEvents.SYNC_STARTED, () => events.push('STARTED'));
      syncManager.on(SyncEvents.SYNC_PROGRESS, (progress) =>
        events.push({ type: 'PROGRESS', ...progress })
      );
      syncManager.on(SyncEvents.SYNC_FINISHED, (result) =>
        events.push({ type: 'FINISHED', ...result })
      );
      syncManager.on(SyncEvents.SYNC_FAILED, (result) =>
        events.push({ type: 'FAILED', ...result })
      );

      // Perform sync
      const result = await syncManager.performSync();

      // Verify result
      expect(result.success).toBe(true);
      expect(result.recordCounts.leads).toBe(37); // 2 + 25 + 10
      expect(result.pagesProcessed).toBe(3);
      expect(result.failureReason).toBeUndefined();

      // Verify API calls
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/api/v1/leads?offset=0&limit=25'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAuthToken}`,
          }),
        })
      );

      // Verify events
      expect(events[0]).toBe('STARTED');
      expect(events.filter((e) => e.type === 'PROGRESS')).toHaveLength(3);
      expect(events[events.length - 1].type).toBe('FINISHED');

      // Verify database state
      const leadsData = mockDb.getLeadsData();
      expect(leadsData.length).toBe(37);

      // Verify sync metadata was updated
      const syncMetadata = mockDb.getSyncMetadata();
      expect(syncMetadata.length).toBe(1);
      expect(syncMetadata[0].entity_type).toBe('leads');
    });
  });

  describe('Failure Path - Mid-page failure', () => {
    it('should rollback transaction when page 2 fails', async () => {
      // Mock successful page 1
      const mockPage1Response = {
        success: true,
        data: {
          items: [
            {
              leadId: 'LEAD-001',
              customerName: 'Customer 1',
              phone: '1111111111',
              address: 'Address 1',
              status: 'New Lead',
              services: ['SRV001'],
              assignedTo: 'CP-001',
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            },
          ],
          total: 50,
          offset: 0,
          limit: 25,
        },
      };

      // Mock fetch responses - page 1 success, page 2 failure
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPage1Response,
        })
        .mockRejectedValueOnce(new Error('Network error on page 2'));

      // Track sync events
      const events: any[] = [];
      syncManager.on(SyncEvents.SYNC_FAILED, (result) =>
        events.push({ type: 'FAILED', ...result })
      );

      // Perform sync - should fail
      const result = await syncManager.performSync();

      // Verify result
      expect(result.success).toBe(false);
      expect(result.recordCounts.leads).toBe(0);
      expect(result.failureReason).toBe(SyncFailureReason.LEADS_INCOMPLETE);
      expect(result.error).toContain('Leads sync incomplete');

      // Verify rollback occurred - no leads should be persisted
      const leadsData = mockDb.getLeadsData();
      expect(leadsData.length).toBe(0);

      // Verify sync metadata was NOT updated
      const syncMetadata = mockDb.getSyncMetadata();
      expect(syncMetadata.length).toBe(0);

      // Verify failure event
      expect(events[0].type).toBe('FAILED');
      expect(events[0].failureReason).toBe(SyncFailureReason.LEADS_INCOMPLETE);
    });

    it('should handle database transaction failure', async () => {
      // Configure mock DB to fail transaction
      mockDb.setShouldFailTransaction(true);

      // Mock successful API response
      const mockResponse = {
        success: true,
        data: {
          items: [
            {
              leadId: 'LEAD-001',
              customerName: 'Customer 1',
              phone: '1111111111',
              address: 'Address 1',
              status: 'New Lead',
              services: ['SRV001'],
              assignedTo: 'CP-001',
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            },
          ],
          total: 1,
          offset: 0,
          limit: 25,
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Perform sync - should fail due to DB error
      const result = await syncManager.performSync();

      // Verify result
      expect(result.success).toBe(false);
      expect(result.failureReason).toBe(SyncFailureReason.LEADS_INCOMPLETE);

      // Verify no data was persisted
      const leadsData = mockDb.getLeadsData();
      expect(leadsData.length).toBe(0);

      // Verify sync metadata was NOT updated
      const syncMetadata = mockDb.getSyncMetadata();
      expect(syncMetadata.length).toBe(0);
    });
  });

  describe('Validation Failure', () => {
    it('should skip invalid leads but continue sync', async () => {
      // Mock response with mix of valid and invalid leads
      const mockResponse = {
        success: true,
        data: {
          items: [
            // Valid lead
            {
              leadId: 'LEAD-001',
              customerName: 'Valid Customer',
              phone: '1111111111',
              address: 'Valid Address',
              status: 'New Lead',
              services: ['SRV001'],
              assignedTo: 'CP-001',
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            },
            // Invalid lead - missing required fields
            {
              leadId: 'LEAD-002',
              // Missing customerName, phone, etc.
              status: 'Invalid Lead',
            },
            // Another valid lead
            {
              leadId: 'LEAD-003',
              customerName: 'Another Valid Customer',
              phone: '3333333333',
              address: 'Another Valid Address',
              status: 'In Discussion',
              services: ['SRV002'],
              assignedTo: 'CP-001',
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
            },
          ],
          total: 3,
          offset: 0,
          limit: 25,
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Perform sync
      const result = await syncManager.performSync();

      // Should succeed with only valid leads
      expect(result.success).toBe(true);
      expect(result.recordCounts.leads).toBe(2); // Only 2 valid leads

      // Verify only valid leads were persisted
      const leadsData = mockDb.getLeadsData();
      expect(leadsData.length).toBe(2);
      expect(
        leadsData.find((lead: any) => lead.id === 'LEAD-002')
      ).toBeUndefined();
    });
  });

  describe('Throttling and Mutex', () => {
    it('should prevent concurrent syncs', async () => {
      // Mock a slow API response
      (fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    success: true,
                    data: { items: [], total: 0, offset: 0, limit: 25 },
                  }),
                }),
              100
            )
          )
      );

      // Start first sync
      const sync1Promise = syncManager.performSync();

      // Try to start second sync immediately
      await expect(syncManager.performSync()).rejects.toThrow(
        'Sync already in progress'
      );

      // Wait for first sync to complete
      await sync1Promise;

      // Now second sync should be allowed
      const sync2Result = await syncManager.performSync();
      expect(sync2Result.success).toBe(true);
    });
  });
});
