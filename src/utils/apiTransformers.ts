/**
 * API Response Transformation Utilities
 */
import type { SasTokenResponse } from '../types/api/document';

/**
 * Transform SAS token response from backend
 */
export const transformSasResponse = (response: any): SasTokenResponse => {
  if (!response.success || !response.data?.sasUrl) {
    throw new Error('Invalid SAS token response: missing required fields');
  }

  return {
    success: true,
    data: {
      sasUrl: response.data.sasUrl,
    },
  };
};

/**
 * Transform error response with user-friendly messages
 */
export const transformErrorResponse = (response: any, context: string) => {
  console.error(`❌ ${context} error:`, response);

  // Handle specific error cases
  if (response.status === 409) {
    return {
      status: 409,
      data: {
        message:
          'Document limit reached. Maximum 7 documents allowed per lead.',
        error: 'DOCUMENT_LIMIT_EXCEEDED',
      },
    };
  }

  if (response.status === 401) {
    return {
      status: 401,
      data: {
        message: 'Authentication required. Please log in again.',
        error: 'UNAUTHORIZED',
      },
    };
  }

  return response;
};
