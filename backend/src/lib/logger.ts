import pino from 'pino';

// Define log levels
export enum LogLevel {
  FATAL = 'fatal',
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace',
}

// Define log context interface
export interface LogContext {
  component?: string;
  userId?: string;
  feedId?: string;
  articleId?: string;
  episodeId?: string;
  jobId?: string;
  jobType?: string;
  requestId?: string;
  [key: string]: unknown;
}

// Create base logger instance
const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Use pino-pretty in development for readable logs
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

/**
 * Structured logger with context support
 */
export class Logger {
  private logger: pino.Logger;
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
    this.logger = baseLogger.child(context);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    return new Logger({ ...this.context, ...context });
  }

  /**
   * Log info level message
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.logger.info(data || {}, message);
  }

  /**
   * Log error level message with stack trace
   */
  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const errorData = this.formatError(error);
    this.logger.error({ ...data, ...errorData }, message);
  }

  /**
   * Log warning level message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.logger.warn(data || {}, message);
  }

  /**
   * Log debug level message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.logger.debug(data || {}, message);
  }

  /**
   * Log fatal level message
   */
  fatal(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const errorData = this.formatError(error);
    this.logger.fatal({ ...data, ...errorData }, message);
  }

  /**
   * Format error object for logging
   */
  private formatError(error?: Error | unknown): Record<string, unknown> {
    if (!error) {
      return {};
    }

    if (error instanceof Error) {
      return {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      };
    }

    return {
      error: {
        message: String(error),
      },
    };
  }
}

// Export default logger instance
export const logger = new Logger();

// Export convenience functions
export const createLogger = (context: LogContext): Logger => {
  return new Logger(context);
};
