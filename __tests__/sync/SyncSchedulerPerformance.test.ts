import { SyncScheduler } from '../../src/sync/SyncScheduler';
import { MAX_SYNC_MEMORY_MB } from '../../src/constants/sync';

describe('SyncScheduler Performance', () => {
  let scheduler: SyncScheduler;
  let initialMemory: number;

  beforeEach(() => {
    if (global.gc) {
      global.gc();
    }
    initialMemory = process.memoryUsage().heapUsed;
    scheduler = new SyncScheduler();
  });

  afterEach(() => {
    scheduler.destroy();
  });

  it('should not exceed memory limit during sync operations', async () => {
    scheduler.start();

    // Trigger multiple sync operations
    await Promise.all([
      scheduler.triggerManualSync(),
      scheduler.triggerManualSync(),
      scheduler.triggerManualSync(),
    ]);

    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncreaseMB = (finalMemory - initialMemory) / 1024 / 1024;

    expect(memoryIncreaseMB).toBeLessThan(MAX_SYNC_MEMORY_MB);
  });

  it('should clean up resources properly', () => {
    scheduler.start();
    const status = scheduler.getStatus();

    expect(status.isScheduled).toBe(true);

    scheduler.destroy();

    // Verify cleanup
    const finalStatus = scheduler.getStatus();
    expect(finalStatus.isScheduled).toBe(false);
  });
});
