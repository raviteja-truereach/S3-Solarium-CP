/**
 * Application String Constants
 * Centralized string constants for i18n readiness
 */

/** Connectivity related messages */
export const OFFLINE_MESSAGE = "You're offline. Some actions are disabled.";

/** General app messages */
export const APP_NAME = 'Solarium CP';
export const LOADING_MESSAGE = 'Loading...';
export const RETRY_MESSAGE = 'Retry';

/** Status Change Messages */
export const STATUS_CHANGE_MESSAGES = {
  SUCCESS: 'Status updated successfully',
  OFFLINE_ERROR:
    'No internet connection. Please check your connection and try again.',
  GENERIC_ERROR: 'Failed to update status. Please try again.',
  LOADING: 'Updating status...',
};

export const STRINGS = {
  // Lead Info Tab Labels
  LEAD_INFO: {
    CUSTOMER_NAME: 'Customer Name',
    PHONE: 'Phone',
    EMAIL: 'Email',
    CITY: 'City',
    STATE: 'State',
    PIN_CODE: 'PIN Code',
    CURRENT_STATUS: 'Current Status',
    NEXT_FOLLOWUP: 'Next Follow-up',

    // Actions
    CALL: 'Call',
    SMS: 'SMS',

    // Placeholders
    NOT_PROVIDED: '—',

    // Error Messages
    LOAD_ERROR_TITLE: 'Unable to load lead details',
    LOAD_ERROR_MESSAGE: 'Please check your connection and try again',
    RETRY_BUTTON: 'Retry',

    // Loading
    LOADING_LEAD: 'Loading lead information...',
  },
  // Status Change
  STATUS_CHANGE: {
    FAB_LABEL: 'Change Status',
    SUCCESS_TOAST: 'Status updated successfully',
    OFFLINE_TOAST: 'No internet connection',
    ERROR_TOAST: 'Failed to update status',
  },

  // Error States
  ERRORS: {
    NETWORK_ERROR: 'Network connection error',
    CACHE_MISS: 'Data not available offline',
    UNKNOWN_ERROR: 'Something went wrong',
  },
} as const;

export default {
  OFFLINE_MESSAGE,
  APP_NAME,
  LOADING_MESSAGE,
  RETRY_MESSAGE,
  STRINGS,
};

/** Document Validation Messages */
export const DOCUMENT_VALIDATION_MESSAGES = {
  FILE_TOO_LARGE: 'File size must be less than 10MB',
  UNSUPPORTED_TYPE: 'Only JPEG, PNG, and PDF files are supported',
  MAX_DOCUMENTS_EXCEEDED: 'Maximum 7 documents allowed per lead',
  INVALID_FILE_CONTENT: 'File content does not match extension',
  CORRUPTED_FILE: 'File appears to be corrupted or invalid',
  PERMISSION_DENIED: 'Permission required to access file',
  FILE_NOT_FOUND: 'Selected file could not be found',
  UNKNOWN_ERROR: 'An unexpected error occurred during validation',
  CONTENT_MISMATCH: 'File content does not match declared type',
  SECURITY_CHECK_FAILED: 'File failed security validation',
};
