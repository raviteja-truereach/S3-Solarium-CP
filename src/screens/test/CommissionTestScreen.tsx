import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import { CommissionDao } from '../../database/dao/CommissionDao';
import type {
  Commission,
  CommissionKPIStats,
} from '../../database/models/Commission';
import { openDatabase } from '../../database/database';

export const CommissionTestScreen: React.FC = () => {
  const [results, setResults] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    console.log(message);
    setResults((prev) => prev + message + '\n');
  };

  const clearResults = () => {
    setResults('');
    console.clear();
  };

  // Test 1: DAO Instance Creation
  const testDaoInstance = async () => {
    try {
      setIsLoading(true);
      addResult('🧪 Testing DAO Instance Creation...');

      const db = await openDatabase();
      const dao = CommissionDao.getInstance(db);

      addResult('✅ CommissionDao instance created successfully');
      addResult(`✅ DAO type: ${typeof dao}`);

      // Test singleton behavior
      const dao2 = CommissionDao.getInstance(db);
      const isSingleton = dao === dao2;
      addResult(`✅ Singleton test: ${isSingleton ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      addResult(`❌ DAO Instance test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test 2: Insert Test Data
  const testInsertData = async () => {
    try {
      setIsLoading(true);
      addResult('🧪 Testing Data Insertion...');

      const db = await openDatabase();
      const dao = CommissionDao.getInstance(db);

      // Create test commissions
      const testCommissions: Commission[] = [
        {
          id: 'TEST-COMM-001',
          cp_id: 'CP-001',
          lead_id: 'LEAD-001',
          amount: 25000,
          status: 'approved',
          created_at: '2024-01-15T10:30:00.000Z',
          updated_at: new Date().toISOString(),
          sync_status: 'synced',
          local_changes: '{}',
        },
        {
          id: 'TEST-COMM-002',
          cp_id: 'CP-001',
          lead_id: 'LEAD-002',
          amount: 18000,
          status: 'pending',
          created_at: '2024-01-20T14:15:00.000Z',
          updated_at: new Date().toISOString(),
          sync_status: 'synced',
          local_changes: '{}',
        },
        {
          id: 'TEST-COMM-003',
          cp_id: 'CP-001',
          lead_id: 'LEAD-003',
          amount: 30000,
          status: 'paid',
          created_at: '2024-01-25T09:45:00.000Z',
          updated_at: new Date().toISOString(),
          sync_status: 'synced',
          local_changes: '{}',
        },
      ];

      await dao.upsertMany(testCommissions);
      addResult(`✅ Inserted ${testCommissions.length} test commissions`);

      // Verify insertion
      const count = await dao.getCount();
      addResult(`✅ Total commissions in DB: ${count}`);
    } catch (error) {
      addResult(`❌ Data insertion test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test 3: Query by Status
  const testQueryByStatus = async () => {
    try {
      setIsLoading(true);
      addResult('🧪 Testing Query by Status...');

      const db = await openDatabase();
      const dao = CommissionDao.getInstance(db);

      // Test different statuses
      const statuses = ['approved', 'pending', 'paid'];

      for (const status of statuses) {
        const commissions = await dao.findByStatus(status);
        addResult(
          `✅ Found ${commissions.length} commissions with status: ${status}`
        );

        if (commissions.length > 0) {
          addResult(
            `   📝 Example: ${commissions[0].id} - ₹${commissions[0].amount}`
          );
        }
      }
    } catch (error) {
      addResult(`❌ Query by status test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test 4: Date Range Query
  const testDateRangeQuery = async () => {
    try {
      setIsLoading(true);
      addResult('🧪 Testing Date Range Query...');

      const db = await openDatabase();
      const dao = CommissionDao.getInstance(db);

      const startDate = '2024-01-01T00:00:00.000Z';
      const endDate = '2024-01-31T23:59:59.999Z';

      const commissions = await dao.findByDateRange(startDate, endDate);
      addResult(`✅ Found ${commissions.length} commissions in January 2024`);

      if (commissions.length > 0) {
        const totalAmount = commissions.reduce((sum, c) => sum + c.amount, 0);
        addResult(`   💰 Total amount: ₹${totalAmount.toLocaleString()}`);
        addResult(`   📅 Date range: ${startDate} to ${endDate}`);
      }
    } catch (error) {
      addResult(`❌ Date range query test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test 5: KPI Stats
  const testKPIStats = async () => {
    try {
      setIsLoading(true);
      addResult('🧪 Testing KPI Stats...');

      const db = await openDatabase();
      const dao = CommissionDao.getInstance(db);

      // Test without filters
      const stats = await dao.getKPIStats();
      addResult('✅ KPI Stats (No Filters):');
      addResult(
        `   📊 Total Commission: ₹${stats.totalCommission.toLocaleString()}`
      );
      addResult(
        `   💵 Paid Commission: ₹${stats.paidCommission.toLocaleString()}`
      );
      addResult(
        `   ⏳ Pending Commission: ₹${stats.pendingCommission.toLocaleString()}`
      );
      addResult(
        `   ✅ Approved Commission: ₹${stats.approvedCommission.toLocaleString()}`
      );
      addResult(`   🔢 Total Count: ${stats.totalCount}`);

      // Test with filters
      const filteredStats = await dao.getKPIStats({
        status: 'pending',
        dateRange: {
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-12-31T23:59:59.999Z',
        },
      });
      addResult('✅ KPI Stats (Pending Only):');
      addResult(
        `   ⏳ Pending Commission: ₹${filteredStats.pendingCommission.toLocaleString()}`
      );
      addResult(`   🔢 Pending Count: ${filteredStats.pendingCount}`);
    } catch (error) {
      addResult(`❌ KPI stats test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test 6: Find by ID
  const testFindById = async () => {
    try {
      setIsLoading(true);
      addResult('🧪 Testing Find by ID...');

      const db = await openDatabase();
      const dao = CommissionDao.getInstance(db);

      // Test finding existing record
      const commission = await dao.findById('TEST-COMM-001');
      if (commission) {
        addResult('✅ Found commission by ID:');
        addResult(`   🆔 ID: ${commission.id}`);
        addResult(`   💰 Amount: ₹${commission.amount}`);
        addResult(`   📊 Status: ${commission.status}`);
      } else {
        addResult(
          '⚠️ Commission TEST-COMM-001 not found (may need to insert test data first)'
        );
      }

      // Test finding non-existent record
      const nonExistent = await dao.findById('NON-EXISTENT-ID');
      addResult(
        `✅ Non-existent ID test: ${nonExistent === null ? 'PASSED' : 'FAILED'}`
      );
    } catch (error) {
      addResult(`❌ Find by ID test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test 7: Performance Test
  const testPerformance = async () => {
    try {
      setIsLoading(true);
      addResult('🧪 Testing Performance...');

      const db = await openDatabase();
      const dao = CommissionDao.getInstance(db);

      const perfResults = await dao.performanceTest(50);
      addResult('✅ Performance Test Results:');
      addResult(`   ⏱️ Insert Time: ${perfResults.insertTime}ms`);
      addResult(`   ⏱️ Select Time: ${perfResults.selectTime}ms`);
      addResult(`   ⏱️ KPI Time: ${perfResults.kpiTime}ms`);
      addResult(
        `   📊 Avg Insert: ${perfResults.averageInsertTime.toFixed(
          2
        )}ms per record`
      );

      // Performance validation
      const insertOK = perfResults.insertTime < 2000; // 2 seconds for 50 records
      const selectOK = perfResults.selectTime < 100; // 100ms for select
      const kpiOK = perfResults.kpiTime < 50; // 50ms for KPI calculation

      addResult(
        `   ${insertOK ? '✅' : '❌'} Insert Performance: ${
          insertOK ? 'PASSED' : 'FAILED'
        }`
      );
      addResult(
        `   ${selectOK ? '✅' : '❌'} Select Performance: ${
          selectOK ? 'PASSED' : 'FAILED'
        }`
      );
      addResult(
        `   ${kpiOK ? '✅' : '❌'} KPI Performance: ${
          kpiOK ? 'PASSED' : 'FAILED'
        }`
      );
    } catch (error) {
      addResult(`❌ Performance test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test 8: Clean Up Test Data
  const cleanUpTestData = async () => {
    try {
      setIsLoading(true);
      addResult('🧪 Cleaning Up Test Data...');

      const db = await openDatabase();
      const dao = CommissionDao.getInstance(db);

      // Delete test records
      const deletedCount = await dao.clearAll();
      addResult(`✅ Cleaned up ${deletedCount} commission records`);

      const finalCount = await dao.getCount();
      addResult(`✅ Final count: ${finalCount} commissions remaining`);
    } catch (error) {
      addResult(`❌ Clean up failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Run All Tests
  const runAllTests = async () => {
    clearResults();
    addResult('🚀 Running All Commission DAO Tests...\n');

    await testDaoInstance();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await testInsertData();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await testQueryByStatus();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await testDateRangeQuery();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await testKPIStats();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await testFindById();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await testPerformance();

    addResult('\n🎉 All tests completed!');
    addResult('Note: Run "Clean Up" to remove test data when finished');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Commission DAO Manual Testing</Text>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={runAllTests}
          disabled={isLoading}
          style={styles.button}
        >
          🚀 Run All Tests
        </Button>

        <Button
          mode="outlined"
          onPress={testDaoInstance}
          disabled={isLoading}
          style={styles.button}
        >
          1️⃣ Test DAO Instance
        </Button>

        <Button
          mode="outlined"
          onPress={testInsertData}
          disabled={isLoading}
          style={styles.button}
        >
          2️⃣ Insert Test Data
        </Button>

        <Button
          mode="outlined"
          onPress={testQueryByStatus}
          disabled={isLoading}
          style={styles.button}
        >
          3️⃣ Query by Status
        </Button>

        <Button
          mode="outlined"
          onPress={testDateRangeQuery}
          disabled={isLoading}
          style={styles.button}
        >
          4️⃣ Date Range Query
        </Button>

        <Button
          mode="outlined"
          onPress={testKPIStats}
          disabled={isLoading}
          style={styles.button}
        >
          5️⃣ KPI Stats
        </Button>

        <Button
          mode="outlined"
          onPress={testFindById}
          disabled={isLoading}
          style={styles.button}
        >
          6️⃣ Find by ID
        </Button>

        <Button
          mode="outlined"
          onPress={testPerformance}
          disabled={isLoading}
          style={styles.button}
        >
          7️⃣ Performance Test
        </Button>

        <Button
          mode="outlined"
          onPress={cleanUpTestData}
          disabled={isLoading}
          style={[styles.button, styles.dangerButton]}
        >
          🗑️ Clean Up Test Data
        </Button>

        <Button
          mode="text"
          onPress={clearResults}
          disabled={isLoading}
          style={styles.button}
        >
          🧹 Clear Results
        </Button>
      </View>

      {isLoading && <Text style={styles.loadingText}>Running tests...</Text>}

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        <Text style={styles.resultsText}>{results}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#007AFF',
  },
  buttonContainer: {
    gap: 8,
    marginBottom: 20,
  },
  button: {
    marginVertical: 4,
  },
  dangerButton: {
    backgroundColor: '#ff4444',
  },
  loadingText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 10,
  },
  resultsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultsText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
  },
});

export default CommissionTestScreen;
