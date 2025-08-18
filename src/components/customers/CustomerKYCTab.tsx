/**
 * Customer KYC Tab Component
 * Displays customer KYC documents using existing documentApi
 */
import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import {
  Text,
  Card,
  Chip,
  ActivityIndicator,
  Button,
  Banner,
} from 'react-native-paper';
import { useGetCustomerDocumentsQuery } from '@store/api/documentApi';
import type { KycDocument } from '@types/api/customer';

export interface CustomerKYCTabProps {
  customerId: string;
}

/**
 * KYC Status Badge Component
 */
const KYCStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'approved':
        return '#34C759';
      case 'rejected':
        return '#FF3B30';
      case 'pending':
      default:
        return '#FF9500';
    }
  };

  return (
    <Chip
      mode="flat"
      style={[
        styles.statusBadge,
        { backgroundColor: `${getStatusColor(status)}20` },
      ]}
      textStyle={[styles.statusText, { color: getStatusColor(status) }]}
      compact
    >
      {status}
    </Chip>
  );
};

/**
 * KYC Document Item Component
 */
const KYCDocumentItem: React.FC<{ document: KycDocument }> = ({ document }) => {
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card style={styles.documentCard}>
      <Card.Content>
        <View style={styles.documentHeader}>
          <Text variant="titleMedium" style={styles.documentType}>
            {document.docType}
          </Text>
          <KYCStatusBadge status={document.status} />
        </View>

        <View style={styles.documentDetails}>
          <Text variant="bodyMedium" style={styles.detailText}>
            Uploaded: {formatDate(document.uploadedAt)}
          </Text>
          <Text variant="bodyMedium" style={styles.detailText}>
            By: {document.uploadedBy}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

/**
 * Empty KYC State Component
 */
const EmptyKYCState: React.FC = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyIcon}>📄</Text>
    <Text variant="titleMedium" style={styles.emptyTitle}>
      No KYC Documents
    </Text>
    <Text variant="bodyMedium" style={styles.emptyMessage}>
      No KYC documents have been uploaded for this customer yet.
    </Text>
  </View>
);

/**
 * Error State Component
 */
const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
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
          Failed to load KYC documents
        </Text>
      </View>
      <View>
        <Text variant="bodyMedium" style={styles.errorMessage}>
          Unable to fetch KYC documents. Please check your connection and try
          again.
        </Text>
      </View>
    </Banner>
  </View>
);

/**
 * Loading State Component
 */
const LoadingState: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" style={styles.loader} />
    <Text variant="bodyMedium" style={styles.loadingText}>
      Loading KYC documents...
    </Text>
  </View>
);

/**
 * Customer KYC Tab Component
 */
export const CustomerKYCTab: React.FC<CustomerKYCTabProps> = ({
  customerId,
}) => {
  const {
    data: documentsData,
    isLoading,
    error,
    refetch,
  } = useGetCustomerDocumentsQuery(customerId);

  const documents = documentsData?.data?.documents || [];

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Error state
  if (error) {
    return <ErrorState onRetry={refetch} />;
  }

  // Empty state
  if (documents.length === 0) {
    return <EmptyKYCState />;
  }

  // Calculate KYC summary stats
  const kycStats = documents.reduce(
    (acc, doc) => {
      acc.total++;
      acc[doc.status.toLowerCase() as keyof typeof acc]++;
      return acc;
    },
    { total: 0, approved: 0, pending: 0, rejected: 0 }
  );

  const renderDocumentItem = ({ item }: { item: KycDocument }) => (
    <KYCDocumentItem document={item} />
  );

  return (
    <View style={styles.container}>
      {/* KYC Summary Header */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.summaryTitle}>
            KYC Summary
          </Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{kycStats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#34C759' }]}>
                {kycStats.approved}
              </Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#FF9500' }]}>
                {kycStats.pending}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#FF3B30' }]}>
                {kycStats.rejected}
              </Text>
              <Text style={styles.statLabel}>Rejected</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Documents List */}
      <FlatList
        data={documents}
        renderItem={renderDocumentItem}
        keyExtractor={(item) => item.docId}
        contentContainerStyle={styles.documentsList}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F2F2F7',
  },
  summaryCard: {
    marginBottom: 16,
    elevation: 2,
  },
  summaryTitle: {
    marginBottom: 12,
    color: '#004C89',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#004C89',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  documentsList: {
    paddingBottom: 20,
  },
  separator: {
    height: 8,
  },
  documentCard: {
    elevation: 1,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentType: {
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  documentDetails: {
    gap: 4,
  },
  detailText: {
    color: '#666666',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    marginBottom: 16,
  },
  loadingText: {
    color: '#666666',
    textAlign: 'center',
  },
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
});

export default CustomerKYCTab;
