/**
 * Application Configuration
 */

export const appConfig = {
  apiBaseUrl: process.env.API_BASE_URL || 'https://api.example.com',
  environment: process.env.NODE_ENV || 'development',
  version: '1.0.0',

  // Database settings
  database: {
    name: 'solarium_cp.db',
    version: 1,
  },

  // Sync settings
  sync: {
    intervalMs: 300000, // 5 minutes
    throttleMs: 30000, // 30 seconds
  },

  // UI settings
  ui: {
    pageSize: 25,
    refreshThreshold: 0.4,
  },
} as const;

// Add these lines to your existing Config.ts file
export const AZURE_APPLICATION_INSIGHTS_KEY =
  process.env.AZURE_APPLICATION_INSIGHTS_KEY || '';
export const ENABLE_TELEMETRY = process.env.ENABLE_TELEMETRY || 'false';
export const TELEMETRY_BATCH_SIZE = process.env.TELEMETRY_BATCH_SIZE || '10';
export const TELEMETRY_FLUSH_INTERVAL =
  process.env.TELEMETRY_FLUSH_INTERVAL || '30000';
export const TELEMETRY_MAX_RETRIES = process.env.TELEMETRY_MAX_RETRIES || '3';
export const TELEMETRY_RETRY_DELAY =
  process.env.TELEMETRY_RETRY_DELAY || '1000';
export const ENABLE_USER_TRACKING = process.env.ENABLE_USER_TRACKING || 'false';
export const ENABLE_PERFORMANCE_TRACKING =
  process.env.ENABLE_PERFORMANCE_TRACKING || 'true';
export const ENABLE_MEMORY_TRACKING =
  process.env.ENABLE_MEMORY_TRACKING || 'true';
// Feature Flags
export const ENABLE_DOCUMENT_UPLOAD =
  process.env.ENABLE_DOCUMENT_UPLOAD === 'true';
export default appConfig;
// Logging configuration
export const ENABLE_DEBUG_LOGS = process.env.ENABLE_DEBUG_LOGS === 'true';
export const ENABLE_PERFORMANCE_LOGS =
  process.env.ENABLE_PERFORMANCE_LOGS === 'true';
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
