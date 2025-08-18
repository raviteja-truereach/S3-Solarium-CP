/**
 * Customer Profile Tab Component
 * Displays read-only customer information (following LeadInfoTab pattern)
 */
import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Linking,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  List,
  Divider,
  Button,
  Banner,
  Text,
  Card,
  IconButton,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { ScrollView } from 'react-native';
import type { CustomerDetail } from '@types/api/customer';
import { Assets } from '../../../assets';

export interface CustomerProfileTabProps {
  customer?: CustomerDetail;
  loading: boolean;
  error?: unknown;
  onRetry: () => void;
}

/**
 * Skeleton Loader Component
 */
const ProfileSkeleton: React.FC = () => {
  const theme = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.skeletonContainer}>
      <ActivityIndicator size="large" style={styles.loader} />
      <Text variant="bodyMedium" style={styles.loadingText}>
        Loading customer profile...
      </Text>
      {/* Skeleton rows */}
      {Array.from({ length: 8 }).map((_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={[styles.skeletonText, { width: '30%' }]} />
          <View style={[styles.skeletonText, { width: '60%' }]} />
        </View>
      ))}
    </View>
  );
};

/**
 * Error State Component
 */
const ErrorState: React.FC<{ error: unknown; onRetry: () => void }> = ({
  error,
  onRetry,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error) return err.message;
    return 'Unable to load customer information';
  };

  return (
    <View style={styles.errorContainer}>
      <Banner
        visible={true}
        actions={[
          {
            label: 'Retry',
            onPress: onRetry,
          },
        ]}
        style={styles.errorBanner}
      >
        <View>
          <Text variant="titleMedium" style={styles.errorTitle}>
            Failed to load customer
          </Text>
        </View>
        <View>
          <Text variant="bodyMedium" style={styles.errorMessage}>
            {getErrorMessage(error)}
          </Text>
        </View>
      </Banner>
    </View>
  );
};

/**
 * Phone Action Buttons Component
 */
