import {
  SYNC_INTERVAL_MS,
  SYNC_GUARD_MS,
  SYNC_DRIFT_MS,
} from '../../src/constants/sync';

describe('sync constants', () => {
  it('should have correct sync interval (180 seconds)', () => {
    expect(SYNC_INTERVAL_MS).toBe(180_000);
    expect(SYNC_INTERVAL_MS / 1000).toBe(180); // 3 minutes
  });

  it('should have correct guard interval (30 seconds)', () => {
    expect(SYNC_GUARD_MS).toBe(30_000);
    expect(SYNC_GUARD_MS / 1000).toBe(30);
  });

  it('should have reasonable drift tolerance', () => {
    expect(SYNC_DRIFT_MS).toBe(10_000);
    expect(SYNC_DRIFT_MS / 1000).toBe(10);
    expect(SYNC_DRIFT_MS).toBeLessThan(SYNC_GUARD_MS); // Drift should be less than guard
  });

  it('should have intervals in correct proportion', () => {
    // Guard should be much smaller than sync interval
    expect(SYNC_GUARD_MS).toBeLessThan(SYNC_INTERVAL_MS / 2);

    // Drift should be smaller than guard
    expect(SYNC_DRIFT_MS).toBeLessThan(SYNC_GUARD_MS);
  });
});
