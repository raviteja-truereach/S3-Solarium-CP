import {
  formatRelativeTime,
  formatDateTime,
  isToday,
  getTimeUntilNextSync,
} from '../../src/utils/date';

describe('Date Utilities', () => {
  beforeEach(() => {
    // Mock current time to a fixed date for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('formatRelativeTime', () => {
    it('should return "–" for null/undefined input', () => {
      expect(formatRelativeTime(null)).toBe('–');
      expect(formatRelativeTime(undefined)).toBe('–');
      expect(formatRelativeTime('')).toBe('–');
    });

    it('should return "just now" for very recent times', () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe('just now');

      const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
      expect(formatRelativeTime(fiveSecondsAgo)).toBe('just now');
    });

    it('should format seconds correctly', () => {
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      expect(formatRelativeTime(thirtySecondsAgo)).toBe('30s ago');
    });

    it('should format minutes correctly', () => {
      const twoMinutesAgo = new Date(Date.now() - 120000).toISOString();
      expect(formatRelativeTime(twoMinutesAgo)).toBe('2 min ago');

      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      expect(formatRelativeTime(oneMinuteAgo)).toBe('1 min ago');
    });

    it('should format hours correctly', () => {
      const twoHoursAgo = new Date(Date.now() - 7200000).toISOString();
      expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');

      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
    });

    it('should format days correctly', () => {
      const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();
      expect(formatRelativeTime(twoDaysAgo)).toBe('2 days ago');
    });

    it('should show date for times older than 7 days', () => {
      const eightDaysAgo = new Date(
        Date.now() - 8 * 24 * 60 * 60 * 1000
      ).toISOString();
      const result = formatRelativeTime(eightDaysAgo);
      expect(result).toMatch(/Jan \d+, \d+:\d+/);
    });
  });

  describe('isToday', () => {
    it("should return true for today's date", () => {
      const now = new Date().toISOString();
      expect(isToday(now)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isToday(null)).toBe(false);
      expect(isToday(undefined)).toBe(false);
    });
  });

  describe('getTimeUntilNextSync', () => {
    it('should return 0 when sync is allowed', () => {
      const oldSync = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
      expect(getTimeUntilNextSync(oldSync, 30000)).toBe(0);
    });

    it('should return remaining seconds when sync is not allowed', () => {
      const recentSync = new Date(Date.now() - 10000).toISOString(); // 10 seconds ago
      expect(getTimeUntilNextSync(recentSync, 30000)).toBe(20);
    });
  });
});
