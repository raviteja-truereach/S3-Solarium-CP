/**
 * Document DAO - Document Data Access Object
 * Handles CRUD operations for documents table following LeadDao patterns
 */
import type { SQLiteDatabase } from 'react-native-sqlite-storage';
import type {
  Document,
  CreateDocumentRequest,
  ApiDocument,
} from '../models/Document';
import type {
  KycDocument,
  CreateKycDocumentRequest,
  ApiKycDocument,
  KycStatus,
} from '../models/Document';

export class DocumentDao {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Helper function to promisify SQLite operations
   */
  private executeSql(query: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.executeSql(
        query,
        params,
        (result) => {
          console.log(`✅ SQL Success: ${query.substring(0, 50)}...`);
          resolve(result);
        },
        (error) => {
          console.error(`❌ SQL Error: ${query.substring(0, 50)}...`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Create document record
   */
  async create(document: CreateDocumentRequest): Promise<Document> {
    console.log('📄 Creating document:', document.id);

    try {
      const now = new Date().toISOString();

      await this.executeSql(
        `
        INSERT INTO documents (
          id, lead_id, doc_type, status, uploaded_at, uploaded_by,
          created_at, updated_at, sync_status, local_changes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          document.id,
          document.leadId,
          document.docType,
          document.status || 'pending',
          document.uploadedAt,
          document.uploadedBy,
          now,
          now,
          'synced',
          '{}',
        ]
      );

      console.log('✅ Document created successfully:', document.id);

      // Return the created document
      return {
        id: document.id,
        leadId: document.leadId,
        docType: document.docType,
        status: document.status || 'pending',
        uploadedAt: document.uploadedAt,
        uploadedBy: document.uploadedBy,
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
        local_changes: '{}',
      };
    } catch (error) {
      console.error('❌ Error creating document:', error);
      throw error;
    }
  }

  /**
   * Find documents by lead ID
   */
  async findByLeadId(leadId: string): Promise<Document[]> {
    console.log('🔍 Finding documents for lead:', leadId);

    try {
      const query = `
        SELECT * FROM documents
        WHERE lead_id = ?
        ORDER BY uploaded_at DESC;
      `;

      const result = await this.executeSql(query, [leadId]);
      const documents: Document[] = [];

      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        documents.push(this.mapRowToEntity(row));
      }

      console.log(`✅ Found ${documents.length} documents for lead ${leadId}`);
      return documents;
    } catch (error) {
      console.error('❌ Error finding documents by lead ID:', error);
      throw error;
    }
  }

  /**
   * Get document count for a lead
   */
  async getCountByLeadId(leadId: string): Promise<number> {
    console.log('📊 Getting document count for lead:', leadId);

    try {
      const query = `
        SELECT COUNT(*) as count FROM documents
        WHERE lead_id = ?;
      `;

      const result = await this.executeSql(query, [leadId]);
      const count = result.rows.item(0).count;

      console.log(`✅ Document count for lead ${leadId}: ${count}`);
      return count;
    } catch (error) {
      console.error('❌ Error getting document count:', error);
      throw error;
    }
  }

  /**
   * Bulk upsert documents (server-wins strategy with updated_at comparison)
   */
  async bulkUpsert(documents: Document[]): Promise<void> {
    if (!documents || documents.length === 0) {
      console.log('⚠️ No documents to upsert');
      return;
    }

    console.log(`📄 Bulk upserting ${documents.length} documents`);

    try {
      // Begin transaction
      await this.executeSql('BEGIN TRANSACTION;');

      for (const document of documents) {
        // Check if document exists
        const existingResult = await this.executeSql(
          `SELECT updated_at FROM documents WHERE id = ?;`,
          [document.id]
        );

        let shouldUpdate = true;

        if (existingResult.rows.length > 0) {
          // Document exists - compare updated_at timestamps
          const existingUpdatedAt = existingResult.rows.item(0).updated_at;
          const newUpdatedAt = document.updated_at;

          // Server-wins strategy: only update if new document is newer
          if (new Date(existingUpdatedAt) >= new Date(newUpdatedAt)) {
            console.log(
              `⏭️ Skipping document ${document.id} - local version is newer or same`
            );
            shouldUpdate = false;
          }
        }

        if (shouldUpdate) {
          await this.executeSql(
            `
            INSERT OR REPLACE INTO documents (
              id, lead_id, doc_type, status, uploaded_at, uploaded_by,
              created_at, updated_at, sync_status, local_changes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            `,
            [
              document.id,
              document.leadId,
              document.docType,
              document.status,
              document.uploadedAt,
              document.uploadedBy,
              document.created_at,
              document.updated_at,
              document.sync_status || 'synced',
              document.local_changes || '{}',
            ]
          );
        }
      }

      // Commit transaction
      await this.executeSql('COMMIT;');

      console.log(
        `✅ Bulk upserted ${documents.length} documents successfully`
      );
    } catch (error) {
      console.error('❌ Error bulk upserting documents:', error);
      try {
        await this.executeSql('ROLLBACK;');
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError);
      }
      throw error;
    }
  }

  /**
   * Transform API document to database document
   */
  static transformApiToDocument(apiDoc: ApiDocument): Document {
    const now = new Date().toISOString();

    return {
      id: apiDoc.docId,
      leadId: apiDoc.leadId,
      docType: apiDoc.docType,
      status: apiDoc.status,
      uploadedAt: apiDoc.uploadedAt,
      uploadedBy: apiDoc.uploadedBy,
      created_at: now,
      updated_at: apiDoc.uploadedAt, // Use server timestamp for comparison
      sync_status: 'synced',
      local_changes: '{}',
    };
  }

  /**
   * Clear all documents for a lead
   */
  async clearByLeadId(leadId: string): Promise<number> {
    console.log(`🗑️ Clearing documents for lead ${leadId}`);

    try {
      const query = `DELETE FROM documents WHERE lead_id = ?;`;
      const result = await this.executeSql(query, [leadId]);

      console.log(
        `✅ Cleared ${result.rowsAffected} documents for lead ${leadId}`
      );
      return result.rowsAffected;
    } catch (error) {
      console.error(`❌ Error clearing documents for lead ${leadId}:`, error);
      throw error;
    }
  }

  /**
   * Map database row to Document entity
   */
  protected mapRowToEntity(row: any): Document {
    return {
      id: row.id,
      leadId: row.lead_id,
      docType: row.doc_type,
      status: row.status,
      uploadedAt: row.uploaded_at,
      uploadedBy: row.uploaded_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      sync_status: row.sync_status || 'synced',
      local_changes: row.local_changes || '{}',
    };
  }

  async findByCustomerId(customerId: string): Promise<KycDocument[]> {
    console.log('🔍 Finding KYC documents for customer:', customerId);

    try {
      const query = `
        SELECT * FROM documents
        WHERE customer_id = ?
        ORDER BY uploaded_at DESC;
      `;

      const result = await this.executeSql(query, [customerId]);
      const documents: KycDocument[] = [];

      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        documents.push(this.mapRowToKycDocument(row));
      }

      console.log(
        `✅ Found ${documents.length} KYC documents for customer ${customerId}`
      );
      return documents;
    } catch (error) {
      console.error('❌ Error finding KYC documents by customer ID:', error);
      throw error;
    }
  }

  /**
   * Get KYC status by customer ID with document breakdown (NEW METHOD for Sub-task 3)
   */
  async getKycStatusByCustomerId(customerId: string): Promise<KycStatus> {
    console.log('📊 Getting KYC status for customer:', customerId);

    try {
      const documents = await this.findByCustomerId(customerId);

      // Calculate document counts by status
      const approvedCount = documents.filter(
        (doc) => doc.status === 'Approved'
      ).length;
      const rejectedCount = documents.filter(
        (doc) => doc.status === 'Rejected'
      ).length;
      const pendingCount = documents.filter(
        (doc) => doc.status === 'Pending' || doc.status === 'pending'
      ).length;

      // Determine overall KYC status
      let overallStatus: KycStatus['overallStatus'] = 'pending';

      if (documents.length === 0) {
        overallStatus = 'pending';
      } else if (rejectedCount > 0) {
        overallStatus = 'rejected'; // Any rejection means overall rejection
      } else if (approvedCount === documents.length) {
        overallStatus = 'approved'; // All documents approved
      } else if (pendingCount > 0) {
        overallStatus = 'submitted'; // Some documents submitted, waiting for approval
      }

      const kycStatus: KycStatus = {
        customerId,
        overallStatus,
        documentCount: documents.length,
        approvedCount,
        rejectedCount,
        pendingCount,
        documents,
      };

      console.log(`✅ KYC Status for ${customerId}:`, {
        overall: overallStatus,
        total: documents.length,
        approved: approvedCount,
        rejected: rejectedCount,
        pending: pendingCount,
      });

      return kycStatus;
    } catch (error) {
      console.error('❌ Error getting KYC status:', error);
      throw error;
    }
  }

  /**
   * Create KYC document record
   */
  async createKycDocument(
    document: CreateKycDocumentRequest
  ): Promise<KycDocument> {
    console.log('📄 Creating KYC document:', document.id);

    try {
      const now = new Date().toISOString();

      await this.executeSql(
        `
        INSERT INTO documents (
          id, customer_id, doc_type, status, uploaded_at, uploaded_by,
          created_at, updated_at, sync_status, local_changes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          document.id,
          document.customerId,
          document.docType,
          document.status || 'pending',
          document.uploadedAt,
          document.uploadedBy,
          now,
          now,
          'synced',
          '{}',
        ]
      );

      console.log('✅ KYC document created successfully:', document.id);

      // Return the created document
      return {
        id: document.id,
        customerId: document.customerId,
        docType: document.docType,
        status: document.status || 'pending',
        uploadedAt: document.uploadedAt,
        uploadedBy: document.uploadedBy,
        created_at: now,
        updated_at: now,
        sync_status: 'synced',
        local_changes: '{}',
      };
    } catch (error) {
      console.error('❌ Error creating KYC document:', error);
      throw error;
    }
  }

  /**
   * Bulk upsert KYC documents from API
   */
  async bulkUpsertKycDocuments(kycDocuments: ApiKycDocument[]): Promise<void> {
    if (!kycDocuments || kycDocuments.length === 0) {
      console.log('⚠️ No KYC documents to upsert');
      return;
    }

    console.log(`📄 Bulk upserting ${kycDocuments.length} KYC documents`);

    try {
      await this.executeSql('BEGIN TRANSACTION;');

      for (const apiDoc of kycDocuments) {
        const document = this.transformApiKycToDocument(apiDoc);

        // Check if document exists
        const existingResult = await this.executeSql(
          `SELECT updated_at FROM documents WHERE id = ?;`,
          [document.id]
        );

        let shouldUpdate = true;

        if (existingResult.rows.length > 0) {
          // Document exists - compare timestamps (server-wins strategy)
          const existingUpdatedAt = existingResult.rows.item(0).updated_at;
          const newUpdatedAt = document.updated_at;

          if (new Date(existingUpdatedAt) >= new Date(newUpdatedAt)) {
            console.log(
              `⏭️ Skipping KYC document ${document.id} - local version is newer or same`
            );
            shouldUpdate = false;
          }
        }

        if (shouldUpdate) {
          await this.executeSql(
            `
            INSERT OR REPLACE INTO documents (
              id, customer_id, doc_type, status, uploaded_at, uploaded_by,
              created_at, updated_at, sync_status, local_changes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            `,
            [
              document.id,
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
      }

      await this.executeSql('COMMIT;');
      console.log(
        `✅ Bulk upserted ${kycDocuments.length} KYC documents successfully`
      );
    } catch (error) {
      console.error('❌ Error bulk upserting KYC documents:', error);
      try {
        await this.executeSql('ROLLBACK;');
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError);
      }
      throw error;
    }
  }

  /**
   * Transform API KYC document to database KYC document
   */
  private transformApiKycToDocument(apiDoc: ApiKycDocument): KycDocument {
    const now = new Date().toISOString();

    return {
      id: apiDoc.docId,
      customerId: apiDoc.customerId,
      docType: apiDoc.docType,
      status: apiDoc.status,
      uploadedAt: apiDoc.uploadedAt,
      uploadedBy: apiDoc.uploadedBy,
      created_at: now,
      updated_at: apiDoc.uploadedAt, // Use server timestamp
      sync_status: 'synced',
      local_changes: '{}',
    };
  }

  /**
   * Map database row to KYC Document entity
   */
  private mapRowToKycDocument(row: any): KycDocument {
    return {
      id: row.id,
      customerId: row.customer_id,
      docType: row.doc_type,
      status: row.status,
      uploadedAt: row.uploaded_at,
      uploadedBy: row.uploaded_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      sync_status: row.sync_status || 'synced',
      local_changes: row.local_changes || '{}',
    };
  }

  /**
   * Get KYC document count for a customer
   */
  async getKycCountByCustomerId(customerId: string): Promise<number> {
    console.log('📊 Getting KYC document count for customer:', customerId);

    try {
      const query = `
        SELECT COUNT(*) as count FROM documents
        WHERE customer_id = ?;
      `;

      const result = await this.executeSql(query, [customerId]);
      const count = result.rows.item(0).count;

      console.log(`✅ KYC document count for customer ${customerId}: ${count}`);
      return count;
    } catch (error) {
      console.error('❌ Error getting KYC document count:', error);
      throw error;
    }
  }

  /**
   * Clear all KYC documents for a customer
   */
  async clearKycByCustomerId(customerId: string): Promise<number> {
    console.log(`🗑️ Clearing KYC documents for customer ${customerId}`);

    try {
      const query = `DELETE FROM documents WHERE customer_id = ?;`;
      const result = await this.executeSql(query, [customerId]);

      console.log(
        `✅ Cleared ${result.rowsAffected} KYC documents for customer ${customerId}`
      );
      return result.rowsAffected;
    } catch (error) {
      console.error(
        `❌ Error clearing KYC documents for customer ${customerId}:`,
        error
      );
      throw error;
    }
  }
}
