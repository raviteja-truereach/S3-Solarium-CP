/**
 * Customer Filter Sheet Component
 * Follows exact pattern from leads FilterSheet for consistency
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
import { updateFilters, clearFilters } from '../../store/slices/customerSlice';
import { selectCustomersFilters } from '../../store/slices/customerSlice';
import { Assets } from '../../../assets';

interface CustomerFilterSheetProps {
  visible: boolean;
  onDismiss: () => void;
  testID?: string;
}

// Filter options (preparing for future server-side filtering)
const KYC_STATUSES = ['Pending', 'Approved', 'Rejected'];
const STATES = [
  'Andhra Pradesh',
  'Karnataka',
  'Tamil Nadu',
  'Telangana',
  'Kerala',
  'Maharashtra',
  'Gujarat',
  'Rajasthan',
  'Delhi',
  'Punjab',
];
const CITIES = [
  'Bangalore',
  'Chennai',
  'Hyderabad',
  'Mumbai',
  'Delhi',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Surat',
  'Lucknow',
];

export const CustomerFilterSheet: React.FC<CustomerFilterSheetProps> = ({
  visible,
  onDismiss,
  testID = 'customer-filter-sheet',
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const currentFilters = useAppSelector(selectCustomersFilters);

  const [localKycStatus, setLocalKycStatus] = useState<string>('');
  const [localState, setLocalState] = useState<string>('');
  const [localCity, setLocalCity] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setLocalKycStatus(currentFilters.kycStatus || '');
      setLocalState(currentFilters.state || '');
      setLocalCity(currentFilters.city || '');
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

  const handleKycStatusToggle = useCallback((status: string) => {
    setLocalKycStatus((prev) => (prev === status ? '' : status));
  }, []);

  const handleStateToggle = useCallback((state: string) => {
    setLocalState((prev) => (prev === state ? '' : state));
  }, []);

  const handleCityToggle = useCallback((city: string) => {
    setLocalCity((prev) => (prev === city ? '' : city));
  }, []);

  const handleApply = useCallback(() => {
    console.log('🔄 CustomerFilterSheet: Applying filters:', {
      kycStatus: localKycStatus,
      state: localState,
      city: localCity,
    });

    const filters: any = {};
    if (localKycStatus) filters.kycStatus = localKycStatus;
    if (localState) filters.state = localState;
    if (localCity) filters.city = localCity;

    dispatch(updateFilters(filters));

    setTimeout(() => {
      console.log('🔍 CustomerFilterSheet: Filters should be applied now');
    }, 100);

    onDismiss();
  }, [dispatch, localKycStatus, localState, localCity, onDismiss]);

  const handleReset = useCallback(() => {
    console.log('🔄 CustomerFilterSheet: Resetting all filters');
    setLocalKycStatus('');
    setLocalState('');
    setLocalCity('');
    dispatch(clearFilters());
    onDismiss();
  }, [dispatch, onDismiss]);

  const getActiveFilterCount = () => {
    let count = 0;
    if (localKycStatus) count++;
    if (localState) count++;
    if (localCity) count++;
    return count;
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
              source={Assets.icons.group}
              style={styles.titleIcon}
              resizeMode="contain"
            />
            <Text style={styles.title}>Filter Customers</Text>
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
          {/* KYC Status Filter Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Image
                source={Assets.icons.clipboard}
                style={styles.sectionIcon}
                resizeMode="contain"
              />
              <Text style={styles.sectionTitle}>KYC Status</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Select KYC verification status
            </Text>

            <View style={styles.chipContainer}>
              {KYC_STATUSES.map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => handleKycStatusToggle(status)}
                  style={[
                    styles.chip,
                    localKycStatus === status && styles.chipSelected,
                  ]}
                  testID={`kyc-status-chip-${status
                    .replace(/\s+/g, '-')
                    .toLowerCase()}`}
                >
                  <View style={styles.chipContent}>
                    {localKycStatus === status && (
                      <Image
                        source={Assets.icons.checkMark}
                        style={styles.checkIcon}
                        resizeMode="contain"
                      />
                    )}
                    <Text
                      style={[
                        styles.chipText,
                        localKycStatus === status && styles.chipTextSelected,
                      ]}
                    >
                      {status}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {localKycStatus && (
              <View style={styles.selectionSummaryContainer}>
                <Image
                  source={Assets.icons.checkMark}
                  style={styles.summaryIcon}
                  resizeMode="contain"
                />
                <Text style={styles.selectionSummary}>
                  {localKycStatus} selected
                </Text>
              </View>
            )}
          </View>

          {/* State Filter Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Image
                source={Assets.icons.location}
                style={styles.sectionIcon}
                resizeMode="contain"
              />
              <Text style={styles.sectionTitle}>State</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Select customer state/region
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              <View style={styles.chipContainer}>
                {STATES.map((state) => (
                  <TouchableOpacity
                    key={state}
                    onPress={() => handleStateToggle(state)}
                    style={[
                      styles.chip,
                      localState === state && styles.chipSelected,
                    ]}
                    testID={`state-chip-${state
                      .replace(/\s+/g, '-')
                      .toLowerCase()}`}
                  >
                    <View style={styles.chipContent}>
                      {localState === state && (
                        <Image
                          source={Assets.icons.checkMark}
                          style={styles.checkIcon}
                          resizeMode="contain"
                        />
                      )}
                      <Text
                        style={[
                          styles.chipText,
                          localState === state && styles.chipTextSelected,
                        ]}
                      >
                        {state}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {localState && (
              <View style={styles.selectionSummaryContainer}>
                <Image
                  source={Assets.icons.checkMark}
                  style={styles.summaryIcon}
                  resizeMode="contain"
                />
                <Text style={styles.selectionSummary}>
                  {localState} selected
                </Text>
              </View>
            )}
          </View>

          {/* City Filter Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Image
                source={Assets.icons.location}
                style={[styles.sectionIcon, { opacity: 0.7 }]} // Slight opacity to differentiate from state
                resizeMode="contain"
              />
              <Text style={styles.sectionTitle}>City</Text>
            </View>
            <Text style={styles.sectionDescription}>Select customer city</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              <View style={styles.chipContainer}>
                {CITIES.map((city) => (
                  <TouchableOpacity
                    key={city}
                    onPress={() => handleCityToggle(city)}
                    style={[
                      styles.chip,
                      localCity === city && styles.chipSelected,
                    ]}
                    testID={`city-chip-${city
                      .replace(/\s+/g, '-')
                      .toLowerCase()}`}
                  >
                    <View style={styles.chipContent}>
                      {localCity === city && (
                        <Image
                          source={Assets.icons.checkMark}
                          style={styles.checkIcon}
                          resizeMode="contain"
                        />
                      )}
                      <Text
                        style={[
                          styles.chipText,
                          localCity === city && styles.chipTextSelected,
                        ]}
                      >
                        {city}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {localCity && (
              <View style={styles.selectionSummaryContainer}>
                <Image
                  source={Assets.icons.checkMark}
                  style={styles.summaryIcon}
                  resizeMode="contain"
                />
                <Text style={styles.selectionSummary}>
                  {localCity} selected
                </Text>
              </View>
            )}
          </View>

          {/* Future Enhancement Notice */}
          {/* <View style={styles.section}>
            <View style={styles.comingSoonContainer}>
              <Text style={styles.comingSoonText}>
                🚀 Server-side filtering will be enabled in future updates
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
            testID="reset-customer-filters-button"
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
            style={styles.applyButton}
            contentStyle={styles.buttonContent}
            testID="apply-customer-filters-button"
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
    // closeIcon: {
    //   // fontSize: 12,
    //   // color: theme.colors?.error || '#d32f2f',
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
      // marginBottom: 8,
    },
    sectionDescription: {
      fontSize: 14,
      color: theme.colors?.onSurfaceVariant || '#666',
      marginBottom: 16,
      lineHeight: 20,
    },
    horizontalScroll: {
      marginHorizontal: -8,
    },
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 8,
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
    selectionSummary: {
      fontSize: 14,
      color: theme.colors?.primary || '#007AFF',
      marginTop: 12,
      fontWeight: '600',
      paddingHorizontal: 8,
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
      width: 20,
      height: 20,
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
    buttonIcon: {
      width: 16,
      height: 16,
      tintColor: theme.colors?.primary || '#007AFF',
    },
  });

export default CustomerFilterSheet;
