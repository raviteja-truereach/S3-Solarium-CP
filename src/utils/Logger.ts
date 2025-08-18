/**
 * Custom Logger for Solarium CP App
 * Provides structured logging with different levels
 * Preserves important logs in production while removing debug logs
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  leadId?: string;
  metadata?: Record<string, any>;
}

export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, error?: Error, context?: LogContext) => void;
}

/**
 * Environment detection
 */
const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';
const isProduction = !__DEV__ && process.env.NODE_ENV === 'production';

/**
 * Format log message with context
 */
function formatLogMessage(
  level: LogLevel,
  tag: string,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] [${tag}] ${message}${contextStr}`;
}

/**
 * Create logger instance for a specific component/module
 * @param tag - Component or module name for log identification
 * @returns Logger instance with tagged logging methods
 */
export function createLogger(tag: string): Logger {
  return {
    /**
     * Debug level logging - removed in production
     * Use for detailed debugging information
     */
    debug: (message: string, context?: LogContext) => {
      if (isDevelopment) {
        console.log(formatLogMessage('debug', tag, message, context));
      }
      // In production, these are removed by babel plugin
    },

    /**
     * Info level logging - removed in production
     * Use for general application flow information
     */
    info: (message: string, context?: LogContext) => {
      if (isDevelopment) {
        console.info(formatLogMessage('info', tag, message, context));
      }
      // In production, these are removed by babel plugin
    },

    /**
     * Warning level logging - preserved in production
     * Use for concerning situations that don't break functionality
     */
    warn: (message: string, context?: LogContext) => {
      console.warn(formatLogMessage('warn', tag, message, context));

      // In production, could be sent to crash reporting service
      if (isProduction) {
        // TODO: Send to crash reporting service when implemented
        // crashlytics.log(`WARN: ${tag} - ${message}`);
      }
    },

    /**
     * Error level logging - preserved in production
     * Use for errors and exceptions that need investigation
     */
    error: (message: string, error?: Error, context?: LogContext) => {
      const errorContext = {
        ...context,
        stack: error?.stack,
        errorMessage: error?.message,
      };

      console.error(formatLogMessage('error', tag, message, errorContext));

      // In production, should be sent to crash reporting service
      if (isProduction) {
        // TODO: Send to crash reporting service when implemented
        // crashlytics.recordError(error || new Error(message));
        // crashlytics.log(`ERROR: ${tag} - ${message}`);
      }
    },
  };
}

/**
 * Global app logger for general application logs
 */
export const AppLogger = createLogger('APP');

/**
 * Performance logger for performance-related logs
 */
export const PerformanceLogger = createLogger('PERFORMANCE');

/**
 * Network logger for API and network-related logs
 */
export const NetworkLogger = createLogger('NETWORK');

/**
 * Auth logger for authentication-related logs
 */
export const AuthLogger = createLogger('AUTH');

/**
 * Security logger for security-related events
 */
export const SecurityLogger = createLogger('SECURITY');

/**
 * Logger factory for creating component-specific loggers
 * @param componentName - Name of the component
 * @returns Logger instance for the component
 */
export const createComponentLogger = (componentName: string): Logger => {
  return createLogger(`COMPONENT:${componentName}`);
};

/**
 * Logger factory for creating service-specific loggers
 * @param serviceName - Name of the service
 * @returns Logger instance for the service
 */
export const createServiceLogger = (serviceName: string): Logger => {
  return createLogger(`SERVICE:${serviceName}`);
};

/**
 * Utility function to measure and log performance
 * @param tag - Performance measurement tag
 * @param operation - Function to measure
 * @returns Promise with the operation result
 */
export async function measurePerformance<T>(
  tag: string,
  operation: () => Promise<T> | T
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    PerformanceLogger.info(`${tag} completed`, {
      duration: `${duration}ms`,
      success: true,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    PerformanceLogger.error(`${tag} failed`, error as Error, {
      duration: `${duration}ms`,
      success: false,
    });

    throw error;
  }
}

export default {
  createLogger,
  AppLogger,
  PerformanceLogger,
  NetworkLogger,
  AuthLogger,
  SecurityLogger,
  createComponentLogger,
  createServiceLogger,
  measurePerformance,
};
