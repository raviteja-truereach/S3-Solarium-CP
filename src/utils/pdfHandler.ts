/**
 * PDF Handler Utilities
 * Handles PDF URL opening with error handling
 */
import { Linking, Alert } from 'react-native';

/**
 * Check if URL can be opened
 */
export const canOpenPdf = async (url: string): Promise<boolean> => {
  try {
    return await Linking.canOpenURL(url);
  } catch (error) {
    console.error('❌ Error checking PDF URL:', error);
    return false;
  }
};

/**
 * Open quotation PDF in system default handler
 */
export const openQuotationPdf = async (pdfUrl: string): Promise<void> => {
  try {
    console.log('🔍 Attempting to open PDF URL:', pdfUrl);

    // const canOpen = await canOpenPdf(pdfUrl);
    // if (!canOpen) {
    //   throw new Error('Cannot open PDF URL with system default handler');
    // }

    await Linking.openURL(pdfUrl);
    console.log('✅ PDF opened successfully');
  } catch (error) {
    console.error('❌ Failed to open PDF:', error);
    throw error;
  }
};

/**
 * Handle PDF-related errors with user-friendly messages
 */
export const handlePdfError = (error: any): string => {
  if (!error) return 'Unknown PDF error occurred';

  // Handle specific error types
  if (typeof error === 'string') {
    if (error.includes('404') || error.includes('Not Found')) {
      return 'PDF not found. It may have expired or been removed.';
    }
    if (error.includes('timeout') || error.includes('TIMEOUT')) {
      return 'Request timed out. Please check your connection and try again.';
    }
    if (error.includes('Cannot open')) {
      return 'Unable to open PDF. Please check if you have a PDF viewer installed.';
    }
    return error;
  }

  // Handle error objects
  if (error.message) {
    return handlePdfError(error.message);
  }

  // Handle network errors
  if (error.status === 404) {
    return 'PDF not found. It may have expired or been removed.';
  }

  if (error.status === 500) {
    return 'Server error while generating PDF. Please try again later.';
  }

  return 'Failed to open PDF. Please try again.';
};
