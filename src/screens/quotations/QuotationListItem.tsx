import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import type { Quotation } from '../../types/quotation';
import { formatCurrency } from '../../utils/index';
import { useConnectivity } from '../../contexts/ConnectivityContext';
import { Assets } from '../../../assets';

interface QuotationListItemProps {
  /** Quotation data */
  quotation: Quotation;
  /** Press handler */
  onPress: (quotation: Quotation) => void;
  /** Share handler */
  onShare?: (quotation: Quotation) => void;
  /** PDF view handler */
  onViewPdf?: (quotation: Quotation) => void;
  /** Loading state for share action */
  isSharing?: boolean;
  /** Loading state for PDF action */
  isLoadingPdf?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Get status color based on quotation status
 */
const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'draft':
      return '#9E9E9E';
    case 'generated':
    case 'created':
      return '#2196F3';
    case 'shared':
      return '#FF9800';
    case 'accepted':
      return '#4CAF50';
    case 'rejected':
      return '#F44336';
    default:
      return '#9E9E9E';
  }
};

/**
 * Get status display text
 */
const getStatusText = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'generated':
    case 'created':
      return 'Generated';
    case 'shared':
      return 'Shared';
    case 'accepted':
      return 'Accepted';
    case 'rejected':
      return 'Rejected';
    default:
      return status;
  }
};

/**
 * Determine if share is allowed
 */
const isShareEnabled = (status: string, isOnline: boolean): boolean => {
  return status.toLowerCase() === 'created' && isOnline;
};

/**
 * Determine if PDF view is allowed
 */
const isPdfEnabled = (status: string, isOnline: boolean): boolean => {
  const pdfStatuses = ['shared', 'accepted', 'rejected'];
  return pdfStatuses.includes(status.toLowerCase()) && isOnline;
};

/**
 * QuotationListItem Component
 */
export const QuotationListItem: React.FC<QuotationListItemProps> = React.memo(
  ({
    quotation,
    onPress,
    onShare,
    onViewPdf,
    isSharing = false,
    isLoadingPdf = false,
    testID,
  }) => {
    const theme = useTheme();
    const { isOnline } = useConnectivity();

    const handlePress = useCallback(() => {
      onPress(quotation);
    }, [quotation, onPress]);

    const handleShare = useCallback(
      (e: any) => {
        e.stopPropagation();
        onShare?.(quotation);
      },
      [quotation, onShare]
    );

    const handleViewPdf = useCallback(
      (e: any) => {
        e.stopPropagation();
        onViewPdf?.(quotation);
      },
      [quotation, onViewPdf]
    );

    // Memoize status styling
    const statusColor = useMemo(
      () => getStatusColor(quotation.status),
      [quotation.status]
    );
    const statusText = useMemo(
      () => getStatusText(quotation.status),
      [quotation.status]
    );

    // Check if actions are enabled
    const shareEnabled = useMemo(
      () => isShareEnabled(quotation.status, isOnline),
      [quotation.status, isOnline]
    );
    const pdfEnabled = useMemo(
      () => isPdfEnabled(quotation.status, isOnline),
      [quotation.status, isOnline]
    );

    // Format dates
    const createdDate = useMemo(() => {
      return new Date(quotation.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }, [quotation.createdAt]);

    // Format system capacity
    const systemCapacity = useMemo(() => {
      return `${quotation.systemKW} kW`;
    }, [quotation.systemKW]);

    // Format amount
    const formattedAmount = useMemo(() => {
      return formatCurrency(quotation.totalCost);
    }, [quotation.totalCost]);

    const accessibilityLabel = `Quotation ${quotation.quotationId}. Status: ${statusText}. System: ${systemCapacity}. Amount: ${formattedAmount}. Created: ${createdDate}. Lead ID: ${quotation.leadId}`;

    return (
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        testID={testID}
      >
        <View style={styles.header}>
          <Text style={[styles.quotationId, { color: theme.colors.onSurface }]}>
            {quotation.quotationId}
          </Text>
          <View style={[styles.statusChip, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.details}>
          <Text
            style={[styles.leadId, { color: theme.colors.onSurfaceVariant }]}
          >
            Lead: {quotation.leadId}
          </Text>
          <Text
            style={[
              styles.systemInfo,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            System: {systemCapacity}
          </Text>
        </View>

        {/* Amount and Date Row */}
        <View style={styles.amountDateRow}>
          <Text style={[styles.amount, { color: theme.colors.primary }]}>
            {formattedAmount}
          </Text>
          <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>
            {createdDate}
          </Text>
        </View>

        {/* Action Buttons Row */}
        {(shareEnabled || pdfEnabled) && (
          <View style={styles.actionsRow}>
            {shareEnabled && (
              <TouchableOpacity
                style={[
                  styles.shareButton,
                  { backgroundColor: theme.colors.primary },
                  !isOnline && styles.buttonDisabled,
                ]}
                onPress={handleShare}
                disabled={isSharing || !isOnline}
                testID={`share-button-${quotation.quotationId}`}
              >
                {isSharing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Image
                      source={Assets.icons.share}
                      style={styles.buttonIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.buttonText}>Share</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {pdfEnabled && (
              <TouchableOpacity
                style={[
                  styles.pdfButton,
                  { backgroundColor: theme.colors.primary },
                  !isOnline && styles.buttonDisabled,
                ]}
                onPress={handleViewPdf}
                disabled={isLoadingPdf || !isOnline}
                testID={`pdf-button-${quotation.quotationId}`}
              >
                {isLoadingPdf ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Image
                      source={Assets.icons.clipboard}
                      style={styles.buttonIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.buttonText}>View PDF</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quotationId: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  details: {
    marginBottom: 8,
  },
  leadId: {
    fontSize: 14,
    marginBottom: 4,
  },
  systemInfo: {
    fontSize: 14,
  },
  amountDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  shareButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#BDBDBD',
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    width: 14,
    height: 14,
    marginRight: 6,
    tintColor: '#FFFFFF',
  },

  // UPDATE EXISTING buttonText style
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default QuotationListItem;
