// Sync timing constants
export const AUTO_SYNC_INTERVAL_MS = 180_000; // 3 minutes (180 ± 10s)
export const AUTO_SYNC_JITTER_MS = 10_000; // ± 10 seconds jitter
export const MIN_SYNC_GAP_MS = 30_000; // 30 seconds minimum gap between syncs
export const SYNC_TIMEOUT_MS = 60_000; // 1 minute timeout per sync

// Sync types
export type SyncSource = 'auto' | 'manual' | 'longPress';

// Sync throttle messages
export const SYNC_THROTTLE_MESSAGE = 'Please wait before refreshing';
export const SYNC_CONCURRENT_MESSAGE = 'Sync already in progress';

// Performance limits
export const MAX_SYNC_MEMORY_MB = 5;
export const MAX_CONCURRENT_SYNCS = 1;

export default {
  AUTO_SYNC_INTERVAL_MS,
  AUTO_SYNC_JITTER_MS,
  MIN_SYNC_GAP_MS,
  SYNC_TIMEOUT_MS,
  SYNC_THROTTLE_MESSAGE,
  SYNC_CONCURRENT_MESSAGE,
  MAX_SYNC_MEMORY_MB,
  MAX_CONCURRENT_SYNCS,
};
