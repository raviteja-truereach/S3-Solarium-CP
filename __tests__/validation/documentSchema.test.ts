// Mock dependencies
jest.mock('react-native-fs', () => ({
  exists: jest.fn(),
  stat: jest.fn(),
  read: jest.fn(),
}));

jest.mock('file-type', () => ({
  fileTypeFromBuffer: jest.fn(),
}));

import {
  documentValidators,
  validateDocument,
  validateDocuments,
  validateFileContent,
  isDocumentValid,
  getDocumentError,
} from '../../src/validation/documentSchema';
import { DOCUMENT_VALIDATION_MESSAGES } from '../../src/constants/strings';
import {
  MAX_FILE_SIZE,
  MAX_DOCUMENT_COUNT,
} from '../../src/constants/document';

const mockRNFS = require('react-native-fs');
const mockFileType = require('file-type');

describe('Document Validation Schema', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockRNFS.exists.mockResolvedValue(true);
    mockRNFS.stat.mockResolvedValue({ size: 1024 * 1024 }); // 1MB
    mockRNFS.read.mockResolvedValue('base64data');
    mockFileType.fileTypeFromBuffer.mockResolvedValue({ mime: 'image/jpeg' });
  });

  describe('fileSize validator', () => {
    it('should return null for valid file sizes', () => {
      expect(documentValidators.fileSize(1024 * 1024)).toBeNull(); // 1MB
      expect(documentValidators.fileSize(MAX_FILE_SIZE)).toBeNull(); // Exactly 10MB
    });

    it('should return error for files too large', () => {
      const result = documentValidators.fileSize(MAX_FILE_SIZE + 1);
      expect(result).toBe(DOCUMENT_VALIDATION_MESSAGES.FILE_TOO_LARGE);
    });

    it('should return error for zero or negative sizes', () => {
      expect(documentValidators.fileSize(0)).toBe(
        DOCUMENT_VALIDATION_MESSAGES.CORRUPTED_FILE
      );
      expect(documentValidators.fileSize(-1)).toBe(
        DOCUMENT_VALIDATION_MESSAGES.CORRUPTED_FILE
      );
    });
  });

  describe('fileType validator', () => {
    it('should return null for supported file types', () => {
      expect(documentValidators.fileType('image.jpg')).toBeNull();
      expect(documentValidators.fileType('image.jpeg')).toBeNull();
      expect(documentValidators.fileType('image.png')).toBeNull();
      expect(documentValidators.fileType('document.pdf')).toBeNull();
    });

    it('should return error for unsupported file types', () => {
      expect(documentValidators.fileType('file.txt')).toBe(
        DOCUMENT_VALIDATION_MESSAGES.UNSUPPORTED_TYPE
      );
      expect(documentValidators.fileType('file.docx')).toBe(
        DOCUMENT_VALIDATION_MESSAGES.UNSUPPORTED_TYPE
      );
      expect(documentValidators.fileType('file.exe')).toBe(
        DOCUMENT_VALIDATION_MESSAGES.UNSUPPORTED_TYPE
      );
    });

    it('should return error for files without extension', () => {
      expect(documentValidators.fileType('filename')).toBe(
        DOCUMENT_VALIDATION_MESSAGES.UNSUPPORTED_TYPE
      );
      expect(documentValidators.fileType('')).toBe(
        DOCUMENT_VALIDATION_MESSAGES.UNKNOWN_ERROR
      );
    });

    it('should handle case insensitive extensions', () => {
      expect(documentValidators.fileType('IMAGE.JPG')).toBeNull();
      expect(documentValidators.fileType('Document.PDF')).toBeNull();
    });
  });

  describe('mimeType validator', () => {
    it('should return null for supported MIME types', () => {
      expect(documentValidators.mimeType('image/jpeg')).toBeNull();
      expect(documentValidators.mimeType('image/png')).toBeNull();
      expect(documentValidators.mimeType('application/pdf')).toBeNull();
    });

    it('should return error for unsupported MIME types', () => {
      expect(documentValidators.mimeType('text/plain')).toBe(
        DOCUMENT_VALIDATION_MESSAGES.UNSUPPORTED_TYPE
      );
      expect(documentValidators.mimeType('application/msword')).toBe(
        DOCUMENT_VALIDATION_MESSAGES.UNSUPPORTED_TYPE
      );
    });

    it('should return error for empty MIME types', () => {
      expect(documentValidators.mimeType('')).toBe(
        DOCUMENT_VALIDATION_MESSAGES.UNKNOWN_ERROR
      );
    });
  });

  describe('documentCount validator', () => {
    it('should return null for valid document counts', () => {
      expect(documentValidators.documentCount(0, 1)).toBeNull();
      expect(documentValidators.documentCount(3, 3)).toBeNull();
      expect(documentValidators.documentCount(6, 1)).toBeNull();
    });

    it('should return error when exceeding maximum', () => {
      const result = documentValidators.documentCount(5, 3);
      expect(result).toBe(DOCUMENT_VALIDATION_MESSAGES.MAX_DOCUMENTS_EXCEEDED);
    });

    it('should return error for negative counts', () => {
      expect(documentValidators.documentCount(-1, 1)).toBe(
        DOCUMENT_VALIDATION_MESSAGES.UNKNOWN_ERROR
      );
      expect(documentValidators.documentCount(1, -1)).toBe(
        DOCUMENT_VALIDATION_MESSAGES.UNKNOWN_ERROR
      );
    });

    it('should handle edge case of exactly maximum documents', () => {
      expect(documentValidators.documentCount(6, 1)).toBeNull();
      expect(documentValidators.documentCount(7, 0)).toBeNull();
    });
  });

  describe('validateFileContent', () => {
    it('should return null for valid files', async () => {
      const result = await validateFileContent('file://test.jpg', 'image/jpeg');
      expect(result).toBeNull();
    });

    it('should return error for non-existent files', async () => {
      mockRNFS.exists.mockResolvedValue(false);

      const result = await validateFileContent(
        'file://missing.jpg',
        'image/jpeg'
      );
      expect(result).toBe(DOCUMENT_VALIDATION_MESSAGES.FILE_NOT_FOUND);
    });

    it('should return error for files that are too large', async () => {
      mockRNFS.stat.mockResolvedValue({ size: MAX_FILE_SIZE + 1 });

      const result = await validateFileContent(
        'file://large.jpg',
        'image/jpeg'
      );
      expect(result).toBe(DOCUMENT_VALIDATION_MESSAGES.FILE_TOO_LARGE);
    });
  });

  describe('validateDocument', () => {
    const validDocument = {
      uri: 'file://test.jpg',
      fileName: 'test.jpg',
      type: 'image/jpeg',
      fileSize: 1024 * 1024,
    };

    it('should validate valid documents', async () => {
      const result = await validateDocument(validDocument);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should detect invalid file types', async () => {
      const invalidDocument = {
        ...validDocument,
        fileName: 'test.txt',
        type: 'text/plain',
      };

      const result = await validateDocument(invalidDocument);
      expect(result.isValid).toBe(false);
      expect(result.errors.fileName).toBe(
        DOCUMENT_VALIDATION_MESSAGES.UNSUPPORTED_TYPE
      );
      expect(result.errors.type).toBe(
        DOCUMENT_VALIDATION_MESSAGES.UNSUPPORTED_TYPE
      );
    });

    it('should detect oversized files', async () => {
      const oversizedDocument = {
        ...validDocument,
        fileSize: MAX_FILE_SIZE + 1,
      };

      const result = await validateDocument(oversizedDocument);
      expect(result.isValid).toBe(false);
      expect(result.errors.fileSize).toBe(
        DOCUMENT_VALIDATION_MESSAGES.FILE_TOO_LARGE
      );
    });
  });

  describe('validateDocuments', () => {
    const validDocuments = [
      {
        uri: 'file://test1.jpg',
        fileName: 'test1.jpg',
        type: 'image/jpeg',
        fileSize: 1024 * 1024,
      },
      {
        uri: 'file://test2.png',
        fileName: 'test2.png',
        type: 'image/png',
        fileSize: 2 * 1024 * 1024,
      },
    ];

    it('should validate multiple valid documents', async () => {
      const result = await validateDocuments(validDocuments);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should detect when document count exceeds maximum', async () => {
      const result = await validateDocuments(validDocuments, 6);
      expect(result.isValid).toBe(false);
      expect(result.errors.count).toBe(
        DOCUMENT_VALIDATION_MESSAGES.MAX_DOCUMENTS_EXCEEDED
      );
    });

    it('should collect errors from individual documents', async () => {
      const invalidDocuments = [
        {
          uri: 'file://test1.txt',
          fileName: 'test1.txt',
          type: 'text/plain',
        },
        {
          uri: 'file://test2.jpg',
          fileName: 'test2.jpg',
          type: 'image/jpeg',
          fileSize: MAX_FILE_SIZE + 1,
        },
      ];

      const result = await validateDocuments(invalidDocuments);
      expect(result.isValid).toBe(false);
      expect(result.errors['document_0_fileName']).toBe(
        DOCUMENT_VALIDATION_MESSAGES.UNSUPPORTED_TYPE
      );
      expect(result.errors['document_1_fileSize']).toBe(
        DOCUMENT_VALIDATION_MESSAGES.FILE_TOO_LARGE
      );
    });
  });

  describe('helper functions', () => {
    const validDocument = {
      uri: 'file://test.jpg',
      fileName: 'test.jpg',
      type: 'image/jpeg',
      fileSize: 1024 * 1024,
    };

    it('should check if document is valid', async () => {
      const result = await isDocumentValid(validDocument);
      expect(result).toBe(true);
    });

    it('should get document error message', async () => {
      const invalidDocument = {
        ...validDocument,
        fileName: 'test.txt',
        type: 'text/plain',
      };

      const error = await getDocumentError(invalidDocument);
      expect(error).toBe(DOCUMENT_VALIDATION_MESSAGES.UNSUPPORTED_TYPE);
    });

    it('should return null for valid documents', async () => {
      const error = await getDocumentError(validDocument);
      expect(error).toBeNull();
    });
  });
});
