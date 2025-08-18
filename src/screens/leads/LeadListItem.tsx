/**
 * LeadListItem - Fixed date formatting issue
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Linking,
  Alert,
} from 'react-native';
import { Assets } from '../../../assets';

export interface Lead {
  createdAt: string | null | undefined;
  id: string;
  customer_id: string;
  status: string;
  priority: 'high' | 'medium' | 'low';
  source: string;
  product_type?: string;
  estimated_value?: number;
  follow_up_date?: string;
  created_at: string;
  updated_at: string;
  remarks?: string;
  address?: string;
  phone?: string;
  email?: string;
  sync_status: 'synced' | 'pending' | 'failed';
  local_changes: string;
  customerName?: string;
  assignedTo?: string;
  services?: string[];
}

export interface LeadListItemProps {
  lead: Lead;
  onPress: (lead: Lead) => void;
  isOffline?: boolean;
  testID?: string;
  style?: ViewStyle;
}

/**
 * Get status color
 */
const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'new lead':
      return '#007AFF';
    case 'qualified':
      return '#34C759';
    case 'proposal sent':
      return '#FF9500';
    case 'closed won':
      return '#30B0C7';
    case 'closed lost':
      return '#FF3B30';
    default:
      return '#8E8E93';
  }
};

/**
 * Format date to readable format with better error handling
 */
const formatDate = (dateString: string | null | undefined): string => {
  // Debug: Log the actual date value
  console.log('🗓️ Date input:', dateString, typeof dateString);

  if (!dateString) {
    return 'No date';
  }

  try {
    // Try different date parsing approaches
    let date: Date;

    // Approach 1: Direct parsing
    date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      // Approach 2: Handle common API date formats
      if (typeof dateString === 'string') {
        // Handle ISO string with 'T' separator
        if (dateString.includes('T')) {
          date = new Date(dateString);
        }
        // Handle date-only strings (YYYY-MM-DD)
        else if (dateString.includes('-')) {
          date = new Date(dateString + 'T00:00:00.000Z');
        }
        // Handle timestamp strings
        else if (!isNaN(Number(dateString))) {
          date = new Date(Number(dateString));
        }
        // Handle DD/MM/YYYY or MM/DD/YYYY format
        else if (dateString.includes('/')) {
          date = new Date(dateString);
        } else {
          throw new Error('Unrecognized date format');
        }
      }
    }

    // Final check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('❌ Invalid date after all attempts:', dateString);
      return 'Invalid date';
    }

    // Format the valid date
    const formatted = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    console.log('✅ Formatted date:', formatted);
    return formatted;
  } catch (error) {
    console.error('❌ Date formatting error:', error, 'Input:', dateString);
    return 'Invalid date';
  }
};

/**
 * Handle phone call
 */
const handleCall = (phoneNumber: string) => {
  if (!phoneNumber) {
    Alert.alert('No Phone Number', 'No phone number available for this lead.');
    return;
  }

  const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
  const callUrl = `tel:${cleanNumber}`;

  Linking.canOpenURL(callUrl)
    .then((supported) => {
      if (supported) {
        Linking.openURL(callUrl);
      } else {
        Alert.alert('Error', 'Phone calls are not supported on this device.');
      }
    })
    .catch((error) => {
      console.error('Call error:', error);
      Alert.alert('Error', 'Failed to make phone call.');
    });
};

/**
 * Memoized LeadListItem component
 */
