export { PerformanceMonitor } from './PerformanceMonitor';
export { Logger, debug, info, warn, error } from './Logger';
export { AppStateManager } from './AppStateManager';

/**
 * Format currency in Indian Rupees with fallback for Hermes
 */
export const formatCurrency = (amount: number | undefined | null): string => {
  // Handle invalid inputs
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }

  // Ensure it's a valid number
  const numAmount = Number(amount);
  if (!isFinite(numAmount)) {
    return '₹0';
  }

  try {
    // Try using Intl.NumberFormat first (may not work in all Hermes versions)
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(numAmount);
  } catch (error) {
    // Fallback to manual formatting for Hermes compatibility
    const formatted = Math.abs(numAmount).toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    });
    return `₹${formatted}`;
  }
};

// ADD to existing exports
export {
  formatFileSize,
  formatFileSizeIndian,
  getFileSizeCategory,
} from './formatFileSize';
