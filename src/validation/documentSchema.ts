/**
 * Document Validation Schema (Simple JavaScript validation)
 * Validation for document upload with security checks
 */
import {
  MAX_FILE_SIZE,
  MAX_DOCUMENT_COUNT,
  SUPPORTED_DOCUMENT_TYPES,
} from '../constants/document';
import { DOCUMENT_VALIDATION_MESSAGES } from '../constants/strings';
// import {
//   validateFileContentMatch,
//   getFileSize,
//   checkFileAccess,
// } from '../utils/fileContentValidator';

/**
 * Document Input Interface
 */
export interface DocumentInput {
  uri: string;
  fileName: string;
  type: string;
  fileSize?: number;
}

/**
 * Document Validation Result Interface
 */
export interface DocumentValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: string[];
}

/**
 * Individual document validators
 */
export const documentValidators = {
  /**
   * Validate file size
   */
  fileSize: (sizeInBytes: number): string | null => {
    if (sizeInBytes <= 0) {
      return DOCUMENT_VALIDATION_MESSAGES.CORRUPTED_FILE;
    }
    if (sizeInBytes > MAX_FILE_SIZE) {
      return DOCUMENT_VALIDATION_MESSAGES.FILE_TOO_LARGE;
    }
    return null;
  },

  /**
   * Validate file type by extension
   */
  fileType: (filename: string): string | null => {
    if (!filename || filename.trim().length === 0) {
      return DOCUMENT_VALIDATION_MESSAGES.UNKNOWN_ERROR;
    }

    const extension = filename.toLowerCase().match(/\.[^.]+$/);
    if (!extension) {
      return DOCUMENT_VALIDATION_MESSAGES.UNSUPPORTED_TYPE;
    }

    const ext = extension[0];
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

    if (!supportedExtensions.includes(ext)) {
      return DOCUMENT_VALIDATION_MESSAGES.UNSUPPORTED_TYPE;
    }

    return null;
  },

  /**
   * Validate file type by MIME type
   */
  mimeType: (type: string): string | null => {
    if (!type || type.trim().length === 0) {
      return DOCUMENT_VALIDATION_MESSAGES.UNKNOWN_ERROR;
    }

    if (!SUPPORTED_DOCUMENT_TYPES.includes(type as any)) {
      return DOCUMENT_VALIDATION_MESSAGES.UNSUPPORTED_TYPE;
    }

    return null;
  },

  /**
   * Validate document count
   */
  documentCount: (currentCount: number, newCount: number): string | null => {
    if (currentCount < 0 || newCount < 0) {
      return DOCUMENT_VALIDATION_MESSAGES.UNKNOWN_ERROR;
    }

    if (currentCount + newCount > MAX_DOCUMENT_COUNT) {
      return DOCUMENT_VALIDATION_MESSAGES.MAX_DOCUMENTS_EXCEEDED;
    }

    return null;
  },
};

/**
 * Validate file content matches extension (async)
 */
export const validateFileContent = async (
  uri: string,
  expectedType: string
): Promise<string | null> => {
  // TODO: Implement file content validation for React Native
  // Currently disabled due to Node.js dependency conflicts
  console.log('File content validation skipped for React Native compatibility');
  return null;
};

/**
 * Validate single document (async)
 */
// export const validateDocument = async (
//   document: DocumentInput
// ): Promise<DocumentValidationResult> => {
//   const errors: Record<string, string> = {};
//   const warnings: string[] = [];

//   try {
//     // Validate file name
//     const fileTypeError = documentValidators.fileType(document.fileName);
//     if (fileTypeError) {
//       errors.fileName = fileTypeError;
//     }

//     // Validate MIME type
//     const mimeTypeError = documentValidators.mimeType(document.type);
//     if (mimeTypeError) {
//       errors.type = mimeTypeError;
//     }

//     // Validate file size (if provided)
//     if (document.fileSize !== undefined) {
//       const sizeError = documentValidators.fileSize(document.fileSize);
//       if (sizeError) {
//         errors.fileSize = sizeError;
//       }
//     }

//     // Validate file content (security check)
//     const contentError = await validateFileContent(document.uri, document.type);
//     if (contentError) {
//       errors.content = contentError;
//     }

//     return {
//       isValid: Object.keys(errors).length === 0,
//       errors,
//       warnings,
//     };
//   } catch (error) {
//     console.error('❌ Error validating document:', error);
//     return {
//       isValid: false,
//       errors: { general: DOCUMENT_VALIDATION_MESSAGES.UNKNOWN_ERROR },
//       warnings,
//     };
//   }
// };

/**
 * Validate multiple documents (batch validation)
 */
export const validateDocuments = async (
  documents: DocumentInput[],
  currentCount: number = 0
): Promise<DocumentValidationResult> => {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  try {
    // Validate document count
    const countError = documentValidators.documentCount(
      currentCount,
      documents.length
    );
    if (countError) {
      errors.count = countError;
      return { isValid: false, errors, warnings };
    }

    // Validate each document
    const validationPromises = documents.map(async (doc, index) => {
      const result = await validateDocument(doc);
      return { index, result };
    });

    const results = await Promise.all(validationPromises);

    // Collect errors from all documents
    results.forEach(({ index, result }) => {
      if (!result.isValid) {
        Object.keys(result.errors).forEach((field) => {
          errors[`document_${index}_${field}`] = result.errors[field];
        });
      }
      if (result.warnings) {
        warnings.push(...result.warnings);
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    console.error('❌ Error validating documents:', error);
    return {
      isValid: false,
      errors: { general: DOCUMENT_VALIDATION_MESSAGES.UNKNOWN_ERROR },
      warnings,
    };
  }
};

/**
 * Check if document is valid (simple check)
 */
export const isDocumentValid = async (
  document: DocumentInput
): Promise<boolean> => {
  const result = await validateDocument(document);
  return result.isValid;
};

/**
 * Get document validation error message
 */
export const getDocumentError = async (
  document: DocumentInput
): Promise<string | null> => {
  const result = await validateDocument(document);
  if (!result.isValid) {
    const firstError = Object.values(result.errors)[0];
    return firstError || DOCUMENT_VALIDATION_MESSAGES.UNKNOWN_ERROR;
  }
  return null;
};
