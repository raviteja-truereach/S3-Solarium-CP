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
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setFilters, clearAllFilters } from '../../store/slices/leadSlice';
import { selectFilters } from '../../store/selectors/leadSelectors';
import { LEAD_STATUSES } from '../../constants/leadStatus';
import { Assets } from '../../../assets';

interface FilterSheetProps {
  visible: boolean;
  onDismiss: () => void;
  testID?: string;
}

export const FilterSheet: React.FC<FilterSheetProps> = ({
  visible,
  onDismiss,
  testID = 'filter-sheet',
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const currentFilters = useAppSelector(selectFilters);

  const [localStatuses, setLocalStatuses] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setLocalStatuses([...currentFilters.statuses]);
    }
  }, [visible, currentFilters]);

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

  const handleStatusToggle = useCallback((status: string) => {
    setLocalStatuses((prev) => {
      if (prev.includes(status)) {
        return prev.filter((s) => s !== status);
      } else {
        return [...prev, status];
      }
    });
  }, []);

  const handleApply = useCallback(() => {
    console.log('🔄 FilterSheet: Applying filters:', {
      statuses: localStatuses,
      statusCount: localStatuses.length,
    });

    dispatch(
      setFilters({
        statuses: localStatuses,
      })
    );

    setTimeout(() => {
      console.log('🔍 FilterSheet: Filters should be applied now');
    }, 100);

    onDismiss();
  }, [dispatch, localStatuses, onDismiss]);

  const handleReset = useCallback(() => {
    console.log('🔄 FilterSheet: Resetting all filters');
    setLocalStatuses([]);
    dispatch(clearAllFilters());
    onDismiss();
  }, [dispatch, onDismiss]);

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
      source={Assets.icons.filter}
      style={styles.titleIcon}
      resizeMode="contain"
    />
    <Text style={styles.title}>Filter Leads</Text>
  </View>
  <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
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
    Select one or more lead statuses to filter by
  </Text>

  <View style={styles.chipContainer}>
    {LEAD_STATUSES.map((status) => (
      <TouchableOpacity
        key={status}
        onPress={() => handleStatusToggle(status)}
        style={[
          styles.chip,
          localStatuses.includes(status) && styles.chipSelected,
        ]}
        testID={`status-chip-${status
          .replace(/\s+/g, '-')
          .toLowerCase()}`}
      >
        <View style={styles.chipContent}>
          {localStatuses.includes(status) && (
            <Image
              source={Assets.icons.checkMark}
              style={styles.checkIcon}
              resizeMode="contain"
            />
          )}
          <Text
            style={[
              styles.chipText,
              localStatuses.includes(status) && styles.chipTextSelected,
            ]}
          >
            {status}
          </Text>
        </View>
      </TouchableOpacity>
    ))}
  </View>

  {localStatuses.length > 0 && (
    <View style={styles.selectionSummaryContainer}>
      <Image
        source={Assets.icons.checkMark}
        style={styles.summaryIcon}
        resizeMode="contain"
      />
      <Text style={styles.selectionSummary}>
        {localStatuses.length} status
        {localStatuses.length > 1 ? 'es' : ''} selected
      </Text>
    </View>
  )}
</View>

{/* Date Range Section - Placeholder */}
{/* <View style={styles.section}>
  <View style={styles.sectionTitleContainer}>
    <Image
      source={Assets.icons.calendar}
      style={styles.sectionIcon}
      resizeMode="contain"
    />
    <Text style={styles.sectionTitle}>Date Range</Text>
  </View>
  <View style={styles.comingSoonContainer}>
    <Image
      source={Assets.icons.calendar}
      style={styles.comingSoonIcon}
      resizeMode="contain"
    />
    <Text style={styles.comingSoonText}>
      Date filtering coming in next update
    </Text>
  </View>
</View> */}
        </ScrollView>

{/* Footer Actions */}
<View style={styles.footer}>
  <Button
    mode="outlined"
    onPress={handleReset}
    style={styles.resetButton}
    contentStyle={styles.buttonContent}
    testID="reset-filters-button"
    icon={() => (
      <Image
        source={Assets.icons.refresh}
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
    style={styles.applyButton}
    contentStyle={styles.buttonContent}
    testID="apply-filters-button"
    icon={() => (
      <Image
        source={Assets.icons.checkMark}
        style={[styles.buttonIcon, { tintColor: 'white' }]}
        resizeMode="contain"
      />
    )}
  >
    Apply ({localStatuses.length})
  </Button>
</View>
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
      maxHeight: '80%',
      minHeight: '50%',
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
    // closeIcon: {
    //   fontSize: 18,
    //   color: theme.colors?.error || '#d32f2f',
    //   fontWeight: 'bold',
    // },
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
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 25,
      borderWidth: 2,
      borderColor: theme.colors?.outline || '#e0e0e0',
      backgroundColor: theme.colors?.surface || 'white',
      marginBottom: 8,
      minHeight: 44, // Accessibility touch target
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
    comingSoonText: {
      fontSize: 14,
      color: theme.colors?.onSurfaceVariant || '#666',
      textAlign: 'center',
      fontStyle: 'italic',
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

    /////////
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
      width: 22,
      height: 22,
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
      tintColor: theme.colors?.onPrimary || 'white',
    },
    selectionSummaryContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      paddingHorizontal: 8,
    },
    summaryIcon: {
      width: 12,
      height: 12,
      marginRight: 6,
      tintColor: theme.colors?.primary || '#007AFF',
    },
    comingSoonIcon: {
      width: 24,
      height: 24,
      marginBottom: 8,
      tintColor: theme.colors?.onSurfaceVariant || '#666',
      opacity: 0.6,
    },
    buttonIcon: {
      width: 16,
      height: 16,
      tintColor: theme.colors?.primary || '#007AFF',
    },

    // UPDATE EXISTING STYLES
    closeButton: {
      width: 36,
      height: 36,
      // borderRadius: 18,
      // backgroundColor: theme.colors?.errorContainer || '#ffe6e6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    comingSoonContainer: {
      backgroundColor: theme.colors?.surfaceVariant || '#f5f5f5',
      padding: 20,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors?.outline || '#e0e0e0',
      borderStyle: 'dashed',
    },
    selectionSummary: {
      fontSize: 14,
      color: theme.colors?.primary || '#007AFF',
      fontWeight: '600',
    },
  });

export default FilterSheet;
