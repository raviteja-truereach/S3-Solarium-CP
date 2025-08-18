/**
 * Error Message Utilities
 * Maps HTTP status codes to user-friendly messages
 */
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { createLogger } from './Logger';

const errorLogger = createLogger('ERROR_HANDLER');

/**
 * HTTP status code to message mapping
 */
const ERROR_MESSAGES: Record<number | string, string> = {
  // Client errors (4xx)
  400: 'Invalid request. Please check your input and try again.',
  401: 'Your session has expired. Please log in again.',
  403: "You don't have permission to perform this action.",
  404: 'The requested resource was not found.',
  408: 'Request timeout. Please check your connection and try again.',
  409: 'There was a conflict with your request. Please refresh and try again.',
  422: 'The data provided is invalid. Please check and try again.',
  429: 'Too many requests. Please wait a moment and try again.',

  // Server errors (5xx)
  500: 'Something went wrong on our end. Please try again later.',
  502: 'Service temporarily unavailable. Please try again later.',
  503: 'Service is currently down for maintenance. Please try again later.',
  504: 'Request timeout. Please try again later.',

  // Network errors
  FETCH_ERROR: 'Network error. Please check your internet connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  PARSING_ERROR: 'Unexpected response format. Please try again.',

  // Default fallback
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',

  STATUS_FAIL:
    'Failed to update lead status. Please check your connection and try again.',
  DOCUMENT_LIMIT_EXCEEDED:
    'Maximum 7 documents allowed per lead. Please remove some documents before uploading new ones.',
};

/**
 * Get user-friendly error message for HTTP status code
 * @param status - HTTP status code or error type
 * @returns User-friendly error message
 */
export function getFriendlyMessage(status: number | string): string {
  // Handle known status codes
  if (status in ERROR_MESSAGES) {
    return ERROR_MESSAGES[status];
  }

  // Handle ranges
  if (typeof status === 'number') {
    if (status >= 400 && status < 500) {
      return 'There was an issue with your request. Please try again.';
    }
    if (status >= 500 && status < 600) {
      return 'Server error. Please try again later.';
    }
  }

  // Default fallback
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Validate and extract friendly error message from RTK Query error
 * @param error - RTK Query FetchBaseQueryError
 * @returns User-friendly error message string
 */
export function validateBackendError(error: FetchBaseQueryError): string {
  // Handle HTTP status errors
  if (typeof error.status === 'number') {
    // Check for specific error data from backend
    if (error.data && typeof error.data === 'object') {
      const errorData = error.data as any;

      // If backend provides a message, use it
      if (errorData.error?.message) {
        return errorData.error.message;
      }

      // If backend provides a direct message
      if (errorData.message) {
        return errorData.message;
      }
    }

    // Fall back to status-based message
    return getFriendlyMessage(error.status);
  }

  // Handle network/fetch errors
  if (error.status === 'FETCH_ERROR') {
    return ERROR_MESSAGES.FETCH_ERROR;
  }

  if (error.status === 'TIMEOUT_ERROR') {
    return ERROR_MESSAGES.TIMEOUT_ERROR;
  }

  if (error.status === 'PARSING_ERROR') {
    return ERROR_MESSAGES.PARSING_ERROR;
  }

  // Default fallback
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Determine if error should trigger auto-logout
 * @param status - HTTP status code
 * @returns true if should logout, false otherwise
 */
export function shouldAutoLogout(status: number | string): boolean {
  return status === 401 || status === 403;
}

/**
 * Determine if error should show toast notification
 * @param status - HTTP status code
 * @returns true if should show toast, false otherwise
 */
export function shouldShowToast(status: number | string): boolean {
  // Don't show toast for auth errors (they trigger logout)
  if (shouldAutoLogout(status)) {
    return false;
  }

  // Show toast for all other errors
  return true;
}

/**
 * Get specific error message for status update failures
 * @param error - RTK Query error
 * @returns User-friendly status update error message
 */
export function getStatusUpdateErrorMessage(error: any): string {
  if (!error) {
    return ERROR_MESSAGES.STATUS_FAIL;
  }

  // Handle specific status update errors
  if (error.status === 400 && error.data?.message?.includes('status')) {
    return 'Invalid status transition. Please select a valid next status.';
  }

  if (error.status === 409) {
    return 'Status has been updated by someone else. Please refresh and try again.';
  }

  // Use existing validation for other errors
  if (error.status) {
    return validateBackendError(error);
  }

  return ERROR_MESSAGES.STATUS_FAIL;
}

/**
 * Handle document limit error from server response
 * @param error - Error object from API response
 * @returns User-friendly limit error message
 */
export function handleDocumentLimitError(error: any): string {
  errorLogger.info('Handling document limit error', { error });

  // Check if it's a 409 error with document limit message
  if (error?.status === 409) {
    // Check for specific backend message
    if (
      error?.data?.error?.includes?.('Maximum 7 documents per lead allowed')
    ) {
      return ERROR_MESSAGES.DOCUMENT_LIMIT_EXCEEDED;
    }

    // Check for direct error message
    if (
      typeof error?.data === 'string' &&
      error.data.includes('Maximum 7 documents')
    ) {
      return ERROR_MESSAGES.DOCUMENT_LIMIT_EXCEEDED;
    }
  }

  // Check for limit-related messages in error text
  const errorText = error?.message || error?.error || '';
  if (
    typeof errorText === 'string' &&
    errorText.toLowerCase().includes('maximum') &&
    errorText.includes('7')
  ) {
    return ERROR_MESSAGES.DOCUMENT_LIMIT_EXCEEDED;
  }

  // Fallback to generic 409 handling
  return getFriendlyMessage(409);
}

export default {
  getFriendlyMessage,
  validateBackendError,
  shouldAutoLogout,
  shouldShowToast,
};
