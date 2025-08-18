/**
 * Network Configuration
 * API timeout and retry settings
 */

export const API_TIMEOUT_MS = 30000; // 30 seconds
export const API_RETRY_COUNT = 3;
export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'https://api.solarium-cp.com';

export const NETWORK_CONFIG = {
  timeout: API_TIMEOUT_MS,
  retries: API_RETRY_COUNT,
  baseUrl: API_BASE_URL,
} as const;

export default NETWORK_CONFIG;
