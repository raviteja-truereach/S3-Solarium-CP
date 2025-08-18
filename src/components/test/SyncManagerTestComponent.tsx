/**
 * SyncManager Test Component
 * Updated to use real auth token from Redux
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useDatabase } from '../../database/DatabaseProvider';
import {
  SyncManager,
  SyncEvents,
  createSyncManager,
} from '../../sync/SyncManager';
import { useSelector } from 'react-redux';
import {
  selectLeads,
  selectLeadsTotalCount,
} from '../../store/slices/leadSlice';
import type { RootState } from '../../store';

export const SyncManagerTestComponent: React.FC = () => {
  const [syncManager, setSyncManager] = useState<SyncManager | null>(null);
  const [syncStatus, setSyncStatus] = useState('Not initialized');
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { db } = useDatabase();

  // Get auth token from Redux
  const authToken = useSelector((state: RootState) => state.auth.token);
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const user = useSelector((state: RootState) => state.auth.user);

  // Get current leads from Redux
  const leads = useSelector(selectLeads);
  const totalCount = useSelector(selectLeadsTotalCount);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setSyncLogs((prev) => [logEntry, ...prev.slice(0, 19)]); // Keep last 20 logs
    console.log('SyncManager Test:', message);
  };

  useEffect(() => {
    if (db && authToken && isLoggedIn) {
      addLog(
        `Initializing SyncManager with auth token for user: ${
          user?.name || 'Unknown'
        }`
      );

      const manager = createSyncManager(db, authToken);
      setSyncManager(manager);

      // Set up event listeners
      manager.on(SyncEvents.SYNC_STARTED, () => {
        setIsRunning(true);
        setSyncStatus('Sync started');
        addLog('🔄 Sync started');
      });

      manager.on(SyncEvents.SYNC_PROGRESS, (progress) => {
        setSyncStatus(
          `Page ${progress.currentPage}/${progress.totalPages} - ${progress.processedRecords} records`
        );
        addLog(
          `📄 Page ${progress.currentPage}/${progress.totalPages}: ${progress.processedRecords}/${progress.totalRecords} records`
        );
      });

      manager.on(SyncEvents.SYNC_FINISHED, (result) => {
        setIsRunning(false);
        setSyncStatus(`✅ Sync completed: ${result.recordCounts.leads} leads`);
        addLog(
          `✅ Sync completed: ${result.recordCounts.leads} leads in ${result.duration}ms (${result.pagesProcessed} pages)`
        );
      });

      manager.on(SyncEvents.SYNC_FAILED, (result) => {
        setIsRunning(false);
        setSyncStatus(`❌ Sync failed: ${result.failureReason}`);
        addLog(`❌ Sync failed: ${result.failureReason} - ${result.error}`);
      });

      setSyncStatus('SyncManager initialized with real auth token');
      addLog('✅ SyncManager initialized with real auth token');
    } else if (db && !authToken) {
      setSyncStatus('❌ No auth token available');
      addLog('❌ Cannot initialize SyncManager: No auth token');
    } else if (!db) {
      setSyncStatus('❌ Database not ready');
      addLog('❌ Cannot initialize SyncManager: Database not ready');
    }

    return () => {
      if (syncManager) {
        syncManager.removeAllListeners();
      }
    };
  }, [db, authToken, isLoggedIn, user]);

  const startSync = async () => {
    if (!syncManager) {
      Alert.alert(
        'Error',
        'SyncManager not initialized. Please ensure you are logged in.'
      );
      return;
    }

    if (!authToken) {
      Alert.alert('Error', 'No auth token available. Please login again.');
      return;
    }

    try {
      addLog('Starting manual sync with real API...');
      await syncManager.performSync();
    } catch (error) {
      addLog(`Sync error: ${error}`);
      Alert.alert('Sync Error', `${error}`);
    }
  };

  const forceSync = async () => {
    if (!syncManager) {
      Alert.alert(
        'Error',
        'SyncManager not initialized. Please ensure you are logged in.'
      );
      return;
    }

    if (!authToken) {
      Alert.alert('Error', 'No auth token available. Please login again.');
      return;
    }

    try {
      addLog('Starting forced sync (bypass throttle)...');
      await syncManager.forceSync();
    } catch (error) {
      addLog(`Force sync error: ${error}`);
      Alert.alert('Force Sync Error', `${error}`);
    }
  };

  const getSyncStatus = () => {
    if (!syncManager) {
      Alert.alert('Error', 'SyncManager not initialized');
      return;
    }

    const status = syncManager.getSyncStatus();
    addLog(
      `Sync status: running=${status.isRunning}, canSync=${
        status.canSync
      }, lastSync=${
        status.lastSyncTime
          ? new Date(status.lastSyncTime).toLocaleString()
          : 'never'
      }`
    );

    Alert.alert(
      'Sync Status',
      `Running: ${status.isRunning}\n` +
        `Can Sync: ${status.canSync}\n` +
        `Last Sync: ${
          status.lastSyncTime
            ? new Date(status.lastSyncTime).toLocaleString()
            : 'Never'
        }\n` +
        `Auth Token: ${authToken ? '✅ Available' : '❌ Missing'}\n` +
        `User: ${user?.name || 'Not logged in'}`
    );
  };

  const testAuthToken = () => {
    const tokenPreview = authToken
      ? `${authToken.substring(0, 20)}...`
      : 'Not available';
    Alert.alert(
      'Auth Token Info',
      `Logged In: ${isLoggedIn}\n` +
        `User: ${user?.name || 'Unknown'}\n` +
        `User ID: ${user?.id || 'Unknown'}\n` +
        `Token: ${tokenPreview}\n` +
        `Token Length: ${authToken?.length || 0} chars`
    );
  };

  const clearLogs = () => {
    setSyncLogs([]);
    addLog('Logs cleared');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>SyncManager Test (Real Auth)</Text>

      {/* Auth Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Authentication Status</Text>
        <Text
          style={[
            styles.statusText,
            { color: isLoggedIn ? '#28a745' : '#dc3545' },
          ]}
        >
          Status: {isLoggedIn ? '✅ Logged In' : '❌ Not Logged In'}
        </Text>
        <Text style={styles.statusText}>
          User: {user?.name || 'Not available'}
        </Text>
        <Text style={styles.statusText}>
          User ID: {user?.id || 'Not available'}
        </Text>
        <Text style={styles.statusText}>
          Token:{' '}
          {authToken
            ? `✅ Available (${authToken.length} chars)`
            : '❌ Missing'}
        </Text>
      </View>

      {/* Sync Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sync Status</Text>
        <Text style={styles.statusText}>{syncStatus}</Text>
        <Text style={styles.statusText}>
          Leads in Redux: {leads?.length || 0}
        </Text>
        <Text style={styles.statusText}>Total Count: {totalCount}</Text>
        <Text style={styles.statusText}>
          Running: {isRunning ? 'Yes' : 'No'}
        </Text>
      </View>

      {/* Control Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Controls</Text>

        {!isLoggedIn && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              ⚠️ Please login first to test sync functionality
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.infoButton]}
          onPress={testAuthToken}
        >
          <Text style={styles.buttonText}>🔑 Check Auth Token</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            (!isLoggedIn || isRunning) && styles.disabledButton,
          ]}
          onPress={startSync}
          disabled={!isLoggedIn || isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? '⏳ Syncing...' : '🔄 Start Real Sync'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.warningButton,
            (!isLoggedIn || isRunning) && styles.disabledButton,
          ]}
          onPress={forceSync}
          disabled={!isLoggedIn || isRunning}
        >
          <Text style={styles.buttonText}>⚡ Force Sync</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={getSyncStatus}
        >
          <Text style={styles.buttonText}>📊 Get Status</Text>
        </TouchableOpacity>
      </View>

      {/* Logs Section */}
      <View style={styles.section}>
        <View style={styles.logsHeader}>
          <Text style={styles.sectionTitle}>Sync Logs</Text>
          <TouchableOpacity onPress={clearLogs}>
            <Text style={styles.clearLogsText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.logsContainer} nestedScrollEnabled>
          {syncLogs.map((log, index) => (
            <Text key={index} style={styles.logText}>
              {log}
            </Text>
          ))}
          {syncLogs.length === 0 && (
            <Text style={styles.emptyLogsText}>No logs yet...</Text>
          )}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#17a2b8',
  },
  warningButton: {
    backgroundColor: '#ffc107',
  },
  infoButton: {
    backgroundColor: '#6c757d',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearLogsText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  logsContainer: {
    maxHeight: 300,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
    marginBottom: 4,
  },
  emptyLogsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SyncManagerTestComponent;
