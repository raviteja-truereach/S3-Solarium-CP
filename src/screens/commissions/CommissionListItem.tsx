import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { Commission } from '../../database/models/Commission';
import { Assets } from '../../../assets';

/**
 * Props interface for CommissionListItem component
 */
export interface CommissionListItemProps {
  /** Commission data to display */
  commission: Commission;
  /** Handler for when commission item is pressed */
  onPress: (commission: Commission) => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * CommissionListItem Component
 * Displays individual commission information in a list
 * Follows the exact same pattern as CustomerListItem
 */
export const CommissionListItem: React.FC<CommissionListItemProps> = ({
  commission,
  onPress,
  testID = `commission-item-${commission.id}`,
}) => {
  const theme = useTheme();

  const handlePress = () => {
    onPress(commission);
  };

  // Format commission amount with currency
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Determine status display
  const getStatusDisplay = () => {
    const statusMap = {
      pending: { text: 'Pending', color: '#FF9500' },
      paid: { text: 'Paid', color: '#34C759' },
      approved: { text: 'Approved', color: '#007AFF' },
      cancelled: { text: 'Cancelled', color: '#FF3B30' },
      processing: { text: 'Processing', color: '#5856D6' },
    };

    const statusInfo = statusMap[commission.status];
    return statusInfo ? (
      <Text style={[styles.commissionStatus, { color: statusInfo.color }]}>
        {statusInfo.text}
      </Text>
    ) : null;
  };

  return (
    <TouchableOpacity
      style={styles.commissionItem}
      onPress={handlePress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Commission ${formatAmount(commission.amount)} - ${
        commission.status
      }`}
      accessibilityHint="Tap to view commission details"
    >
      <View style={styles.commissionHeader}>
        <Text style={styles.commissionAmount} numberOfLines={1}>
          {formatAmount(commission.amount)}
        </Text>
        {getStatusDisplay()}
      </View>

      <View style={styles.commissionDetails}>
        <View style={styles.commissionMetadata}>
          <View style={styles.commissionIdRow}>
            <Image
              source={Assets.icons.clipboard}
              style={styles.detailIcon}
              resizeMode="contain"
            />
            <Text style={styles.commissionId}>
              ID: {commission.id}
            </Text>
          </View>
          <View style={styles.commissionDateRow}>
            <Image
              source={Assets.icons.calendar}
              style={styles.detailIcon}
              resizeMode="contain"
            />
            <Text style={styles.commissionDate}>
              {formatDate(commission.created_at)}
            </Text>
          </View>
        </View>

        {commission.lead_id && (
          <View style={styles.commissionLeadRow}>
            <Image
              source={Assets.icons.user}
              style={styles.detailIcon}
              resizeMode="contain"
            />
            <Text style={styles.commissionLeadId} numberOfLines={1}>
              Lead: {commission.lead_id}
            </Text>
          </View>
        )}

        {commission.payment_date && (
          <View style={styles.commissionPaymentRow}>
            <Image
              source={Assets.icons.money}
              style={styles.detailIcon}
              resizeMode="contain"
            />
            <Text style={styles.commissionPaymentDate} numberOfLines={1}>
              Paid: {formatDate(commission.payment_date)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  commissionItem: {
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
  commissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commissionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  commissionStatus: {
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  commissionDetails: {
    gap: 4,
  },
  commissionMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commissionIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commissionDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commissionLeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commissionPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    width: 12,
    height: 12,
    marginRight: 6,
    tintColor: '#666',
  },

  // UPDATE EXISTING STYLES - remove emoji prefixes
  commissionId: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  commissionDate: {
    fontSize: 12,
    color: '#666',
  },
  commissionLeadId: {
    fontSize: 12,
    color: '#999',
    flex: 1,
  },
  commissionPaymentDate: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
    flex: 1,
  },
});

export default CommissionListItem;
