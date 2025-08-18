import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { Customer } from '../../database/models/Customer';
import { Assets } from '../../../assets';

/**
 * Props interface for CustomerListItem component
 */
export interface CustomerListItemProps {
  /** Customer data to display */
  customer: Customer;
  /** Handler for when customer item is pressed */
  onPress: (customer: Customer) => void;
  /** Handler for when call button is pressed */
  onCallPress: (customer: Customer) => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * CustomerListItem Component
 * Displays individual customer information in a list
 * Follows the exact same pattern as LeadListItem
 */
export const CustomerListItem: React.FC<CustomerListItemProps> = ({
  customer,
  onPress,
  onCallPress,
  testID = `customer-item-${customer.id}`,
}) => {
  const theme = useTheme();

  const handlePress = () => {
    onPress(customer);
  };

  const handleCallPress = (event: any) => {
    event.stopPropagation(); // Prevent customer press when calling
    onCallPress(customer);
  };

  // Determine KYC status display
  const getKycStatusDisplay = () => {
    if (!customer.kyc_status) return null;

    const statusMap = {
      pending: { text: 'Pending', color: '#FF9500' },
      submitted: { text: 'Submitted', color: '#004C89' },
      approved: { text: 'Approved', color: '#34C759' },
      rejected: { text: 'Rejected', color: '#FF3B30' },
    };

    const statusInfo = statusMap[customer.kyc_status];
    return statusInfo ? (
      <Text style={[styles.customerStatus, { color: statusInfo.color }]}>
        {statusInfo.text}
      </Text>
    ) : null;
  };

  return (
    <TouchableOpacity
      style={styles.customerItem}
      onPress={handlePress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Customer ${customer.name}`}
      accessibilityHint="Tap to view customer details"
    >
      <View style={styles.customerHeader}>
        <Text style={styles.customerName} numberOfLines={1}>
          {customer.name}
        </Text>
        {getKycStatusDisplay()}
      </View>

      <View style={styles.customerContactInfo}>
        <View style={styles.customerPhoneContainer}>
          <View style={styles.phoneRow}>
            <Image
              source={Assets.icons.phoneCall}
              style={styles.contactIcon}
              resizeMode="contain"
            />
            <Text style={styles.customerPhone}>{customer.phone}</Text>
          </View>

          {customer.phone && (
            <TouchableOpacity
              style={styles.callButton}
              onPress={handleCallPress}
              testID={`call-button-${customer.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Call ${customer.name}`}
            >
              <Image
                source={Assets.icons.call}
                style={styles.callButtonIcon}
                resizeMode="contain"
              />
              <Text style={styles.callButtonText}>Call</Text>
            </TouchableOpacity>
          )}
        </View>

        {customer.address && (
          <View style={styles.addressRow}>
            <Image
              source={Assets.icons.location}
              style={styles.contactIcon}
              resizeMode="contain"
            />
            <Text style={styles.customerAddress} numberOfLines={1}>
              {customer.address}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  customerItem: {
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  customerStatus: {
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 76, 137, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  customerContactInfo: {
    gap: 4,
  },
  customerPhoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  callButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  customerAddress: {
    fontSize: 12,
    color: '#999',
  },
  /////////
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    width: 14,
    height: 14,
    marginRight: 8,
    tintColor: '#666',
  },
  callButtonIcon: {
    width: 12,
    height: 12,
    marginRight: 4,
    tintColor: 'white',
  },
});

export default CustomerListItem;
