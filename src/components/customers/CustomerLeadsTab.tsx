/**
 * Customer Leads Tab Component
 * Displays leads associated with customer (using mock data as requested)
 */
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import {
  Text,
  Card,
  Chip,
  ActivityIndicator,
  Banner,
  Button,
} from 'react-native-paper';

// Mock lead interface
interface MockLead {
  leadId: string;
  customerName: string;
  status: string;
  createdAt: string;
  nextFollowUpDate?: string;
  phone: string;
}

export interface CustomerLeadsTabProps {
  customerId: string;
}

/**
 * Lead Status Badge Component
 */
const LeadStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'won':
        return '#34C759';
      case 'lost':
        return '#FF3B30';
      case 'qualified':
        return '#004C89';
      case 'contacted':
        return '#FF9500';
      case 'new':
      default:
        return '#8E8E93';
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
 * Lead Item Component
 */
const LeadItem: React.FC<{ lead: MockLead }> = ({ lead }) => {
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
    <Card style={styles.leadCard}>
      <Card.Content>
        <View style={styles.leadHeader}>
          <Text variant="titleMedium" style={styles.leadId}>
            Lead #{lead.leadId}
          </Text>
          <LeadStatusBadge status={lead.status} />
        </View>

        <View style={styles.leadDetails}>
          <Text variant="bodyMedium" style={styles.detailText}>
            Created: {formatDate(lead.createdAt)}
          </Text>
          {lead.nextFollowUpDate && (
            <Text variant="bodyMedium" style={styles.detailText}>
              Follow-up: {formatDate(lead.nextFollowUpDate)}
            </Text>
          )}
          <Text variant="bodyMedium" style={styles.detailText}>
            Phone: {lead.phone}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

/**
 * Empty Leads State Component
 */
const EmptyLeadsState: React.FC = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyIcon}>📋</Text>
    <Text variant="titleMedium" style={styles.emptyTitle}>
      No Associated Leads
    </Text>
    <Text variant="bodyMedium" style={styles.emptyMessage}>
      This customer doesn't have any associated leads yet.
    </Text>
  </View>
);

/**
 * Loading State Component
 */
const LoadingState: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" style={styles.loader} />
    <Text variant="bodyMedium" style={styles.loadingText}>
      Loading associated leads...
    </Text>
  </View>
);

/**
 * Mock API call function
 */
const fetchCustomerLeads = async (customerId: string): Promise<MockLead[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Mock data - in real implementation this would be an API call
  const mockLeads: MockLead[] = [
    {
      leadId: 'LEAD-001',
      customerName: 'John Doe',
      status: 'Qualified',
      createdAt: '2024-01-15',
      nextFollowUpDate: '2024-01-20',
      phone: '+91-9876543210',
    },
    {
      leadId: 'LEAD-002',
      customerName: 'John Doe',
      status: 'Won',
      createdAt: '2024-01-10',
      phone: '+91-9876543210',
    },
    {
      leadId: 'LEAD-003',
      customerName: 'John Doe',
      status: 'Contacted',
      createdAt: '2024-01-05',
      nextFollowUpDate: '2024-01-25',
      phone: '+91-9876543210',
    },
  ];

  // Filter leads by customerId in real implementation
  return mockLeads;
};

/**
 * Customer Leads Tab Component
 */
export const CustomerLeadsTab: React.FC<CustomerLeadsTabProps> = ({
  customerId,
}) => {
  const [leads, setLeads] = useState<MockLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load leads data
  const loadLeads = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchCustomerLeads(customerId);
      setLeads(data);
    } catch (err) {
      setError('Failed to load associated leads');
      console.error('Error loading customer leads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [customerId]);

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Banner
          visible={true}
          actions={[
            {
              label: 'Retry',
              onPress: loadLeads,
            },
          ]}
          style={styles.errorBanner}
        >
          <View>
            <Text variant="titleMedium" style={styles.errorTitle}>
              Failed to load leads
            </Text>
          </View>
          <View>
            <Text variant="bodyMedium" style={styles.errorMessage}>
              {error}
            </Text>
          </View>
        </Banner>
      </View>
    );
  }

  // Empty state
  if (leads.length === 0) {
    return <EmptyLeadsState />;
  }

  // Calculate lead stats
  const leadStats = leads.reduce(
    (acc, lead) => {
      acc.total++;
      const status = lead.status.toLowerCase();
      if (status === 'won') acc.won++;
      else if (status === 'lost') acc.lost++;
      else acc.active++;
      return acc;
    },
    { total: 0, won: 0, lost: 0, active: 0 }
  );

  const renderLeadItem = ({ item }: { item: MockLead }) => (
    <LeadItem lead={item} />
  );

  return (
    <View style={styles.container}>
      {/* Leads Summary Header */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.summaryTitle}>
            Associated Leads Summary
          </Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{leadStats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#34C759' }]}>
                {leadStats.won}
              </Text>
              <Text style={styles.statLabel}>Won</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#007AFF' }]}>
                {leadStats.active}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#FF3B30' }]}>
                {leadStats.lost}
              </Text>
              <Text style={styles.statLabel}>Lost</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Mock Data Notice */}
      {/* <Banner visible={true} style={styles.mockBanner}>
        <Text variant="bodySmall" style={styles.mockText}>
          🚧 Using mock data - Real API integration pending
        </Text>
      </Banner> */}

      {/* Leads List */}
      <FlatList
        data={leads}
        renderItem={renderLeadItem}
        keyExtractor={(item) => item.leadId}
        contentContainerStyle={styles.leadsList}
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
  mockBanner: {
    marginBottom: 16,
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
  },
  mockText: {
    color: '#856404',
    fontStyle: 'italic',
  },
  leadsList: {
    paddingBottom: 20,
  },
  separator: {
    height: 8,
  },
  leadCard: {
    elevation: 1,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leadId: {
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
  leadDetails: {
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

export default CustomerLeadsTab;
