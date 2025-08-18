import { Logger, debug, info, warn, error } from '../../src/utils/Logger';

// Mock console methods
const mockConsole = {
  debug: jest.fn(),
  info: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

global.console = mockConsole as any;

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton
    (Logger as any).instance = null;
    logger = Logger.getInstance();
  });

  afterEach(() => {
    logger.cleanup();
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('log levels', () => {
    it('should respect log level filtering', () => {
      logger.setLogLevel('warn');

      logger.debug('Test', 'Debug message');
      logger.info('Test', 'Info message');
      logger.warn('Test', 'Warning message');
      logger.error('Test', 'Error message');

      // Only warn and error should be logged
      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should log all levels when set to debug', () => {
      logger.setLogLevel('debug');

      logger.debug('Test', 'Debug message');
      logger.info('Test', 'Info message');
      logger.warn('Test', 'Warning message');
      logger.error('Test', 'Error message');

      expect(mockConsole.debug).toHaveBeenCalled();
      expect(mockConsole.info).toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('log formatting', () => {
    it('should format log messages correctly', () => {
      logger.info('TestCategory', 'Test message', { key: 'value' });

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(
          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[INFO\] \[TestCategory\] Test message/
        ),
        { data: { key: 'value' } }
      );
    });

    it('should handle error objects', () => {
      const testError = new Error('Test error');
      logger.error('TestCategory', 'Error occurred', testError);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringMatching(/\[ERROR\] \[TestCategory\] Error occurred/),
        { error: testError }
      );
    });

    it('should handle messages without additional data', () => {
      logger.info('TestCategory', 'Simple message');

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(/\[INFO\] \[TestCategory\] Simple message/)
      );
    });
  });

  describe('log history', () => {
    it('should maintain log history', () => {
      logger.info('Test', 'Message 1');
      logger.warn('Test', 'Message 2');
      logger.error('Test', 'Message 3');

      const recentLogs = logger.getRecentLogs();
      expect(recentLogs).toHaveLength(3);
      expect(recentLogs[0].message).toBe('Message 1');
      expect(recentLogs[1].message).toBe('Message 2');
      expect(recentLogs[2].message).toBe('Message 3');
    });

    it('should filter logs by level', () => {
      logger.info('Test', 'Info message');
      logger.warn('Test', 'Warning message');
      logger.error('Test', 'Error message');

      const errorLogs = logger.getLogsByLevel('error');
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].message).toBe('Error message');
    });

    it('should filter logs by category', () => {
      logger.info('Category1', 'Message 1');
      logger.info('Category2', 'Message 2');
      logger.info('Category1', 'Message 3');

      const category1Logs = logger.getLogsByCategory('Category1');
      expect(category1Logs).toHaveLength(2);
      expect(category1Logs[0].message).toBe('Message 1');
      expect(category1Logs[1].message).toBe('Message 3');
    });
  });

  describe('log export', () => {
    it('should export logs as text', () => {
      logger.info('Test', 'Info message', { key: 'value' });
      logger.error('Test', 'Error message', new Error('Test error'));

      const exportedLogs = logger.exportLogs();

      expect(exportedLogs).toContain('[INFO] [Test] Info message');
      expect(exportedLogs).toContain('Data: {\n  "key": "value"\n}');
      expect(exportedLogs).toContain('[ERROR] [Test] Error message');
      expect(exportedLogs).toContain('Error: Test error');
    });
  });

  describe('convenience functions', () => {
    it('should work with convenience functions', () => {
      debug('Test', 'Debug message');
      info('Test', 'Info message');
      warn('Test', 'Warning message');
      error('Test', 'Error message', new Error('Test error'));

      // All should call the logger instance
      expect(mockConsole.debug).toHaveBeenCalled();
      expect(mockConsole.info).toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('memory management', () => {
    it('should trim log history to prevent memory growth', () => {
      // Set a small max history for testing
      (logger as any).maxLogHistory = 3;

      // Add more logs than the limit
      logger.info('Test', 'Message 1');
      logger.info('Test', 'Message 2');
      logger.info('Test', 'Message 3');
      logger.info('Test', 'Message 4');
      logger.info('Test', 'Message 5');

      const recentLogs = logger.getRecentLogs();
      expect(recentLogs).toHaveLength(3);
      expect(recentLogs[0].message).toBe('Message 3');
      expect(recentLogs[2].message).toBe('Message 5');
    });
  });

  describe('cleanup', () => {
    it('should clear logs on cleanup', () => {
      logger.info('Test', 'Message');

      logger.clearLogs();

      const logs = logger.getRecentLogs();
      expect(logs).toHaveLength(0);
    });
  });
});
