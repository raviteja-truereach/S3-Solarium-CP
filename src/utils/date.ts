/**
 * Format a timestamp to relative time string
 * @param iso - ISO string timestamp
 * @returns Formatted relative time string
 */
export const formatRelativeTime = (iso: string | undefined | null): string => {
  if (!iso) {
    return '–';
  }

  try {
    const now = new Date();
    const syncTime = new Date(iso);

    // Check if date is valid
    if (isNaN(syncTime.getTime())) {
      return '–';
    }

    const diffMs = now.getTime() - syncTime.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    // Handle future dates (shouldn't happen but be safe)
    if (diffMs < 0) {
      return 'just now';
    }

    // Less than 1 minute
    if (diffSeconds < 60) {
      return diffSeconds <= 5 ? 'just now' : `${diffSeconds}s ago`;
    }

    // Less than 1 hour
    if (diffMinutes < 60) {
      return diffMinutes === 1 ? '1 min ago' : `${diffMinutes} min ago`;
    }

    // Less than 24 hours
    if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }

    // Less than 7 days
    if (diffDays < 7) {
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    }

    // More than 7 days - show actual date
    return syncTime.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '–';
  }
};

/**
 * Format timestamp to readable date string
 * @param iso - ISO string timestamp
 * @returns Formatted date string
 */
export const formatDateTime = (iso: string | undefined | null): string => {
  if (!iso) {
    return 'Never';
  }

  try {
    const date = new Date(iso);

    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (error) {
    console.error('Error formatting date time:', error);
    return 'Invalid date';
  }
};

/**
 * Check if a timestamp is from today
 * @param iso - ISO string timestamp
 * @returns True if timestamp is from today
 */
export const isToday = (iso: string | undefined | null): boolean => {
  if (!iso) {
    return false;
  }

  try {
    const date = new Date(iso);
    const today = new Date();

    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  } catch (error) {
    return false;
  }
};

/**
 * Get time until next sync is allowed (for countdown display)
 * @param lastSyncTs - Last sync timestamp
 * @param minGapMs - Minimum gap between syncs in milliseconds
 * @returns Seconds until next sync is allowed, or 0 if allowed now
 */
export const getTimeUntilNextSync = (
  lastSyncTs: string | undefined | null,
  minGapMs: number = 30000
): number => {
  if (!lastSyncTs) {
    return 0;
  }

  try {
    const lastSync = new Date(lastSyncTs);
    const now = new Date();
    const timeSinceSync = now.getTime() - lastSync.getTime();
    const remainingTime = minGapMs - timeSinceSync;

    return remainingTime > 0 ? Math.ceil(remainingTime / 1000) : 0;
  } catch (error) {
    return 0;
  }
};

export default {
  formatRelativeTime,
  formatDateTime,
  isToday,
  getTimeUntilNextSync,
};