export const LeadListItem: React.FC<LeadListItemProps> = React.memo(
  ({ lead, onPress, isOffline = false, testID, style }) => {
    const statusColor = getStatusColor(lead.status);
    console.log('lead details--->', lead);
    // Debug: Log the entire lead object to see what we're getting
    console.log('🔍 Lead data:', {
      id: lead.id,
      customerName: lead.customerName,
      created_at: lead.created_at,
      created_at_type: typeof lead.created_at,
    });

    const handlePress = React.useCallback(() => {
      onPress(lead);
    }, [lead, onPress]);

    /**
     * Alternative simple call function (fallback)
     */
    const handleCallSimple = (phoneNumber: string) => {
      console.log('🔥 Simple call with number:', phoneNumber);

      if (!phoneNumber) {
        Alert.alert('No Phone Number', 'No phone number available.');
        return;
      }

      // Very simple approach - just try to open
      const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
      Linking.openURL(`tel:${cleanNumber}`).catch((error) => {
        console.error('Call failed:', error);
        Alert.alert('Call Failed', 'Unable to open phone dialer.');
      });
    };

    const accessibilityLabel = `Lead for ${
      lead.customerName || 'Unknown customer'
    }. Status: ${lead.status}. Phone: ${lead.phone || 'No phone'}. Address: ${
      lead.address || 'No address'
    }.`;

    return (
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={handlePress}
        testID={testID || `lead-item-${lead.id}`}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityHint="Tap to view lead details"
      >
        <View style={styles.card}>
          {/* Header with Name and Status */}
          <View style={styles.headerRow}>
            <Text style={styles.customerName} numberOfLines={1}>
              {lead.customerName || 'Unknown Customer'}
            </Text>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColor }]}
            >
              <Text style={styles.statusText}>{lead.status}</Text>
            </View>
          </View>

{/* Mobile Number and Call Button Row */}
<View style={styles.phoneRow}>
  <View style={styles.phoneInfo}>
    <View style={styles.labelContainer}>
      <Image
        source={Assets.icons.phoneCall}
        style={styles.labelIcon}
        resizeMode="contain"
      />
      <Text style={styles.phoneLabel}>Mobile:</Text>
    </View>
    <Text style={styles.phoneNumber}>
      {lead.phone || 'No phone number'}
    </Text>
  </View>
  {lead.phone && (
    <TouchableOpacity
      style={styles.callButton}
      onPress={() => handleCallSimple(lead?.phone)}
      testID={`${testID || lead.id}-call-button`}
      accessibilityLabel={`Call ${lead.phone}`}
      accessibilityRole="button"
    >
      <Image
        source={Assets.icons.call}
        style={styles.callIcon}
        resizeMode="contain"
      />
      <Text style={styles.callText}>Call</Text>
    </TouchableOpacity>
  )}
</View>

{/* Address Row */}
<View style={styles.addressRow}>
  <View style={styles.labelContainer}>
    <Image
      source={Assets.icons.location}
      style={styles.labelIcon}
      resizeMode="contain"
    />
    <Text style={styles.addressLabel}>Address:</Text>
  </View>
  <Text style={styles.addressText} numberOfLines={2}>
    {lead.address || 'No address provided'}
  </Text>
</View>

{/* Created Date Row */}
<View style={styles.dateRow}>
  <View style={styles.labelContainer}>
    <Image
      source={Assets.icons.clipboard}
      style={styles.labelIcon}
      resizeMode="contain"
    />
    <Text style={styles.dateLabel}>Created:</Text>
  </View>
  <Text style={styles.dateText}>{formatDate(lead.created_at)}</Text>
</View>

          {/* Cached Indicator */}
          {/* {isOffline && (
            <View style={styles.cachedIndicator}>
              <Text style={styles.cachedText}>🔄 Cached Data</Text>
            </View>
          )} */}

          {/* Chevron */}
          <View style={styles.chevronContainer}>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

LeadListItem.displayName = 'LeadListItem';

// Consistent height for getItemLayout optimization
export const LEAD_ITEM_HEIGHT = 200; // Increased height for debug info

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    minHeight: LEAD_ITEM_HEIGHT - 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  phoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  phoneInfo: {
    flex: 1,
  },
  phoneLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  phoneNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  callIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  callText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  addressRow: {
    marginBottom: 12,
  },
  addressLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 18,
  },
  dateRow: {
    alignItems: 'flex-start', // Changed from 'center'
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 12,
    color: '#666666',
    marginRight: 8,
  },
  dateText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  debugRow: {
    marginTop: 8,
    padding: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  debugText: {
    fontSize: 10,
    color: '#666666',
    fontFamily: 'monospace',
  },
  cachedIndicator: {
    position: 'absolute',
    top: 12,
    right: 50,
    backgroundColor: '#FFE5B4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cachedText: {
    fontSize: 10,
    color: '#B8860B',
    fontWeight: '600',
  },
  chevronContainer: {
    position: 'absolute',
    right: 16,
    top: '64%',
    transform: [{ translateY: -12 }],
  },
  chevron: {
    fontSize: 24,
    color: '#C7C7CC',
    fontWeight: '300',
  },
});

export default LeadListItem;
