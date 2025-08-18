/**
 * Document Sync Service
 * Standalone document synchronization that works with both SyncManager implementations
 */
import type { SQLiteDatabase } from 'react-native-sqlite-storage';
import { DocumentDao } from '../database/dao/DocumentDao';
import { Document, ApiDocument } from '../database/models/Document';
import { Store } from '@reduxjs/toolkit';
import {
  setDocumentCount,
  clearLeadData,
} from '../store/slices/documentCountSlice';

export interface DocumentSyncResult {
  success: boolean;
  leadId: string;
  documentsSync: number;
  error?: string;
}

export class DocumentSyncService {
  constructor(
    private db: SQLiteDatabase,
    private authToken: string,
    private store?: Store<any>
  ) {}

  /**
   * Sync documents for a specific lead
   */
  async syncDocumentsByLead(leadId: string): Promise<DocumentSyncResult> {
    console.log('📄 Syncing documents for lead:', leadId);

    try {
      // Fetch documents from server
      const apiDocuments = await this.fetchDocumentsFromServer(leadId);

      if (apiDocuments.length === 0) {
        console.log('📄 No documents found on server for lead:', leadId);
        return {
          success: true,
          leadId,
          documentsSync: 0,
        };
      }

      // Transform API documents to database format
      const documents = apiDocuments.map(DocumentDao.transformApiToDocument);

      // Persist to SQLite with server-wins strategy
      const documentDao = new DocumentDao(this.db);
      await documentDao.bulkUpsert(documents);

      // Update Redux state if store is available
      if (this.store) {
        this.store.dispatch(
          setDocumentCount({
            leadId,
            count: documents.length,
          })
        );
      }

      console.log(`✅ Synced ${documents.length} documents for lead ${leadId}`);

      return {
        success: true,
        leadId,
        documentsSync: documents.length,
      };
    } catch (error: any) {
      console.error('❌ Document sync failed for lead:', leadId, error);

      return {
        success: false,
        leadId,
        documentsSync: 0,
        error: error.message || 'Document sync failed',
      };
    }
  }

  /**
   * Invalidate document cache for a lead and refresh from server
   */
  async invalidateLeadDocuments(leadId: string): Promise<void> {
    console.log('🔄 Invalidating document cache for lead:', leadId);

    try {
      // Clear Redux state
      if (this.store) {
        this.store.dispatch(clearLeadData(leadId));
      }

      // Sync fresh data from server
      await this.syncDocumentsByLead(leadId);

      console.log(
        '✅ Document cache invalidated and refreshed for lead:',
        leadId
      );
    } catch (error) {
      console.error('❌ Failed to invalidate document cache:', error);
      throw error;
    }
  }

  /**
   * Get cached document count for a lead
   */
  async getCachedDocumentCount(leadId: string): Promise<number> {
    try {
      const documentDao = new DocumentDao(this.db);
      return await documentDao.getCountByLeadId(leadId);
    } catch (error) {
      console.error('❌ Failed to get cached document count:', error);
      return 0;
    }
  }

  /**
   * Get cached documents for a lead
   */
  async getCachedDocuments(leadId: string): Promise<Document[]> {
    try {
      const documentDao = new DocumentDao(this.db);
      return await documentDao.findByLeadId(leadId);
    } catch (error) {
      console.error('❌ Failed to get cached documents:', error);
      return [];
    }
  }

  /**
   * Fetch documents from server API
   */
  private async fetchDocumentsFromServer(
    leadId: string
  ): Promise<ApiDocument[]> {
    const url = `https://truereach-production.up.railway.app/api/v1/leadDocuments?leadId=${leadId}`;

    console.log('🌐 Fetching documents from server:', url);

    try {
      const response = await fetch(url, {
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

      if (!data.success || !data.data || !Array.isArray(data.data.documents)) {
        console.log('📄 No documents found or invalid response structure');
        return [];
      }

      console.log(
        `✅ Fetched ${data.data.documents.length} documents from server`
      );
      return data.data.documents;
    } catch (error) {
      console.error('❌ Failed to fetch documents from server:', error);
      throw error;
    }
  }
}
