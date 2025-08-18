/**
 * Quotation Filter Sheet Component
 * Modal sheet for filtering quotations by status
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
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setFilters } from '../../store/slices/quotationSlice';
import { selectQuotationFilters } from '../../store/selectors/quotationSelectors';
import { QUOTATION_STATUSES } from '../../constants/quotationStatus';
import { Assets } from '../../../assets';

interface QuotationFilterSheetProps {
  visible: boolean;
  onDismiss: () => void;
  testID?: string;
}

export const QuotationFilterSheet: React.FC<QuotationFilterSheetProps> = ({
  visible,
  onDismiss,
  testID = 'quotation-filter-sheet',
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const currentFilters = useAppSelector(selectQuotationFilters);

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
    dispatch(setFilters({ statuses: localStatuses }));
    onDismiss();
  }, [dispatch, localStatuses, onDismiss]);

  const handleReset = useCallback(() => {
    setLocalStatuses([]);
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'Generated':
        return '#2196F3';
      case 'Shared':
        return '#FF9800';
      case 'Accepted':
        return '#4CAF50';
      case 'Rejected':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  }, []);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.colors.surface },
        ]}
        testID={testID}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Image
                source={Assets.icons.filter}
                style={styles.titleIcon}
                resizeMode="contain"
              />
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                Filter Quotations
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Image
                source={Assets.icons.clipboard}
                style={styles.sectionIcon}
                resizeMode="contain"
              />
              <Text
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Status
              </Text>
            </View>

            <View style={styles.chipContainer}>
              {QUOTATION_STATUSES.map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => handleStatusToggle(status)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: localStatuses.includes(status)
                        ? getStatusColor(status)
                        : theme.colors.outline,
                    },
                  ]}
                  testID={`status-chip-${status
                    .toLowerCase()
                    .replace(' ', '-')}`}
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
                        {
                          color: localStatuses.includes(status)
                            ? '#FFFFFF'
                            : theme.colors.onSurface,
                        },
                      ]}
                    >
                      {status}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={handleReset}
            style={styles.resetButton}
            testID="filter-reset-button"
            icon={() => (
              <Image
                source={Assets.icons.undo}
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
            testID="filter-apply-button"
            icon={() => (
              <Image
                source={Assets.icons.checkMark}
                style={[styles.buttonIcon, { tintColor: 'white' }]}
                resizeMode="contain"
              />
            )}
          >
            Apply Filters
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 20,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    // marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  resetButton: {
    flex: 1,
  },
  applyButton: {
    flex: 1,
  },
  ///////
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
    tintColor: '#004C89',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
    tintColor: '#004C89',
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
    tintColor: '#FFFFFF',
  },
  buttonIcon: {
    width: 16,
    height: 16,
    tintColor: '#004C89',
  },
});

export default QuotationFilterSheet;
