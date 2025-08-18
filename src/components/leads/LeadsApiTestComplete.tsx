import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useGetLeadsQuery } from '../../store/api/leadApi';
import { useSelector } from 'react-redux';
import {
  selectLeads,
  selectLeadsTotalCount,
  selectLeadsLoading,
  selectLeadsError,
  selectLeadsLastSync,
  selectLeadState,
} from '../../store/slices/leadSlice';
import type { RootState } from '../../store';
import type { Lead } from '../../database/models/Lead';

export const LeadsApiTestComplete: React.FC = () => {
  const [showDebug, setShowDebug] = React.useState(false);

  const {
    data: apiData,
    error: apiError,
    isLoading: apiLoading,
    refetch,
  } = useGetLeadsQuery({
    offset: 0,
    limit: 25,
  });

  // Debug: Get the full state to see structure
  const fullState = useSelector((state: RootState) => state);
  const leadState = useSelector((state: RootState) => selectLeadState(state));

  // Get leads from the slice with safe selectors
  const leads = useSelector(selectLeads);
  const totalCount = useSelector(selectLeadsTotalCount);
  const isLoading = useSelector(selectLeadsLoading);
  const error = useSelector(selectLeadsError);
  const lastSync = useSelector(selectLeadsLastSync);

  const handleRefresh = () => {
    try {
      refetch();
    } catch (error) {
      console.error('Error refreshing:', error);
    }
  };

  // Enhanced debug logging
  React.useEffect(() => {
    console.log('🔍 Full Redux State Keys:', Object.keys(fullState));
    console.log('🔍 Lead State:', leadState);
    console.log('🔍 API Data:', apiData);
    console.log('🔍 Component State:', {
      leadsFromSelector: leads?.length || 0,
      totalCountFromSelector: totalCount,
      isLoadingFromSelector: isLoading,
      apiLoading,
      errorFromSelector: error,
      apiError,
      lastSyncFromSelector: lastSync,
    });
  }, [
    fullState,
    leadState,
    apiData,
    leads,
    totalCount,
    isLoading,
    apiLoading,
    error,
    apiError,
    lastSync,
  ]);

  if (showDebug) {
    return (
      <ScrollView style={styles.debugContainer}>
        <TouchableOpacity
          style={styles.debugToggle}
          onPress={() => setShowDebug(false)}
        >
          <Text style={styles.debugToggleText}>Hide Debug</Text>
        </TouchableOpacity>

        <Text style={styles.debugTitle}>State Debug Info</Text>

        <Text style={styles.debugLabel}>Redux State Keys:</Text>
        <Text style={styles.debugText}>
          {Object.keys(fullState).join(', ')}
        </Text>

        <Text style={styles.debugLabel}>Lead State:</Text>
        <Text style={styles.debugText}>
          {JSON.stringify(leadState, null, 2)}
        </Text>

        <Text style={styles.debugLabel}>API Data:</Text>
        <Text style={styles.debugText}>{JSON.stringify(apiData, null, 2)}</Text>

        <Text style={styles.debugLabel}>Selector Results:</Text>
        <Text style={styles.debugText}>
          {JSON.stringify(
            {
              leadsCount: leads?.length || 0,
              totalCount,
              isLoading,
              error,
              lastSync: lastSync ? new Date(lastSync).toISOString() : null,
            },
            null,
            2
          )}
        </Text>
      </ScrollView>
    );
  }

  if (apiLoading || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading leads...</Text>
        <TouchableOpacity
          style={styles.debugButton}
          onPress={() => setShowDebug(true)}
        >
          <Text style={styles.debugButtonText}>Show Debug</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (apiError || error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Error loading leads:</Text>
        <Text style={styles.errorDetail}>
          {JSON.stringify(apiError || error, null, 2)}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.debugButton}
          onPress={() => setShowDebug(true)}
        >
          <Text style={styles.debugButtonText}>Show Debug</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No leads found</Text>
        <Text style={styles.debugInfo}>
          API returned {apiData?.items?.length || 0} items
        </Text>
        <Text style={styles.debugInfo}>
          Selector returned {leads?.length || 0} items
        </Text>
        <Text style={styles.debugInfo}>
          Last sync: {lastSync ? new Date(lastSync).toLocaleString() : 'never'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.debugButton}
          onPress={() => setShowDebug(true)}
        >
          <Text style={styles.debugButtonText}>Show Debug</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          My Leads ({leads.length} of {totalCount})
        </Text>
        {lastSync && (
          <Text style={styles.lastSync}>
            Last sync: {new Date(lastSync).toLocaleString()}
          </Text>
        )}
        <TouchableOpacity
          style={styles.debugButton}
          onPress={() => setShowDebug(true)}
        >
          <Text style={styles.debugButtonText}>Debug</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={leads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Lead }) => (
          <View style={styles.leadCard}>
            <View style={styles.leadHeader}>
              <Text style={styles.customerName}>
                {item.customerName || 'Unknown Customer'}
              </Text>
              <Text style={[styles.status, getStatusStyle(item.status)]}>
                {item.status}
              </Text>
            </View>

            <Text style={styles.leadId}>ID: {item.id}</Text>
            <Text style={styles.phone}>📞 {item.phone}</Text>
            <Text style={styles.address}>📍 {item.address}</Text>

            {item.services && item.services.length > 0 && (
              <View style={styles.servicesContainer}>
                <Text style={styles.servicesLabel}>Services:</Text>
                {item.services.map((service, index) => (
                  <Text key={index} style={styles.serviceTag}>
                    {service}
                  </Text>
                ))}
              </View>
            )}

            <View style={styles.metadata}>
              <Text style={styles.assignedTo}>👤 {item.assignedTo}</Text>
              <Text style={styles.priority}>
                Priority: {item.priority?.toUpperCase() || 'MEDIUM'}
              </Text>
            </View>

            <Text style={styles.dates}>
              Created: {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={apiLoading} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const getStatusStyle = (status: string) => {
  if (!status) return { backgroundColor: '#f5f5f5', color: '#666' };

  switch (status.toLowerCase()) {
    case 'new lead':
      return { backgroundColor: '#e3f2fd', color: '#1976d2' };
    case 'in discussion':
      return { backgroundColor: '#fff3e0', color: '#f57c00' };
    case 'physical meeting assigned':
      return { backgroundColor: '#f3e5f5', color: '#7b1fa2' };
    case 'won':
      return { backgroundColor: '#e8f5e8', color: '#388e3c' };
    case 'pending at solarium':
      return { backgroundColor: '#fff8e1', color: '#f9a825' };
    case 'under execution':
      return { backgroundColor: '#e0f2f1', color: '#00796b' };
    case 'executed':
      return { backgroundColor: '#e8f5e8', color: '#2e7d32' };
    default:
      return { backgroundColor: '#f5f5f5', color: '#666' };
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  lastSync: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  debugInfo: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  listContent: {
    padding: 16,
  },
  leadCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    textAlign: 'center',
  },
  leadId: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 8,
  },
  servicesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginRight: 8,
  },
  serviceTag: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
    marginBottom: 4,
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  assignedTo: {
    fontSize: 12,
    color: '#666',
  },
  priority: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  dates: {
    fontSize: 12,
    color: '#999',
  },
  error: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorDetail: {
    color: '#dc3545',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
  },
  debugButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
  },
  debugContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  debugToggle: {
    backgroundColor: '#dc3545',
    padding: 10,
    borderRadius: 8,
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  debugToggleText: {
    color: 'white',
    fontWeight: 'bold',
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  debugLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    fontFamily: 'monospace',
  },
});

export default LeadsApiTestComplete;
