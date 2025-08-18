/**
 * Authentication Constants
 * Centralized auth-related configuration
 */

/** OTP resend interval in seconds */
export const OTP_RESEND_INTERVAL = 30;

/** OTP expiry duration in seconds */
export const OTP_EXPIRY_SEC = 120;

/** JWT token expiry buffer in milliseconds (5 minutes before actual expiry) */
export const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;

/** Maximum OTP attempts before lockout */
export const MAX_OTP_ATTEMPTS = 5;

/** Lockout duration in minutes */
export const LOCKOUT_DURATION_MINUTES = 15;
