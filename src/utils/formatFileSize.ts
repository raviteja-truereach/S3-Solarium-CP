/**
 * File Size Formatting Utilities
 * Formats file sizes in human-readable format
 */

/**
 * Format file size in bytes to human-readable string
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number, decimals: number = 1): string => {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const value = bytes / Math.pow(k, i);
  const formattedValue = value.toFixed(decimals);

  return `${formattedValue} ${sizes[i]}`;
};

/**
 * Format file size with Indian numbering system
 * @param bytes - File size in bytes
 * @returns Formatted file size string with Indian formatting
 */
export const formatFileSizeIndian = (bytes: number): string => {
  const formatted = formatFileSize(bytes);
  const [value, unit] = formatted.split(' ');
  const number = parseFloat(value);

  if (number >= 1000) {
    return `${number.toLocaleString('en-IN')} ${unit}`;
  }

  return formatted;
};

/**
 * Get file size category for styling
 * @param bytes - File size in bytes
 * @returns Size category
 */
export const getFileSizeCategory = (
  bytes: number
): 'small' | 'medium' | 'large' => {
  if (bytes < 1024 * 1024) return 'small'; // < 1MB
  if (bytes < 5 * 1024 * 1024) return 'medium'; // < 5MB
  return 'large'; // >= 5MB
};