const PhoneActions: React.FC<{ phone: string }> = ({ phone }) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  const handleCall = useCallback(async () => {
    try {
      const phoneUrl = `tel:${phone}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      await Linking.openURL(phoneUrl);
    } catch (error) {
      console.error('Error opening phone dialer:', error);
      Alert.alert('Error', 'Unable to open phone dialer');
    }
  }, [phone]);

  const handleSMS = useCallback(async () => {
    try {
      const smsUrl = `sms:${phone}`;
      const canOpen = await Linking.canOpenURL(smsUrl);
      await Linking.openURL(smsUrl);
    } catch (error) {
      console.error('Error opening SMS:', error);
      Alert.alert('Error', 'Unable to open SMS');
    }
  }, [phone]);

  return (
    <View style={styles.phoneActions}>
      <TouchableOpacity
        onPress={handleCall}
        style={[styles.actionButton, styles.callButton]}
        accessibilityLabel={`Call ${phone}`}
        accessibilityRole="button"
      >
        <Image
          source={Assets.icons.call}
          style={styles.actionIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleSMS}
        style={[styles.actionButton, styles.smsButton]}
        accessibilityLabel={`Send SMS to ${phone}`}
        accessibilityRole="button"
      >
        <Image
          source={Assets.icons.phoneCall} // Using phone-call.png for SMS (or add a dedicated SMS icon)
          style={styles.actionIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
};

/**
 * Info Row Component
 */
const InfoRow: React.FC<{
  label: string;
  value: string | null | undefined;
  showPhoneActions?: boolean;
}> = ({ label, value, showPhoneActions = false }) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const displayValue = value || 'Not provided';
  const hasValue = Boolean(value);

  return (
    <>
      <List.Item
        title={label}
        description={displayValue}
        titleStyle={styles.infoLabel}
        descriptionStyle={[
          styles.infoValue,
          !hasValue && styles.infoValueEmpty,
        ]}
        right={
          showPhoneActions && hasValue
            ? () => <PhoneActions phone={value!} />
            : undefined
        }
        style={styles.infoRow}
        accessibilityLabel={`${label}: ${displayValue}`}
        accessibilityRole="text"
      />
      <Divider style={styles.divider} />
    </>
  );
};

/**
 * Customer Profile Tab Component
 */
export const CustomerProfileTab: React.FC<CustomerProfileTabProps> = ({
  customer,
  loading,
  error,
  onRetry,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  // Loading state
  if (loading) {
    return <ProfileSkeleton />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  // No data state
  if (!customer) {
    return (
      <View style={styles.noDataContainer}>
        <Text variant="titleMedium" style={styles.noDataText}>
          No customer data available
        </Text>
        <Button mode="outlined" onPress={onRetry} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  // Format registration date
  const formatDate = (date: string | null | undefined): string => {
    if (!date) return 'Not provided';

    try {
      const regDate = new Date(date);
      return regDate.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return date;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.infoCard}>
        <Card.Content style={styles.cardContent}>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: theme.colors.primary }]}
          >
            Contact Information
          </Text>

          <View style={styles.infoSection}>
            <InfoRow label="Customer Name" value={customer.name} />
            <InfoRow
              label="Phone Number"
              value={customer.phone}
              showPhoneActions={true}
            />
            <InfoRow label="Email Address" value={customer.email} />
          </View>

          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: theme.colors.primary }]}
          >
            Address Information
          </Text>

          <View style={styles.infoSection}>
            <InfoRow label="Address" value={customer.address} />
            <InfoRow label="City" value={customer.city} />
            <InfoRow label="State" value={customer.state} />
            <InfoRow label="Pin Code" value={customer.pincode} />
          </View>

          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: theme.colors.primary }]}
          >
            Customer Status
          </Text>

          <View style={styles.infoSection}>
            <InfoRow label="Status" value={customer.status} />
            <InfoRow
              label="Registration Date"
              value={formatDate(customer.registrationDate)}
            />
            <InfoRow
              label="Total Orders"
              value={customer.totalOrders?.toString()}
            />
            <InfoRow
              label="Total Value"
              value={
                customer.totalValue
                  ? `₹${customer.totalValue.toLocaleString()}`
                  : undefined
              }
            />
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: '#F2F2F7',
    },
    infoCard: {
      marginBottom: 16,
      elevation: 2,
    },
    cardContent: {
      paddingVertical: 16,
    },
    sectionTitle: {
      marginBottom: 12,
      marginTop: 8,
      // color: '#004C89',
      fontWeight: 'bold',
    },
    infoSection: {
      marginBottom: 16,
    },
    infoRow: {
      paddingHorizontal: 0,
      paddingVertical: 8,
    },
    infoLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#666666',
    },
    infoValue: {
      fontSize: 16,
      color: '#000000',
      marginTop: 4,
    },
    infoValueEmpty: {
      color: '#999999',
      fontStyle: 'italic',
    },
    divider: {
      marginVertical: 4,
      backgroundColor: '#E5E5EA',
    },

    // Loading state
    skeletonContainer: {
      flex: 1,
      padding: 16,
    },
    loader: {
      marginVertical: 20,
    },
    loadingText: {
      textAlign: 'center',
      color: '#666666',
      marginBottom: 20,
    },
    skeletonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E5EA',
    },
    skeletonText: {
      height: 16,
      backgroundColor: '#E5E5EA',
      borderRadius: 8,
    },

    // Error state
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      padding: 16,
    },
    errorBanner: {
      marginBottom: 20,
    },
    errorTitle: {
      color: '#FF3B30',
      marginBottom: 4,
    },
    errorMessage: {
      color: '#666666',
    },

    // No data state
    noDataContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    noDataText: {
      color: '#666666',
      marginBottom: 16,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 8,
    },
    //////
    phoneActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    actionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    // callButton: {
    //   backgroundColor: theme.colors.primary,
    // },
    // smsButton: {
    //   backgroundColor: '#34C759',
    // },
    // actionIcon: {
    //   fontSize: 18,
    //   color: 'white',
    // },
    actionIcon: {
      width: 16,
      height: 16,
      tintColor: 'white',
    },
    callButton: {
      backgroundColor: theme.colors.primary,
    },
    smsButton: {
      backgroundColor: '#34C759',
    },
  });

export default CustomerProfileTab;
