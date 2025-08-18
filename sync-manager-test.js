const { SyncManager } = require('./lib/commonjs/sync/SyncManager.js');

async function testSyncManager() {
  console.log('=== Testing SyncManager ===');

  // Test 1: Singleton pattern
  const instance1 = SyncManager.getInstance();
  const instance2 = SyncManager.getInstance();
  console.log('✓ Singleton test:', instance1 === instance2 ? 'PASS' : 'FAIL');

  // Test 2: Initial state
  console.log(
    '✓ Initial isRunning:',
    instance1.isSyncRunning() === false ? 'PASS' : 'FAIL'
  );

  // Test 3: Event listeners
  let syncStartedFired = false;
  let syncFinishedFired = false;

  instance1.onSyncEvent('syncStarted', (data) => {
    console.log('✓ syncStarted event:', data);
    syncStartedFired = true;
  });

  instance1.onSyncEvent('syncFinished', (data) => {
    console.log('✓ syncFinished event:', data);
    syncFinishedFired = true;
  });

  // Test 4: Manual sync
  console.log('=== Starting manual sync test ===');
  const result = await instance1.manualSync('manual');
  console.log('✓ Sync result:', result);
  console.log('✓ Events fired:', { syncStartedFired, syncFinishedFired });

  // Test 5: Concurrent sync prevention
  console.log('=== Testing concurrent sync prevention ===');
  const promise1 = instance1.manualSync('manual');
  const promise2 = instance1.manualSync('timer');

  const [result1, result2] = await Promise.all([promise1, promise2]);
  console.log('✓ Concurrent sync test:', result1 === result2 ? 'PASS' : 'FAIL');

  // Test 6: Debug status
  const debugStatus = instance1.getDebugStatus();
  console.log('✓ Debug status:', debugStatus);

  console.log('=== All tests completed ===');
}

testSyncManager().catch(console.error);
