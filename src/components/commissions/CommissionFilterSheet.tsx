/**
 * Commission Filter Sheet Component
 * Follows exact pattern from customers FilterSheet for consistency
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  BackHandler,
  Image,
} from 'react-native';
import { Modal, Portal, Button, useTheme } from 'react-native-paper';
import DatePicker from 'react-native-date-picker';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  updateFilters,
  clearFilters,
} from '../../store/slices/commissionSlice';
import { selectFilters } from '../../store/selectors/commissionSelectors';
import { Assets } from '../../../assets';

interface CommissionFilterSheetProps {
  visible: boolean;
  onDismiss: () => void;
  testID?: string;
}

// Commission status options (matching API and database)
const COMMISSION_STATUSES = [
  { key: 'pending', label: 'Pending', color: '#FF9500' },
  { key: 'paid', label: 'Paid', color: '#34C759' },
  { key: 'approved', label: 'Approved', color: '#007AFF' },
  { key: 'cancelled', label: 'Cancelled', color: '#FF3B30' },
  { key: 'processing', label: 'Processing', color: '#5856D6' },
];

export const CommissionFilterSheet: React.FC<CommissionFilterSheetProps> = ({
  visible,
  onDismiss,
  testID = 'commission-filter-sheet',
}) => {
  console.log('🔄 CommissionFilterSheet: visible', visible);
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const currentFilters = useAppSelector(selectFilters);

  // Local state for filters
  const [localStatus, setLocalStatus] = useState<string>('');
  const [localStartDate, setLocalStartDate] = useState<Date | null>(null);
  const [localEndDate, setLocalEndDate] = useState<Date | null>(null);

  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Initialize local state from Redux when modal opens
  useEffect(() => {
    if (visible) {
      setLocalStatus(currentFilters.statuses?.[0] || ''); // Single status only

      if (currentFilters.dateRange) {
        setLocalStartDate(
          currentFilters.dateRange.startDate
            ? new Date(currentFilters.dateRange.startDate)
            : null
        );
        setLocalEndDate(
          currentFilters.dateRange.endDate
            ? new Date(currentFilters.dateRange.endDate)
            : null
        );
      } else {
        setLocalStartDate(null);
        setLocalEndDate(null);
      }
    }
  }, [visible, currentFilters]);

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (visible) {
          onDismiss();
          return true;
        }
        return false;
      }
    );
    return () => backHandler.remove();
  }, [visible, onDismiss]);

  // Status selection handler
  const handleStatusToggle = useCallback((status: string) => {
    setLocalStatus((prev) => (prev === status ? '' : status));
  }, []);

  // Date selection handlers
  const handleStartDateConfirm = useCallback((date: Date) => {
    setLocalStartDate(date);
    setShowStartDatePicker(false);
  }, []);

  const handleEndDateConfirm = useCallback((date: Date) => {
    setLocalEndDate(date);
    setShowEndDatePicker(false);
  }, []);

  const handleClearStartDate = useCallback(() => {
    setLocalStartDate(null);
  }, []);

  const handleClearEndDate = useCallback(() => {
    setLocalEndDate(null);
  }, []);

  // Apply filters
  const handleApply = useCallback(() => {
    console.log('📄 CommissionFilterSheet: Applying filters:', {
      status: localStatus,
      startDate: localStartDate?.toISOString().split('T')[0],
      endDate: localEndDate?.toISOString().split('T')[0],
    });

    const filters: any = {};

    // Single status filter (as array for consistency with slice)
    if (localStatus) {
      filters.statuses = [localStatus];
    }

    // Date range filter
    if (localStartDate && localEndDate) {
      filters.dateRange = {
        startDate: localStartDate.toISOString().split('T')[0], // YYYY-MM-DD format
        endDate: localEndDate.toISOString().split('T')[0],
      };
    }

    dispatch(updateFilters(filters));
    onDismiss();
  }, [dispatch, localStatus, localStartDate, localEndDate, onDismiss]);

  // Reset all filters
  const handleReset = useCallback(() => {
    console.log('🔄 CommissionFilterSheet: Resetting all filters');
    setLocalStatus('');
    setLocalStartDate(null);
    setLocalEndDate(null);
    dispatch(clearFilters());
    onDismiss();
  }, [dispatch, onDismiss]);

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (localStatus) count++;
    if (localStartDate && localEndDate) count++;
    return count;
  };

  // Format date for display
  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const styles = createStyles(theme);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.sheet}
        testID={testID}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Image
              source={Assets.icons.money}
              style={styles.titleIcon}
              resizeMode="contain"
            />
            <Text style={styles.title}>Filter Commissions</Text>
          </View>
          <TouchableOpacity onPress={onDismiss}>
            <Image
              source={Assets.icons.remove}
              style={styles.closeIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Status Filter Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Image
                source={Assets.icons.clipboard}
                style={styles.sectionIcon}
                resizeMode="contain"
              />
              <Text style={styles.sectionTitle}>Status</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Select commission status
            </Text>

            <View style={styles.chipContainer}>
              {COMMISSION_STATUSES.map((status) => (
                <TouchableOpacity
                  key={status.key}
                  onPress={() => handleStatusToggle(status.key)}
                  style={[
                    styles.chip,
                    localStatus === status.key && {
                      ...styles.chipSelected,
                      borderColor: status.color,
                      backgroundColor: status.color + '20', // 20% opacity
                    },
                  ]}
                  testID={`status-chip-${status.key}`}
                >
                  <View style={styles.chipContent}>
                    {localStatus === status.key && (
                      <Image
                        source={Assets.icons.checkMark}
                        style={styles.checkIcon}
                        resizeMode="contain"
                      />
                    )}
                    <Text
                      style={[
                        styles.chipText,
                        localStatus === status.key && {
                          ...styles.chipTextSelected,
                          color: status.color,
                        },
                      ]}
                    >
                      {status.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {localStatus && (
              <View style={styles.selectionSummaryContainer}>
                <Image
                  source={Assets.icons.checkMark}
                  style={styles.summaryIcon}
                  resizeMode="contain"
                />
                <Text style={styles.selectionSummary}>
                  {
                    COMMISSION_STATUSES.find((s) => s.key === localStatus)
                      ?.label
                  }{' '}
                  selected
                </Text>
              </View>
            )}
          </View>

          {/* Date Range Filter Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Image
                source={Assets.icons.calendar}
                style={styles.sectionIcon}
                resizeMode="contain"
              />
              <Text style={styles.sectionTitle}>Date Range</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Filter commissions by creation date
            </Text>

            {/* Start Date */}
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>From:</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
                testID="start-date-picker-button"
              >
                <Text style={styles.dateButtonText}>
                  {formatDate(localStartDate) || 'Select start date'}
                </Text>
              </TouchableOpacity>
              {localStartDate && (
                <TouchableOpacity
                  style={styles.clearDateButton}
                  onPress={handleClearStartDate}
                  testID="clear-start-date-button"
                >
                  <Image
                    source={Assets.icons.remove}
                    style={styles.clearIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* End Date */}
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>To:</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
                testID="end-date-picker-button"
              >
                <Text style={styles.dateButtonText}>
                  {formatDate(localEndDate) || 'Select end date'}
                </Text>
              </TouchableOpacity>
              {localEndDate && (
                <TouchableOpacity
                  style={styles.clearDateButton}
                  onPress={handleClearEndDate}
                  testID="clear-end-date-button"
                >
                  <Image
                    source={Assets.icons.remove}
                    style={styles.clearIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              )}
            </View>

            {localStartDate && localEndDate && (
              <View style={styles.selectionSummaryContainer}>
                <Image
                  source={Assets.icons.checkMark}
                  style={styles.summaryIcon}
                  resizeMode="contain"
                />
                <Text style={styles.selectionSummary}>
                  {formatDate(localStartDate)} to {formatDate(localEndDate)}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer Actions */}
        {/* Footer Actions */}
        <View style={styles.footer}>
          <Button
            mode="outlined"
            onPress={handleReset}
            style={styles.resetButton}
            contentStyle={styles.buttonContent}
            testID="reset-commission-filters-button"
            icon={() => (
              <Image
                source={Assets.icons.sync}
                style={styles.buttonIcon}
                resizeMode="contain"
              />
            )}
          >
            Reset
          </Button>

          <Button
            mode="contained"
            onPress={handleApply}
            accessibilityRole="button"
            accessibilityLabel={`Apply ${getActiveFilterCount()} filters`}
            style={styles.resetButton}
            contentStyle={styles.buttonContent}
            accessibilityHint="Double tap to apply selected filters and close this dialog"
            icon={() => (
              <Image
                source={Assets.icons.checkMark}
                style={[styles.buttonIcon, { tintColor: 'white' }]}
                resizeMode="contain"
              />
            )}
          >
            Apply ({getActiveFilterCount()})
          </Button>
        </View>

        {/* Date Pickers */}
        <DatePicker
          modal
          open={showStartDatePicker}
          date={localStartDate || new Date()}
          mode="date"
          onConfirm={handleStartDateConfirm}
          onCancel={() => setShowStartDatePicker(false)}
          title="Select Start Date"
          confirmText="Confirm"
          cancelText="Cancel"
        />

        <DatePicker
          modal
          open={showEndDatePicker}
          date={localEndDate || new Date()}
          mode="date"
          onConfirm={handleEndDateConfirm}
          onCancel={() => setShowEndDatePicker(false)}
          title="Select End Date"
          confirmText="Confirm"
          cancelText="Cancel"
        />
      </Modal>
    </Portal>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    sheet: {
      backgroundColor: theme.colors?.surface || 'white',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '85%',
      minHeight: '60%',
      margin: 20,
      padding: 0,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors?.outline || '#e0e0e0',
      backgroundColor: theme.colors?.primaryContainer || '#f0f8ff',
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors?.onSurface || '#000',
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors?.errorContainer || '#ffe6e6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
    },
    section: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors?.onSurface || '#000',
      // marginBottom: 8,
    },
    sectionDescription: {
      fontSize: 14,
      color: theme.colors?.onSurfaceVariant || '#666',
      marginBottom: 16,
      lineHeight: 20,
    },
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chipSelected: {
      backgroundColor: theme.colors?.primary || '#007AFF',
      borderColor: theme.colors?.primary || '#007AFF',
    },
    chipText: {
      fontSize: 14,
      color: theme.colors?.onSurfaceVariant || '#666',
      textAlign: 'center',
      fontWeight: '500',
    },
    chipTextSelected: {
      color: theme.colors?.onPrimary || 'white',
      fontWeight: '600',
    },
    // selectionSummary: {
    //   fontSize: 14,
    //   color: theme.colors?.primary || '#007AFF',
    //   marginTop: 12,
    //   fontWeight: '600',
    // },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 12,
    },
    dateLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors?.onSurface || '#000',
      width: 50,
    },
    dateButton: {
      flex: 1,
      backgroundColor: theme.colors?.surfaceVariant || '#f5f5f5',
      borderWidth: 1,
      borderColor: theme.colors?.outline || '#e0e0e0',
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 48,
      justifyContent: 'center',
    },
    dateButtonText: {
      fontSize: 14,
      color: theme.colors?.onSurface || '#000',
    },
    clearDateButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors?.errorContainer || '#ffe6e6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    footer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 16,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors?.outline || '#e0e0e0',
      backgroundColor: theme.colors?.surfaceVariant || '#f9f9f9',
    },
    resetButton: {
      flex: 1,
      borderColor: theme.colors?.outline || '#e0e0e0',
    },
    applyButton: {
      flex: 1,
      backgroundColor: theme.colors?.primary || '#007AFF',
    },
    buttonContent: {
      paddingVertical: 8,
    },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 25,
      borderWidth: 2,
      borderColor: theme.colors?.outline || '#e0e0e0',
      backgroundColor: theme.colors?.surface || 'white',
      marginBottom: 8,
      minHeight: 48, // WCAG 2.1 AA - increased from 44 to 48 for better accessibility
      minWidth: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    ////
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    titleIcon: {
      width: 18,
      height: 18,
      marginRight: 8,
      tintColor: theme.colors?.onSurface || '#000',
    },
    closeIcon: {
      width: 18,
      height: 18,
      // tintColor: theme.colors?.error || '#d32f2f',
    },
    sectionTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    sectionIcon: {
      width: 16,
      height: 16,
      marginRight: 8,
      tintColor: theme.colors?.onSurface || '#000',
    },
    chipContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkIcon: {
      width: 12,
      height: 12,
      marginRight: 6,
      tintColor: theme.colors?.primary,
    },
    summaryIcon: {
      width: 12,
      height: 12,
      marginRight: 6,
      tintColor: theme.colors?.primary || '#007AFF',
    },
    clearIcon: {
      width: 12,
      height: 12,
      tintColor: theme.colors?.error || '#d32f2f',
    },
    buttonIcon: {
      width: 16,
      height: 16,
      tintColor: theme.colors?.primary || '#007AFF',
    },

    // UPDATE EXISTING selectionSummary STYLE
    selectionSummary: {
      fontSize: 14,
      color: theme.colors?.primary || '#007AFF',
      fontWeight: '600',
    },
    selectionSummaryContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      paddingHorizontal: 8,
      paddingVertical: 6,
      backgroundColor: theme.colors?.primaryContainer || 'rgba(0, 122, 255, 0.1)',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors?.primary || '#007AFF',
    },
  });

export default CommissionFilterSheet;
