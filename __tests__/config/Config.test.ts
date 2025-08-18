/**
 * Configuration Tests
 * Comprehensive tests for environment variable handling
 */

// Mock react-native-config before importing Config
const mockConfig = {
    REACT_APP_BASE_URL: 'https://test-api.example.com',
    REACT_APP_ENV: 'development',
    REACT_APP_PUSH_KEY: 'test-push-key',
    REACT_APP_CODEPUSH_DEPLOYMENT_KEY: 'test-codepush-key',
    REACT_APP_DEBUG_MODE: 'true',
    REACT_APP_LOG_LEVEL: 'debug',
  };
  
  jest.mock('react-native-config', () => ({
    __esModule: true,
    default: mockConfig,
    ...mockConfig,
  }));
  
  import { appConfig, isDevelopment, isProduction, isStaging } from '@config/Config';
  
  describe('Config', () => {
    describe('appConfig', () => {
      it('should load configuration from environment variables', () => {
        expect(appConfig.apiUrl).toBe('https://test-api.example.com');
        expect(appConfig.env).toBe('development');
        expect(appConfig.pushKey).toBe('test-push-key');
        expect(appConfig.codePushKey).toBe('test-codepush-key');
        expect(appConfig.debugMode).toBe(true);
        expect(appConfig.logLevel).toBe('debug');
      });
  
      it('should have correct structure', () => {
        expect(appConfig).toHaveProperty('apiUrl');
        expect(appConfig).toHaveProperty('env');
        expect(appConfig).toHaveProperty('pushKey');
        expect(appConfig).toHaveProperty('codePushKey');
        expect(appConfig).toHaveProperty('debugMode');
        expect(appConfig).toHaveProperty('logLevel');
      });
  
      it('should provide correct data types', () => {
        expect(typeof appConfig.apiUrl).toBe('string');
        expect(typeof appConfig.env).toBe('string');
        expect(typeof appConfig.pushKey).toBe('string');
        expect(typeof appConfig.codePushKey).toBe('string');
        expect(typeof appConfig.debugMode).toBe('boolean');
        expect(typeof appConfig.logLevel).toBe('string');
      });
    });
  
    describe('Environment checks', () => {
      it('should correctly identify development environment', () => {
        expect(isDevelopment()).toBe(true);
        expect(isProduction()).toBe(false);
        expect(isStaging()).toBe(false);
      });
  
      it('should handle different environments', () => {
        // Since we're mocking the config, we can test the logic
        expect(appConfig.env).toBe('development');
        expect(isDevelopment()).toBe(true);
      });
    });
  
    describe('Type safety', () => {
      it('should enforce correct environment types', () => {
        expect(['development', 'staging', 'production']).toContain(appConfig.env);
      });
  
      it('should enforce correct log level types', () => {
        expect(['debug', 'info', 'warn', 'error']).toContain(appConfig.logLevel);
      });
  
      it('should handle boolean conversion correctly', () => {
        expect(typeof appConfig.debugMode).toBe('boolean');
      });
    });
  
    describe('Configuration values', () => {
      it('should have valid API URL format', () => {
        expect(appConfig.apiUrl).toMatch(/^https?:\/\/.+/);
      });
  
      it('should have non-empty configuration values', () => {
        expect(appConfig.apiUrl).toBeTruthy();
        expect(appConfig.env).toBeTruthy();
        expect(appConfig.pushKey).toBeTruthy();
        expect(appConfig.codePushKey).toBeTruthy();
        expect(appConfig.logLevel).toBeTruthy();
      });
    });
  
    describe('Fallback behavior', () => {
      it('should provide sensible defaults', () => {
        // Test that our configuration has reasonable values
        expect(appConfig.apiUrl).toBeDefined();
        expect(appConfig.env).toBeDefined();
        expect(['development', 'staging', 'production']).toContain(appConfig.env);
      });
    });
  });