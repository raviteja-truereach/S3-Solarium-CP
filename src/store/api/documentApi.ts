import { baseApi } from './baseApi'; // Use your existing baseApi
import type {
  KycSasTokenRequest,
  LeadDocSasTokenRequest,
  SasTokenResponse,
  DocumentListResponse,
  DocumentCountResponse,
} from '../../types/api/document';

export interface DocumentViewSasRequest {
  /** Document ID for viewing */
  docId: string;
}

/**
 * Document API service for SAS token requests and document management
 */
export const documentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Request SAS token for KYC document upload
     */
    getKycSasToken: builder.mutation<SasTokenResponse, KycSasTokenRequest>({
      query: (tokenRequest) => {
        console.log('🔐 Requesting KYC SAS token for:', tokenRequest);
        return {
          url: '/api/v1/kycDocuments',
          method: 'POST',
          body: {
            leadId: tokenRequest.leadId,
            customerId: tokenRequest.customerId,
            docType: tokenRequest.docType,
          },
        };
      },
      transformResponse: (response: any): SasTokenResponse => {
        console.log('✅ KYC SAS token response:', response);

        if (!response.success || !response.data?.sasUrl) {
          throw new Error(
            'Invalid SAS token response: missing required fields'
          );
        }

        return {
          success: true,
          data: {
            sasUrl: response.data.sasUrl,
          },
        };
      },
      invalidatesTags: (result, error, { leadId }) => [
        { type: 'Lead', id: leadId },
      ],
    }),

    /**
     * Request SAS token for lead document upload
     */
    getLeadDocSasToken: builder.mutation<
      SasTokenResponse,
      LeadDocSasTokenRequest
    >({
      query: (tokenRequest) => {
        console.log('📄 Requesting Lead Document SAS token for:', tokenRequest);
        return {
          url: '/api/v1/leadDocuments',
          method: 'POST',
          body: {
            leadId: tokenRequest.leadId,
            docType: tokenRequest.docType,
          },
        };
      },
      transformResponse: (response: any): SasTokenResponse => {
        console.log('✅ Lead Document SAS token response:', response);

        if (!response.success || !response.data?.sasUrl) {
          throw new Error(
            'Invalid SAS token response: missing required fields'
          );
        }

        return {
          success: true,
          data: {
            sasUrl: response.data.sasUrl,
          },
        };
      },
      invalidatesTags: (result, error, { leadId }) => [
        { type: 'Lead', id: leadId },
      ],
    }),

    /**
     * Get documents list for a lead
     */
    getDocumentsByLead: builder.query<DocumentListResponse, string>({
      query: (leadId) => {
        console.log('📋 Fetching documents for lead:', leadId);
        return {
          url: `/api/v1/leadDocuments?leadId=${leadId}`,
          method: 'GET',
        };
      },
      transformResponse: (response: any): DocumentListResponse => {
        console.log('✅ Documents list response:', response);

        if (!response.success) {
          throw new Error('Failed to fetch documents');
        }

        return {
          success: true,
          data: {
            documents: response.data.documents || [],
          },
        };
      },
      providesTags: (result, error, leadId) => [{ type: 'Lead', id: leadId }],
    }),

    /**
     * Get document count for a lead (derived from documents list)
     */
    getDocumentCount: builder.query<DocumentCountResponse, string>({
      query: (leadId) => {
        console.log('🔢 Fetching document count for lead:', leadId);
        return {
          url: `/api/v1/leadDocuments?leadId=${leadId}`,
          method: 'GET',
        };
      },
      transformResponse: (response: any): DocumentCountResponse => {
        console.log('✅ Document count response:', response);

        if (!response.success) {
          throw new Error('Failed to fetch document count');
        }

        const count = response.data.documents?.length || 0;
        const maxDocuments = 7; // Business rule
        console.log('lead document count ---->', count);
        return {
          success: true,
          data: {
            count,
            maxDocuments,
            limitReached: count >= maxDocuments,
          },
        };
      },
      providesTags: (result, error, leadId) => [{ type: 'Lead', id: leadId }],
    }),

    /**
     * Get SAS token for viewing existing document
     */
    getDocumentViewSas: builder.mutation<
      SasTokenResponse,
      DocumentViewSasRequest
    >({
      query: (request) => {
        console.log('👁️ Requesting document view SAS token for:', request);
        return {
          url: `/api/v1/documents/sas?docId=${request.docId}`,
          method: 'GET',
        };
      },
      transformResponse: (response: any): SasTokenResponse => {
        console.log('✅ Document view SAS token response:', response);

        if (!response.success || !response.data?.sasUrl) {
          throw new Error(
            'Invalid view SAS token response: missing required fields'
          );
        }

        return {
          success: true,
          data: {
            sasUrl: response.data.sasUrl,
          },
        };
      },
    }),

    /**
     * Check document count before upload to prevent limit exceeded errors
     */
    checkDocumentLimitBeforeUpload: builder.query<
      { canUpload: boolean; currentCount: number; maxCount: number },
      { leadId: string; documentsToUpload: number }
    >({
      query: ({ leadId }) => {
        console.log('🔍 Checking document limit for lead:', leadId);
        return {
          url: `/api/v1/leadDocuments?leadId=${leadId}`,
          method: 'GET',
        };
      },
      transformResponse: (
        response: any,
        meta,
        { documentsToUpload }
      ): { canUpload: boolean; currentCount: number; maxCount: number } => {
        console.log('📊 Document limit check response:', response);

        if (!response.success) {
          throw new Error('Failed to check document limit');
        }

        const currentCount = response.data.documents?.length || 0;
        const maxCount = 7; // Business rule
        const wouldExceed = currentCount + documentsToUpload > maxCount;

        console.log('📊 Limit check result:', {
          currentCount,
          documentsToUpload,
          maxCount,
          wouldExceed,
        });

        return {
          canUpload: !wouldExceed,
          currentCount,
          maxCount,
        };
      },
      providesTags: (result, error, { leadId }) => [
        { type: 'Lead', id: leadId },
      ],
    }),
    /**
     * Get KYC documents for a specific customer
     * GET /api/v1/kycDocuments?customerId={customerId}
     */
    getCustomerDocuments: builder.query<
      import('../../types/api/customer').CustomerDocumentsResponse,
      string
    >({
      query: (customerId) => {
        console.log('📋 Fetching KYC documents for customer:', customerId);
        return {
          url: `/api/v1/kycDocuments?customerId=${customerId}`,
          method: 'GET',
        };
      },
      transformResponse: (
        response: import('../../types/api/customer').CustomerDocumentsResponse
      ) => {
        console.log('✅ Customer documents response:', response);

        if (!response.success) {
          throw new Error('Failed to fetch customer documents');
        }

        return response;
      },
      providesTags: (result, error, customerId) => [
        { type: 'Customer', id: customerId },
        { type: 'Lead', id: `CUSTOMER_DOCS_${customerId}` },
      ],
      // Cache for 5 minutes
      keepUnusedDataFor: 300,
    }),
  }),
});

// Export hooks for use in components
export const {
  useGetKycSasTokenMutation,
  useGetLeadDocSasTokenMutation,
  useGetDocumentsByLeadQuery,
  useLazyGetDocumentsByLeadQuery,
  useGetDocumentCountQuery,
  useLazyGetDocumentCountQuery,
  useGetDocumentViewSasMutation,
  useCheckDocumentLimitBeforeUploadQuery,
  useLazyCheckDocumentLimitBeforeUploadQuery,
  useGetCustomerDocumentsQuery,
  useLazyGetCustomerDocumentsQuery,
} = documentApi;

// Note: No need to export documentApi again when using injectEndpoints
