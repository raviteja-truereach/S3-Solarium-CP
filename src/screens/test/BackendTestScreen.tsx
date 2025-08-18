import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { getSyncManager } from '../../sync';
import { ReduxStateMonitor } from './ReduxDevToolsHelper';
import { useDatabase } from '../../hooks/useDatabase';
import { DocumentDao } from '../../database/dao/DocumentDao';
import { DocumentSyncService } from '../../services/DocumentSyncService';
import { AppButton } from '@components/common';
import { migrateTo3_addDocumentsTable } from '../../database/migrations/steps/v3_add_documents_table';

export const BackendTestScreen: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [testToken, setTestToken] = useState('valid_token');
  const [isRunning, setIsRunning] = useState(false);
  const { db, authToken } = useDatabase();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[BackendTest] ${message}`);
  };

  // Manually set token for testing
  const setMockToken = async (token: string) => {
    try {
      const { store } = await import('../../store');
      const { loginSuccess } = await import('../../store/slices/authSlice');

      store.dispatch(
        loginSuccess({
          token: token,
          expiresAt: Date.now() + 3600000, // 1 hour
          user: { id: 'test', name: 'Test User', phone: '1234567890' },
        })
      );

      addLog(`Token set to: ${token}`);
    } catch (error) {
      addLog(`Failed to set token: ${error.message}`);
    }
  };

  const testSuccessfulSync = async () => {
    addLog('=== Testing Successful Sync ===');
    setIsRunning(true);

    await setMockToken('valid_token');

    const syncManager = getSyncManager();
    const result = await syncManager.manualSync('manual');

    addLog(`Sync result: ${JSON.stringify(result, null, 2)}`);
    setIsRunning(false);
  };

  const testAuthFailure = async () => {
    addLog('=== Testing Auth Failure (401) ===');
    setIsRunning(true);

    await setMockToken('expired_token');

    const syncManager = getSyncManager();
    const result = await syncManager.manualSync('manual');

    addLog(`Auth failure result: ${JSON.stringify(result, null, 2)}`);
    addLog('Check if logout was triggered!');
    setIsRunning(false);
  };

  const testRetryLogic = async () => {
    addLog('=== Testing Retry Logic (5xx errors) ===');
    addLog('Note: This requires modifying the endpoint temporarily');

    // You would need to temporarily change the endpoint in SyncManager
    // to point to '/leads-error' to test this

    Alert.alert(
      'Manual Test Required',
      'To test retry logic:\n1. Modify SyncManager to use /leads-error endpoint\n2. Run sync\n3. Watch console for retry attempts'
    );
  };

  const testNetworkTimeout = async () => {
    addLog('=== Testing Network Timeout ===');
    addLog('Stop the mock server to test this');
    setIsRunning(true);

    const syncManager = getSyncManager();
    const result = await syncManager.manualSync('manual');

    addLog(`Timeout result: ${JSON.stringify(result, null, 2)}`);
    setIsRunning(false);
  };

  const clearLogs = () => setLogs([]);

  const testCachePersistence = async () => {
    addLog('=== Testing Cache Persistence ===');
    setIsRunning(true);

    await setMockToken('valid_token');

    const syncManager = getSyncManager();

    // Before sync - check current counts
    try {
      const { openEncryptedDb } = await import('../../database/database');
      const database = await openEncryptedDb();

      const { getInstance: getLeadDao } = await import(
        '../../database/dao/LeadDao'
      );
      const leadDao = getLeadDao(database);

      const beforeCount = await leadDao.count();
      addLog(`📊 Records before sync: ${beforeCount} leads`);
    } catch (error) {
      addLog(`❌ Error checking before count: ${error.message}`);
    }

    // Run sync
    addLog('🚀 Starting sync with cache persistence...');
    const result = await syncManager.manualSync('manual');
    addLog(`✅ Sync result: ${JSON.stringify(result, null, 2)}`);

    // After sync - check new counts
    try {
      const { openEncryptedDb } = await import('../../database/database');
      const database = await openEncryptedDb();

      const { getInstance: getLeadDao } = await import(
        '../../database/dao/LeadDao'
      );
      const { getInstance: getCustomerDao } = await import(
        '../../database/dao/CustomerDao'
      );
      const { getInstance: getSyncDao } = await import(
        '../../database/dao/SyncDao'
      );

      const leadDao = getLeadDao(database);
      const customerDao = getCustomerDao(database);
      const syncDao = getSyncDao(database);

      const [leadCount, customerCount, leadSync, customerSync] =
        await Promise.all([
          leadDao.count(),
          customerDao.count(),
          syncDao.getByTableName('leads'),
          syncDao.getByTableName('customers'),
        ]);

      addLog(`📊 Records after sync:`);
      addLog(`   📋 Leads: ${leadCount}`);
      addLog(`   👥 Customers: ${customerCount}`);
      addLog(`🔄 Sync metadata:`);
      addLog(
        `   Leads: ${
          leadSync
            ? `${leadSync.record_count} records, ${leadSync.sync_status}`
            : 'No metadata'
        }`
      );
      addLog(
        `   Customers: ${
          customerSync
            ? `${customerSync.record_count} records, ${customerSync.sync_status}`
            : 'No metadata'
        }`
      );
    } catch (error) {
      addLog(`❌ Error checking after count: ${error.message}`);
    }

    setIsRunning(false);
  };

  const testReduxHydration = async () => {
    addLog('=== Testing Redux Slice Hydration ===');
    setIsRunning(true);

    await setMockToken('valid_token');

    // Check Redux state before sync
    try {
      const { store } = await import('../../store');
      const stateBefore = store.getState();

      addLog('📊 Redux state before sync:');
      addLog(`   Leads: ${stateBefore.leads?.items?.length || 0} items`);
      addLog(
        `   Customers: ${stateBefore.customers?.items?.length || 0} items`
      );
      addLog(
        `   Last sync: ${
          stateBefore.leads?.lastSync
            ? new Date(stateBefore.leads.lastSync).toLocaleTimeString()
            : 'Never'
        }`
      );
    } catch (error) {
      addLog(`❌ Error checking Redux state before: ${error.message}`);
    }

    // Run sync
    addLog('🚀 Starting sync with Redux hydration...');
    const syncManager = getSyncManager();
    const result = await syncManager.manualSync('manual');

    addLog(`✅ Sync result: ${JSON.stringify(result, null, 2)}`);

    // Check Redux state after sync
    try {
      const { store } = await import('../../store');
      const stateAfter = store.getState();

      addLog('📊 Redux state after sync:');
      addLog(`   Leads: ${stateAfter.leads?.items?.length || 0} items`);
      addLog(`   Customers: ${stateAfter.customers?.items?.length || 0} items`);
      addLog(
        `   Leads last sync: ${
          stateAfter.leads?.lastSync
            ? new Date(stateAfter.leads.lastSync).toLocaleTimeString()
            : 'Never'
        }`
      );
      addLog(
        `   Customers last sync: ${
          stateAfter.customers?.lastSync
            ? new Date(stateAfter.customers.lastSync).toLocaleTimeString()
            : 'Never'
        }`
      );

      // Verify data integrity - check if first lead has expected structure
      if (stateAfter.leads?.items?.length > 0) {
        const firstLead = stateAfter.leads.items[0];
        addLog('🔍 Sample lead data:');
        addLog(`   ID: ${firstLead.id}`);
        addLog(`   Status: ${firstLead.status}`);
        addLog(`   Priority: ${firstLead.priority}`);
        addLog(`   Sync Status: ${firstLead.sync_status}`);
      }

      if (stateAfter.customers?.items?.length > 0) {
        const firstCustomer = stateAfter.customers.items[0];
        addLog('🔍 Sample customer data:');
        addLog(`   ID: ${firstCustomer.id}`);
        addLog(`   Name: ${firstCustomer.name}`);
        addLog(`   Phone: ${firstCustomer.phone}`);
        addLog(`   KYC Status: ${firstCustomer.kyc_status}`);
      }
    } catch (error) {
      addLog(`❌ Error checking Redux state after: ${error.message}`);
    }

    setIsRunning(false);
  };

  const testConcurrencyGuard = async () => {
    addLog('=== Testing Concurrency Guard ===');
    setIsRunning(true);

    await setMockToken('valid_token');
    const syncManager = getSyncManager();

    addLog('🚀 Starting first sync...');
    const promise1 = syncManager.manualSync('manual');

    addLog('🚀 Starting second sync immediately...');
    const promise2 = syncManager.manualSync('timer');

    addLog('🚀 Starting third sync immediately...');
    const promise3 = syncManager.manualSync('manual');

    addLog('⏳ Waiting for all promises...');
    const [result1, result2, result3] = await Promise.all([
      promise1,
      promise2,
      promise3,
    ]);

    const samePromise12 = promise1 === promise2;
    const samePromise13 = promise1 === promise3;
    const sameResult12 = result1 === result2;
    const sameResult13 = result1 === result3;

    addLog('✅ Concurrency test results:');
    addLog(`   Same promise (1&2): ${samePromise12 ? 'PASS' : 'FAIL'}`);
    addLog(`   Same promise (1&3): ${samePromise13 ? 'PASS' : 'FAIL'}`);
    addLog(`   Same result (1&2): ${sameResult12 ? 'PASS' : 'FAIL'}`);
    addLog(`   Same result (1&3): ${sameResult13 ? 'PASS' : 'FAIL'}`);
    addLog(`   Result: ${JSON.stringify(result1, null, 2)}`);

    setIsRunning(false);
  };

  const testOfflineHandling = async () => {
    addLog('=== Testing Offline Handling ===');
    addLog('📱 Note: This test checks current network status');

    const syncManager = getSyncManager();

    // Get current network status
    const NetInfo = require('@react-native-community/netinfo');
    const networkState = await NetInfo.fetch();

    addLog('📶 Current network status:');
    addLog(`   Connected: ${networkState.isConnected}`);
    addLog(`   Internet: ${networkState.isInternetReachable}`);
    addLog(`   Type: ${networkState.type}`);

    addLog('🚀 Attempting sync with current network status...');
    const result = await syncManager.manualSync('manual');

    addLog(`✅ Sync result: ${JSON.stringify(result, null, 2)}`);

    if (result.success) {
      addLog('✅ ONLINE: Sync succeeded');
    } else if (result.error === 'OFFLINE') {
      addLog('📴 OFFLINE: Sync correctly failed due to network');
    } else {
      addLog(`❌ OTHER ERROR: ${result.error}`);
    }
  };

  const testSyncStatus = () => {
    addLog('=== Testing Sync Status API ===');

    const syncManager = getSyncManager();
    const status = syncManager.getSyncStatus();

    addLog('📊 Current sync status:');
    addLog(`   Is Running: ${status.isRunning}`);
    addLog(`   Has Promise: ${status.hasActivePromise}`);
    addLog(`   Listeners: ${status.listenerCount}`);
    addLog(`   Instance ID: ${status.debugInfo.instanceId}`);
    addLog(`   Uptime: ${Math.round(status.debugInfo.uptime / 1000)}s`);

    // Test during sync
    addLog('🚀 Starting sync to test status during operation...');
    syncManager.manualSync('manual').then(() => {
      const statusAfter = syncManager.getSyncStatus();
      addLog('📊 Status after sync completion:');
      addLog(`   Is Running: ${statusAfter.isRunning}`);
      addLog(`   Has Promise: ${statusAfter.hasActivePromise}`);
    });

    // Check status immediately during sync
    setTimeout(() => {
      const statusDuring = syncManager.getSyncStatus();
      addLog('📊 Status during sync:');
      addLog(`   Is Running: ${statusDuring.isRunning}`);
      addLog(`   Has Promise: ${statusDuring.hasActivePromise}`);
    }, 100);
  };

  const testCancelSync = async () => {
    addLog('=== Testing Sync Cancellation ===');

    const syncManager = getSyncManager();

    addLog('🚀 Starting sync...');
    const syncPromise = syncManager.manualSync('manual');

    // Try to cancel immediately
    setTimeout(() => {
      addLog('❌ Attempting to cancel sync...');
      const cancelled = syncManager.cancelSync();
      addLog(
        `   Cancel result: ${cancelled ? 'SUCCESS' : 'NO SYNC TO CANCEL'}`
      );
    }, 500);

    const result = await syncPromise;
    addLog(`✅ Final result: ${JSON.stringify(result, null, 2)}`);
  };

  // Update the test functions to accept parameters
  const testDocumentDao = async () => {
    console.log('🧪 Starting Document DAO test...');

    if (!db) {
      console.error('❌ Database not available');
      return;
    }

    try {
      const documentDao = new DocumentDao(db);

      // Test create
      const testDoc = await documentDao.create({
        id: 'TEST-DOC-' + Date.now(),
        leadId: 'TEST-LEAD-1',
        docType: 'TEST',
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'TEST-USER',
      });

      console.log('✅ Created:', testDoc);

      // Test find by lead
      const docs = await documentDao.findByLeadId('TEST-LEAD-1');
      console.log('✅ Found docs:', docs);

      // Test count
      const count = await documentDao.getCountByLeadId('TEST-LEAD-1');
      console.log('✅ Count:', count);

      console.log('✅ Document DAO test completed successfully');
    } catch (error) {
      console.error('❌ Document DAO test failed:', error);
    }
  };

  const forceMigration = async () => {
    console.log('🔄 Forcing database migration...');

    if (!db) {
      console.error('❌ Database not available');
      return;
    }

    // Helper to promisify SQLite operations
    const executeSql = (query: string, params: any[] = []): Promise<any> => {
      return new Promise((resolve, reject) => {
        db.executeSql(
          query,
          params,
          (result) => {
            console.log(`✅ SQL Success: ${query.substring(0, 30)}...`);
            resolve(result);
          },
          (error) => {
            console.error(`❌ SQL Error: ${query.substring(0, 30)}...`, error);
            reject(error);
          }
        );
      });
    };

    try {
      // Check current version
      const versionResult = await executeSql('PRAGMA user_version;');
      const currentVersion = versionResult.rows.item(0).user_version;
      console.log('📊 Current DB version:', currentVersion);

      // Force run v3 migration
      await migrateTo3_addDocumentsTable(db);

      // Update version
      await executeSql('PRAGMA user_version = 3;');

      console.log('✅ Migration forced successfully');
    } catch (error) {
      console.error('❌ Force migration failed:', error);
    }
  };

  const testDocumentSync = async () => {
    console.log('🧪 Starting Document Sync test...');

    if (!db || !authToken) {
      console.error('❌ Database or auth token not available');
      return;
    }

    try {
      const syncService = new DocumentSyncService(db, authToken);

      const result = await syncService.syncDocumentsByLead('LEAD-1014');
      console.log('✅ Sync result:', result);

      const cachedCount = await syncService.getCachedDocumentCount('LEAD-1014');
      console.log('✅ Cached count:', cachedCount);

      const cachedDocs = await syncService.getCachedDocuments('LEAD-1014');
      console.log('✅ Cached documents:', cachedDocs);

      console.log('✅ Document Sync test completed successfully');
    } catch (error) {
      console.error('❌ Document Sync test failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Backend Fetch Layer Test</Text>
      <AppButton
        title="Test Document DAO"
        onPress={testDocumentDao}
        // style={styles.testButton}
        mode="outlined"
      />

      <AppButton
        title="Test Document Sync"
        onPress={testDocumentSync}
        // style={styles.testButton}
        mode="outlined"
      />
      <AppButton
        title="Force DB Migration"
        onPress={forceMigration}
        // style={styles.testButton}
        mode="outlined"
      />
      <View style={styles.tokenSection}>
        <Text style={styles.sectionTitle}>Test Token:</Text>
        <TextInput
          style={styles.tokenInput}
          value={testToken}
          onChangeText={setTestToken}
          placeholder="Enter test token"
        />
        <TouchableOpacity
          style={styles.button}
          onPress={() => setMockToken(testToken)}
        >
          <Text style={styles.buttonText}>Set Token</Text>
        </TouchableOpacity>
      </View>
      <ReduxStateMonitor
        onStateChange={(state) => {
          console.log('Redux state changed during test:', state);
        }}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, isRunning && styles.buttonDisabled]}
          onPress={testSuccessfulSync}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>Test Success</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.errorButton]}
          onPress={testAuthFailure}
        >
          <Text style={styles.buttonText}>Test 401</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testRetryLogic}>
          <Text style={styles.buttonText}>Test Retry</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testNetworkTimeout}>
          <Text style={styles.buttonText}>Test Timeout</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.persistButton,
            isRunning && styles.buttonDisabled,
          ]}
          onPress={testCachePersistence}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>Test Cache</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.reduxButton,
            isRunning && styles.buttonDisabled,
          ]}
          onPress={testReduxHydration}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>Test Redux</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearLogs}
        >
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.concurrencyButton]}
          onPress={testConcurrencyGuard}
        >
          <Text style={styles.buttonText}>Test Concurrency</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.offlineButton]}
          onPress={testOfflineHandling}
        >
          <Text style={styles.buttonText}>Test Offline</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.statusButton]}
          onPress={testSyncStatus}
        >
          <Text style={styles.buttonText}>Test Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={testCancelSync}
        >
          <Text style={styles.buttonText}>Test Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.logContainer}>
        <Text style={styles.logTitle}>Test Logs:</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>
            {log}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  tokenSection: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  tokenInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  buttonContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    margin: 5,
    minWidth: '45%',
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#ccc' },
  errorButton: { backgroundColor: '#FF9500' },
  clearButton: { backgroundColor: '#FF3B30' },
  buttonText: { color: 'white', fontWeight: '600' },
  logContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 10,
  },
  logTitle: { color: '#00FF00', fontWeight: 'bold', marginBottom: 10 },
  logText: {
    color: '#00FF00',
    fontFamily: 'monospace',
    fontSize: 11,
    marginBottom: 2,
  },
  persistButton: { backgroundColor: '#34C759' },
  reduxButton: { backgroundColor: '#5856D6' },
  concurrencyButton: { backgroundColor: '#FF6B35' },
  offlineButton: { backgroundColor: '#8E8E93' },
  statusButton: { backgroundColor: '#30D158' },
  cancelButton: { backgroundColor: '#FF453A' },
});
