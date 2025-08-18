import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useGetLeadsQuery } from '../../store/api/leadApi';
import {
  selectAllLeadsSorted,
  selectPaginationMeta,
  selectLeadStatistics,
  selectLeadsNeedingFollowUp,
} from '../../store/selectors/leadSelectors';
import type { RootState } from '../../store';

export const LeadsApiTestPagination: React.FC = () => {
  const [currentPage, setCurrentPage] = React.useState(1);

  const { isLoading, error, refetch } = useGetLeadsQuery({
    offset: (currentPage - 1) * 25,
    limit: 25,
  });

  // Use new selectors
  const sortedLeads = useSelector(selectAllLeadsSorted);
  const paginationMeta = useSelector(selectPaginationMeta);
  const statistics = useSelector(selectLeadStatistics);
  const followUps = useSelector(selectLeadsNeedingFollowUp);

  const loadPage = (page: number) => {
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading page {currentPage}...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Error loading leads</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Statistics Header */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Lead Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{statistics.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{followUps.overdue.length}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{followUps.upcoming.length}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{statistics.byPriority.high}</Text>
            <Text style={styles.statLabel}>High Priority</Text>
          </View>
        </View>
      </View>

      {/* Pagination Controls */}
      <View style={styles.paginationContainer}>
        <Text style={styles.paginationText}>
          Pages loaded: {paginationMeta.pagesLoaded.join(', ')} of{' '}
          {paginationMeta.totalPages}
        </Text>
        <View style={styles.paginationButtons}>
          {Array.from(
            { length: paginationMeta.totalPages },
            (_, i) => i + 1
          ).map((page) => (
            <TouchableOpacity
              key={page}
              style={[
                styles.pageButton,
                paginationMeta.isPageLoaded(page) && styles.pageButtonLoaded,
                currentPage === page && styles.pageButtonActive,
              ]}
              onPress={() => loadPage(page)}
            >
              <Text
                style={[
                  styles.pageButtonText,
                  currentPage === page && styles.pageButtonTextActive,
                ]}
              >
                {page}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Leads List */}
      <FlatList
        data={sortedLeads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.leadCard}>
            <View style={styles.leadHeader}>
              <Text style={styles.customerName}>{item.customerName}</Text>
              <Text style={[styles.priority, getPriorityStyle(item.priority)]}>
                {item.priority?.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.leadId}>ID: {item.id}</Text>
            <Text style={styles.status}>Status: {item.status}</Text>
            {item.follow_up_date && (
              <Text
                style={[
                  styles.followUp,
                  new Date(item.follow_up_date) < new Date()
                    ? styles.overdue
                    : styles.upcoming,
                ]}
              >
                Follow-up: {new Date(item.follow_up_date).toLocaleDateString()}
              </Text>
            )}
            <Text style={styles.phone}>📞 {item.phone}</Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const getPriorityStyle = (priority: string) => {
  switch (priority) {
    case 'high':
      return { backgroundColor: '#ffebee', color: '#c62828' };
    case 'medium':
      return { backgroundColor: '#fff3e0', color: '#ef6c00' };
    case 'low':
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  error: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
  },
  statsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  paginationContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paginationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  paginationButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  pageButton: {
    minWidth: 40,
    height: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  pageButtonLoaded: {
    backgroundColor: '#e3f2fd',
  },
  pageButtonActive: {
    backgroundColor: '#007AFF',
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  pageButtonTextActive: {
    color: 'white',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  priority: {
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
  status: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  followUp: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  overdue: {
    color: '#dc3545',
  },
  upcoming: {
    color: '#28a745',
  },
  phone: {
    fontSize: 14,
    color: '#666',
  },
});

export default LeadsApiTestPagination;
