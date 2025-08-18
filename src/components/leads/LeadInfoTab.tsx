/**
 * Lead Info Tab Component
 * Displays read-only lead information with error/loading states
 */
import React, { useCallback } from 'react';
import { View, StyleSheet, Linking, Alert } from 'react-native';
import {
  List,
  Divider,
  Button,
  Banner,
  Text,
  Card,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import { ScrollView } from 'react-native';
import type { Lead } from '@types/lead';
import { STRINGS } from '@constants/strings';

export interface LeadInfoTabProps {
  lead?: Lead;
  loading: boolean;
  error?: unknown;
  onRetry: () => void;
}

/**
 * Skeleton Loader Component
 */
const InfoSkeleton: React.FC = () => (
  <View style={styles.skeletonContainer}>
    <ActivityIndicator size="large" style={styles.loader} />
    <Text variant="bodyMedium" style={styles.loadingText}>
      {STRINGS.LEAD_INFO.LOADING_LEAD}
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

/**
 * Error State Component
 */
const ErrorState: React.FC<{ error: unknown; onRetry: () => void }> = ({
  error,
  onRetry,
}) => {
  const getErrorMessage = (err: unknown): string => {
    if (err === 'cache-miss') return STRINGS.ERRORS.CACHE_MISS;
    if (err instanceof Error) return err.message;
    return STRINGS.ERRORS.UNKNOWN_ERROR;
  };

  return (
    <View style={styles.errorContainer}>
      <Banner
        visible={true}
        actions={[
          {
            label: STRINGS.LEAD_INFO.RETRY_BUTTON,
            onPress: onRetry,
          },
        ]}
        // icon="alert-circle"
        style={styles.errorBanner}
      >
        <View>
          <Text variant="titleMedium" style={styles.errorTitle}>
            {STRINGS.LEAD_INFO.LOAD_ERROR_TITLE}
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
  const handleCall = useCallback(async () => {
    try {
      const phoneUrl = `tel:${phone}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);

      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Unable to make phone calls on this device');
      }
    } catch (error) {
      console.error('Error opening phone dialer:', error);
      Alert.alert('Error', 'Unable to open phone dialer');
    }
  }, [phone]);

  const handleSMS = useCallback(async () => {
    try {
      const smsUrl = `sms:${phone}`;
      const canOpen = await Linking.canOpenURL(smsUrl);

      if (canOpen) {
        await Linking.openURL(smsUrl);
      } else {
        Alert.alert('Error', 'Unable to send SMS on this device');
      }
    } catch (error) {
      console.error('Error opening SMS:', error);
      Alert.alert('Error', 'Unable to open SMS');
    }
  }, [phone]);

  return (
    <View style={styles.phoneActions}>
      <IconButton
        icon="phone"
        mode="contained"
        size={20}
        onPress={handleCall}
        style={styles.actionButton}
        iconColor="#FFFFFF"
        containerColor="#004C89"
        accessibilityLabel={`${STRINGS.LEAD_INFO.CALL} ${phone}`}
      />
      <IconButton
        icon="message-text"
        mode="contained"
        size={20}
        onPress={handleSMS}
        style={styles.actionButton}
        iconColor="#FFFFFF"
        containerColor="#34C759"
        accessibilityLabel={`${STRINGS.LEAD_INFO.SMS} ${phone}`}
      />
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
  const displayValue = value || STRINGS.LEAD_INFO.NOT_PROVIDED;
  const hasValue = Boolean(value);

  // Move component creation outside the render prop
  const renderRight = useCallback(() => {
    if (showPhoneActions && hasValue) {
      return <PhoneActions phone={value!} />;
    }
    return null;
  }, [showPhoneActions, hasValue, value]);

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
        // right={showPhoneActions && hasValue ? renderRight : undefined}
        style={styles.infoRow}
        accessibilityLabel={`${label}: ${displayValue}`}
        accessibilityRole="text"
      />
      <Divider style={styles.divider} />
    </>
  );
};

/**
 * Lead Info Tab Component
 */
export const LeadInfoTab: React.FC<LeadInfoTabProps> = ({
  lead,
  loading,
  error,
  onRetry,
}) => {
  // Loading state
  if (loading) {
    return <InfoSkeleton />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  // No data state
  if (!lead) {
    return (
      <View style={styles.noDataContainer}>
        <Text variant="titleMedium" style={styles.noDataText}>
          No lead data available
        </Text>
        <Button mode="outlined" onPress={onRetry} style={styles.retryButton}>
          {STRINGS.LEAD_INFO.RETRY_BUTTON}
        </Button>
      </View>
    );
  }

  // Format next follow-up date
  const formatFollowUpDate = (date: string | null | undefined): string => {
    if (!date) return STRINGS.LEAD_INFO.NOT_PROVIDED;

    try {
      const followUpDate = new Date(date);
      return followUpDate.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return date;
    }
  };
  console.log('lead in info tab', lead);
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.infoCard}>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Contact Information
          </Text>

          <View style={styles.infoSection}>
            <InfoRow
              label={STRINGS.LEAD_INFO.CUSTOMER_NAME}
              value={lead.customerName}
            />
            <InfoRow
              label={STRINGS.LEAD_INFO.PHONE}
              value={lead.phone}
              showPhoneActions={true}
            />
            <InfoRow label={STRINGS.LEAD_INFO.EMAIL} value={lead.email} />
          </View>

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Address Information
          </Text>

          <View style={styles.infoSection}>
            <InfoRow label={STRINGS.LEAD_INFO.CITY} value={lead.city} />
            <InfoRow label={STRINGS.LEAD_INFO.STATE} value={lead.state} />
            <InfoRow label={STRINGS.LEAD_INFO.PIN_CODE} value={lead.pinCode} />
          </View>

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Lead Status
          </Text>

          <View style={styles.infoSection}>
            <InfoRow
              label={STRINGS.LEAD_INFO.CURRENT_STATUS}
              value={lead.status}
            />
            <InfoRow
              label={STRINGS.LEAD_INFO.NEXT_FOLLOWUP}
              value={formatFollowUpDate(lead.nextFollowUpDate)}
            />
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
    color: '#004C89',
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
  phoneActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    margin: 0,
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
});

export default LeadInfoTab;
