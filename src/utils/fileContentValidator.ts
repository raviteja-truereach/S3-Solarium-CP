/**
 * File Content Validator Utilities
 * Validates file content using magic bytes for security
 */
import RNFS from 'react-native-fs';
import { fileTypeFromBuffer } from 'file-type';
import { MAGIC_BYTES, EXTENSION_TO_MAGIC } from '../constants/document';
import { DOCUMENT_VALIDATION_MESSAGES } from '../constants/strings';

/**
 * Read file header bytes
 */
const readFileHeader = async (
  uri: string,
  byteCount: number = 16
): Promise<Uint8Array> => {
  try {
    const filePath = uri.replace('file://', '');
    const exists = await RNFS.exists(filePath);

    if (!exists) {
      throw new Error(DOCUMENT_VALIDATION_MESSAGES.FILE_NOT_FOUND);
    }

    const headerData = await RNFS.read(filePath, byteCount, 0, 'base64');
    const buffer = Buffer.from(headerData, 'base64');
    return new Uint8Array(buffer);
  } catch (error) {
    console.error('❌ Error reading file header:', error);
    throw error;
  }
};

/**
 * Check if file has valid extension
 */
const getFileExtension = (filename: string): string => {
  const ext = filename.toLowerCase().match(/\.[^.]+$/);
  return ext ? ext[0] : '';
};

/**
 * Detect file type using magic bytes
 */
export const detectFileType = async (uri: string): Promise<string> => {
  try {
    const headerBytes = await readFileHeader(uri, 16);
    const fileTypeResult = await fileTypeFromBuffer(headerBytes);

    if (fileTypeResult) {
      // Map file-type library results to our constants
      switch (fileTypeResult.mime) {
        case 'image/jpeg':
          return 'image/jpeg';
        case 'image/png':
          return 'image/png';
        case 'application/pdf':
          return 'application/pdf';
        default:
          return 'unknown';
      }
    }

    return 'unknown';
  } catch (error) {
    console.error('❌ Error detecting file type:', error);
    return 'unknown';
  }
};

/**
 * Verify file matches its declared type
 */
export const verifyFileIntegrity = async (
  uri: string,
  declaredType: string
): Promise<boolean> => {
  try {
    const detectedType = await detectFileType(uri);
    return detectedType === declaredType;
  } catch (error) {
    console.error('❌ Error verifying file integrity:', error);
    return false;
  }
};

/**
 * Check if file extension matches content
 */
export const validateFileContentMatch = async (
  uri: string,
  filename: string
): Promise<string | null> => {
  try {
    const extension = getFileExtension(filename);
    const expectedMagicType =
      EXTENSION_TO_MAGIC[extension as keyof typeof EXTENSION_TO_MAGIC];

    if (!expectedMagicType) {
      return DOCUMENT_VALIDATION_MESSAGES.UNSUPPORTED_TYPE;
    }

    const headerBytes = await readFileHeader(uri, 16);
    const magicBytes = MAGIC_BYTES[expectedMagicType];

    // Check if file starts with expected magic bytes
    const matches = magicBytes.every(
      (byte, index) => headerBytes[index] === byte
    );

    if (!matches) {
      return DOCUMENT_VALIDATION_MESSAGES.CONTENT_MISMATCH;
    }

    return null;
  } catch (error) {
    console.error('❌ Error validating file content:', error);
    return DOCUMENT_VALIDATION_MESSAGES.CORRUPTED_FILE;
  }
};

/**
 * Get file size from URI
 */
export const getFileSize = async (uri: string): Promise<number> => {
  try {
    const filePath = uri.replace('file://', '');
    const stat = await RNFS.stat(filePath);
    return stat.size;
  } catch (error) {
    console.error('❌ Error getting file size:', error);
    return 0;
  }
};

/**
 * Check if file exists and is accessible
 */
export const checkFileAccess = async (uri: string): Promise<string | null> => {
  try {
    const filePath = uri.replace('file://', '');
    const exists = await RNFS.exists(filePath);

    if (!exists) {
      return DOCUMENT_VALIDATION_MESSAGES.FILE_NOT_FOUND;
    }

    return null;
  } catch (error) {
    console.error('❌ Error checking file access:', error);
    return DOCUMENT_VALIDATION_MESSAGES.PERMISSION_DENIED;
  }
};
