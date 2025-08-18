/**
 * Date Helper Utilities
 * Common date operations for commission filtering
 */

/**
 * Get current year date range for default filtering
 * Returns start and end of current year as ISO strings
 */
export const getCurrentYearRange = (): {
  startDate: string;
  endDate: string;
} => {
  const now = new Date();
  const currentYear = now.getFullYear();

  const startDate = new Date(currentYear, 0, 1).toISOString(); // Jan 1
  const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999).toISOString(); // Dec 31

  return { startDate, endDate };
};

/**
 * Format date for display
 */
export const formatDateForDisplay = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

/**
 * Check if a date falls within a range
 */
export const isDateInRange = (
  date: string,
  startDate: string,
  endDate: string
): boolean => {
  try {
    const targetDate = new Date(date);
    const start = new Date(startDate);
    const end = new Date(endDate);

    return targetDate >= start && targetDate <= end;
  } catch {
    return false;
  }
};
