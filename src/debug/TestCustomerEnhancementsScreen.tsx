import React from 'react';
import { View, Text, Button, ScrollView, Alert } from 'react-native';
import { useDatabase } from '../database/DatabaseProvider';
import { CustomerDao } from '../database/dao/CustomerDao';
import { DocumentDao } from '../database/dao/DocumentDao';
import { useSelector } from 'react-redux';
import { RootState } from '@store/store';

export const TestCustomerEnhancementsScreen: React.FC = () => {
  const { db, isReady } = useDatabase();
  const authToken = useSelector((state: RootState) => state.auth?.token);

  const testCustomerSearch = async () => {
    if (!db) return Alert.alert('Error', 'Database not ready');

    try {
      const customerDao = new CustomerDao(db);

      // Test searchWithFilters
      const results = await customerDao.searchWithFilters('john', {
        kycStatus: 'pending',
        city: 'Mumbai',
      });

      Alert.alert('Search Results', `Found ${results.length} customers`);
      console.log('✅ Customer search results:', results);
    } catch (error) {
      Alert.alert('Error', `Test failed: ${error}`);
      console.error('❌ Customer search test failed:', error);
    }
  };

  const testFilterOptions = async () => {
    if (!db) return Alert.alert('Error', 'Database not ready');

    try {
      const customerDao = new CustomerDao(db);
      const options = await customerDao.getFilterOptions();

      Alert.alert(
        'Filter Options',
        `Cities: ${options.cities.length}\nStates: ${options.states.length}\nKYC: ${options.kycStatuses.length}`
      );
      console.log('✅ Filter options:', options);
    } catch (error) {
      Alert.alert('Error', `Test failed: ${error}`);
      console.error('❌ Filter options test failed:', error);
    }
  };

  const testKycDocuments = async () => {
    if (!db) return Alert.alert('Error', 'Database not ready');

    try {
      const documentDao = new DocumentDao(db);

      // Test with a sample customer ID
      const kycDocs = await documentDao.findByCustomerId('CUST-005');
      const kycStatus = await documentDao.getKycStatusByCustomerId('CUST-005');

      Alert.alert(
        'KYC Documents',
        `Documents: ${kycDocs.length}\nStatus: ${kycStatus.overallStatus}`
      );
      console.log('✅ KYC documents:', kycDocs);
      console.log('✅ KYC status:', kycStatus);
    } catch (error) {
      Alert.alert('Error', `Test failed: ${error}`);
      console.error('❌ KYC documents test failed:', error);
    }
  };

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Database not ready...</Text>
      </View>
    );
  }

  const forceMigration = async () => {
    if (!db) return Alert.alert('Error', 'Database not ready');

    try {
      // Import migration functions
      const {
        runMigrations,
        getCurrentSchemaVersion,
      } = require('../database/migrations');

      console.log(
        '🔄 Current schema version:',
        await getCurrentSchemaVersion(db)
      );

      // Force run migrations
      await runMigrations(db);

      console.log('✅ Migrations completed');
      Alert.alert('Success', 'Migration completed! Try other tests now.');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      Alert.alert('Error', `Migration failed: ${error}`);
    }
  };

  const testFullSync = async () => {
    if (!db) return Alert.alert('Error', 'Database not ready');

    try {
      // Import and run the enhanced sync
      const { SyncManager } = require('../sync/SyncManager');
      //   const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJDUC0wMDEiLCJlbWFpbCI6ImNwMUBzb2xhcml1bS5jb20iLCJwaG9uZSI6Ijk4NzY1NDMyMTMiLCJyb2xlIjoiQ1AiLCJuYW1lIjoiQ2hhbm5lbCBQYXJ0bmVyIDEiLCJpYXQiOjE3NTQwMzAyNDQsImV4cCI6MTc1NDExNjY0NH0._Pm6MtLIbP1AuL7YfXsvph5VoGavZvcxkz8cEleHUm8'; // Get from Redux state

      const syncManager = new SyncManager(db, authToken);

      console.log('🔄 Starting full sync with customers...');
      const result = await syncManager.performSync();

      Alert.alert(
        'Sync Complete',
        `Customers: ${result.recordCounts.customers}\nDocuments: ${result.recordCounts.documents}\nLeads: ${result.recordCounts.leads}`
      );
      console.log('✅ Full sync result:', result);
    } catch (error) {
      Alert.alert('Error', `Sync failed: ${error}`);
      console.error('❌ Full sync failed:', error);
    }
  };

  const checkDocumentsSchema = async () => {
    if (!db) return Alert.alert('Error', 'Database not ready');

    try {
      // ✅ FIX: Use callback-based SQLite instead of destructuring
      const documentsResult = await new Promise((resolve, reject) => {
        db.executeSql(
          'PRAGMA table_info(documents);',
          [],
          (result) => resolve(result),
          (error) => reject(error)
        );
      });

      const documentColumns = [];
      for (let i = 0; i < documentsResult.rows.length; i++) {
        const col = documentsResult.rows.item(i);
        documentColumns.push({
          name: col.name,
          type: col.type,
          notNull: col.notnull,
          defaultValue: col.dflt_value,
        });
      }

      console.log('📊 Documents table schema:', documentColumns);

      // Check schema version
      const versionResult = await new Promise((resolve, reject) => {
        db.executeSql(
          'PRAGMA user_version;',
          [],
          (result) => resolve(result),
          (error) => reject(error)
        );
      });
      const version = versionResult.rows.item(0).user_version;

      Alert.alert(
        'Documents Schema',
        `Schema Version: ${version}\n\nColumns:\n${documentColumns
          .map(
            (col) => `${col.name}: ${col.type}${col.notNull ? ' NOT NULL' : ''}`
          )
          .join('\n')}`
      );
    } catch (error) {
      Alert.alert('Error', `Schema check failed: ${error}`);
      console.error('❌ Schema check failed:', error);
    }
  };

  const checkQuotationsSchema = async () => {
    if (!db) return Alert.alert('Error', 'Database not ready');

    try {
      const quotationsResult = await new Promise((resolve, reject) => {
        db.executeSql(
          'PRAGMA table_info(quotations);',
          [],
          (result) => resolve(result),
          (error) => reject(error)
        );
      });

      const quotationColumns = [];
      for (let i = 0; i < quotationsResult.rows.length; i++) {
        const col = quotationsResult.rows.item(i);
        quotationColumns.push({
          name: col.name,
          type: col.type,
          notNull: col.notnull,
          defaultValue: col.dflt_value,
        });
      }

      console.log('📊 Quotations table schema:', quotationColumns);

      Alert.alert(
        'Quotations Schema',
        `Columns:\n${quotationColumns
          .map(
            (col) => `${col.name}: ${col.type}${col.notNull ? ' NOT NULL' : ''}`
          )
          .join('\n')}`
      );
    } catch (error) {
      Alert.alert('Error', `Quotations schema check failed: ${error}`);
      console.error('❌ Quotations schema check failed:', error);
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
        Customer Enhancements Test
      </Text>
      <View style={{ marginBottom: 15, backgroundColor: '#ffebee' }}>
        <Button
          title="🔧 Force Run Migration v4"
          onPress={forceMigration}
          color="#d32f2f"
        />
      </View>
      <View style={{ marginBottom: 15, backgroundColor: '#fff3e0' }}>
        <Button
          title="🔍 Check Quotations Schema"
          onPress={checkQuotationsSchema}
          color="#f57c00"
        />
      </View>
      <View style={{ marginBottom: 15, backgroundColor: '#fff3e0' }}>
        <Button
          title="🔍 Check Documents Schema"
          onPress={checkDocumentsSchema}
          color="#f57c00"
        />
      </View>
      <View style={{ marginBottom: 15 }}>
        <Button
          title="🔄 Test Full Sync (Customers + Documents + Leads)"
          onPress={testFullSync}
        />
      </View>
      <View style={{ marginBottom: 15 }}>
        <Button
          title="Test Customer Search with Filters"
          onPress={testCustomerSearch}
        />
      </View>

      <View style={{ marginBottom: 15 }}>
        <Button title="Test Filter Options" onPress={testFilterOptions} />
      </View>

      <View style={{ marginBottom: 15 }}>
        <Button title="Test KYC Documents" onPress={testKycDocuments} />
      </View>

      <Text style={{ marginTop: 20, fontSize: 14, color: 'gray' }}>
        Check console logs for detailed results
      </Text>
    </ScrollView>
  );
};
