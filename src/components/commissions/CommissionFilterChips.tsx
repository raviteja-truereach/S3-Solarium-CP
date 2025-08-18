import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useAppDispatch } from '../../store/hooks';
import { updateFilters } from '../../store/slices/commissionSlice';
import type { CommissionFilters } from '../../database/models/Commission';

interface CommissionFilterChipsProps {
  filters: CommissionFilters;
  activeFilterCount: number;
  onClearAll: () => void;
  testID?: string;
}

/**
 * CommissionFilterChips Component
 * Shows individual active filter chips with clear functionality
 * Meets WCAG 2.1 AA accessibility standards
 */
export const CommissionFilterChips: React.FC<CommissionFilterChipsProps> = ({
  filters,
  activeFilterCount,
  onClearAll,
  testID = 'commission-filter-chips',
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  // Status display mapping
  const getStatusDisplay = useCallback((status: string) => {
    const statusMap = {
      pending: 'Pending',
      paid: 'Paid',
      approved: 'Approved',
      cancelled: 'Cancelled',
      processing: 'Processing',
    };
    return statusMap[status as keyof typeof statusMap] || status;
  }, []);

  // Format date for display
  const formatDateRange = useCallback(
    (dateRange: { startDate: string; endDate: string }) => {
      try {
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);

        const startFormatted = startDate.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        const endFormatted = endDate.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        // If same month and year, show shorter format
        const startMonthYear = startDate.toLocaleDateString('en-IN', {
          month: 'short',
          year: 'numeric',
        });

        const endMonthYear = endDate.toLocaleDateString('en-IN', {
          month: 'short',
          year: 'numeric',
        });

        if (startMonthYear === endMonthYear) {
          return startMonthYear;
        }

        return `${startFormatted} - ${endFormatted}`;
      } catch (error) {
        console.error('Error formatting date range:', error);
        return 'Invalid date range';
      }
    },
    []
  );

  // Clear individual filter handlers
  const handleClearStatus = useCallback(() => {
    console.log('🧹 Clearing status filter');
    const newFilters = { ...filters };
    delete newFilters.statuses;
    dispatch(updateFilters(newFilters));
  }, [dispatch, filters]);

  const handleClearDateRange = useCallback(() => {
    console.log('🧹 Clearing date range filter');
    const newFilters = { ...filters };
    delete newFilters.dateRange;
    dispatch(updateFilters(newFilters));
  }, [dispatch, filters]);

  // Don't render if no active filters
  if (activeFilterCount === 0) {
    return null;
  }

  const styles = createStyles(theme);

  return (
    <View
      style={styles.container}
      testID={testID}
    //   accessibilityRole="group"
      accessibilityLabel={`${activeFilterCount} active filter${
        activeFilterCount > 1 ? 's' : ''
      }`}
    >
      {/* Status Filter Chip */}
      {filters.statuses && filters.statuses.length > 0 && (
        <TouchableOpacity
          style={styles.filterChip}
          onPress={handleClearStatus}
          accessibilityRole="button"
          accessibilityLabel={`Remove status filter: ${getStatusDisplay(
            filters.statuses[0]
          )}`}
          accessibilityHint="Double tap to remove this status filter"
          testID="status-filter-chip"
        >
          <View style={styles.chipContent}>
            <Text style={styles.filterChipText}>
              📊 Status: {getStatusDisplay(filters.statuses[0])}
            </Text>
            <View style={styles.clearIconContainer}>
              <Text style={styles.clearIcon}>✕</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Date Range Filter Chip */}
      {filters.dateRange &&
        filters.dateRange.startDate &&
        filters.dateRange.endDate && (
          <TouchableOpacity
            style={styles.filterChip}
            onPress={handleClearDateRange}
            accessibilityRole="button"
            accessibilityLabel={`Remove date filter: ${formatDateRange(
              filters.dateRange
            )}`}
            accessibilityHint="Double tap to remove this date range filter"
            testID="date-filter-chip"
          >
            <View style={styles.chipContent}>
              <Text style={styles.filterChipText}>
                📅 {formatDateRange(filters.dateRange)}
              </Text>
              <View style={styles.clearIconContainer}>
                <Text style={styles.clearIcon}>✕</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

      {/* Clear All Button */}
      <TouchableOpacity
        style={styles.clearAllButton}
        onPress={onClearAll}
        accessibilityRole="button"
        accessibilityLabel="Clear all active filters"
        accessibilityHint="Double tap to remove all filters and show all commissions"
        testID="clear-all-filters-button"
      >
        <Text style={styles.clearAllButtonText}>🔄 Clear All</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.colors?.surfaceVariant || '#f8f9fa',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors?.outline || '#e0e0e0',
    },
    filterChip: {
      backgroundColor: theme.colors?.primaryContainer || '#E1F0FF',
      borderColor: theme.colors?.primary || '#004C89',
      borderWidth: 1,
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 6,
      minHeight: 44, // WCAG 2.1 AA - minimum touch target
      minWidth: 44,
      justifyContent: 'center',
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
    },
    chipContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    filterChipText: {
      color: theme.colors?.primary || '#004C89',
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 16,
      flexShrink: 1, // Allow text to shrink if needed
    },
    clearIconContainer: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.colors?.primary || '#004C89',
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearIcon: {
      color: theme.colors?.onPrimary || 'white',
      fontSize: 12,
      fontWeight: 'bold',
      textAlign: 'center',
      lineHeight: 14,
    },
    clearAllButton: {
    //   backgroundColor: 'rgba(255, 59, 48, 0.1)',
    //   borderColor: '#FF3B30',
     backgroundColor: theme.colors?.errorContainer || '#FFEBEE',
     borderColor: theme.colors?.error || '#D32F2F',
      borderWidth: 1,
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 6,
      minHeight: 44, // WCAG 2.1 AA - minimum touch target
      minWidth: 44,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
    },
    clearAllButtonText: {
      color: theme.colors?.error || '#D32F2F',
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 16,
    },
  });

export default CommissionFilterChips;
