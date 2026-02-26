import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger, createLogger, LogContext } from './logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Logger creation', () => {
    it('should create logger with context', () => {
      const context: LogContext = {
        component: 'test-component',
        userId: 'user-123',
      };
      const logger = new Logger(context);
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create logger without context', () => {
      const logger = new Logger();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create logger using factory function', () => {
      const context: LogContext = { component: 'factory-test' };
      const logger = createLogger(context);
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('Child logger', () => {
    it('should create child logger with merged context', () => {
      const parentContext: LogContext = { component: 'parent' };
      const parentLogger = new Logger(parentContext);

      const childContext: LogContext = { userId: 'user-456' };
      const childLogger = parentLogger.child(childContext);

      expect(childLogger).toBeInstanceOf(Logger);
    });
  });

  describe('Log methods', () => {
    it('should log info message', () => {
      const logger = new Logger({ component: 'test' });
      // Should not throw
      expect(() => logger.info('Test info message')).not.toThrow();
    });

    it('should log info message with data', () => {
      const logger = new Logger({ component: 'test' });
      expect(() =>
        logger.info('Test info with data', { key: 'value' })
      ).not.toThrow();
    });

    it('should log error message', () => {
      const logger = new Logger({ component: 'test' });
      const error = new Error('Test error');
      expect(() => logger.error('Test error message', error)).not.toThrow();
    });

    it('should log error message with stack trace', () => {
      const logger = new Logger({ component: 'test' });
      const error = new Error('Test error with stack');
      expect(() =>
        logger.error('Error occurred', error, { context: 'additional' })
      ).not.toThrow();
    });

    it('should log error message with non-Error object', () => {
      const logger = new Logger({ component: 'test' });
      expect(() =>
        logger.error('Error occurred', 'string error')
      ).not.toThrow();
    });

    it('should log error message without error object', () => {
      const logger = new Logger({ component: 'test' });
      expect(() => logger.error('Error occurred')).not.toThrow();
    });

    it('should log warning message', () => {
      const logger = new Logger({ component: 'test' });
      expect(() => logger.warn('Test warning')).not.toThrow();
    });

    it('should log debug message', () => {
      const logger = new Logger({ component: 'test' });
      expect(() => logger.debug('Test debug')).not.toThrow();
    });

    it('should log fatal message', () => {
      const logger = new Logger({ component: 'test' });
      const error = new Error('Fatal error');
      expect(() => logger.fatal('Fatal error occurred', error)).not.toThrow();
    });
  });

  describe('Context handling', () => {
    it('should support various context fields', () => {
      const context: LogContext = {
        component: 'api',
        userId: 'user-123',
        feedId: 'feed-456',
        articleId: 'article-789',
        episodeId: 'episode-012',
        jobId: 'job-345',
        jobType: 'fetch_articles',
        requestId: 'req-678',
      };
      const logger = new Logger(context);
      expect(() => logger.info('Test with full context')).not.toThrow();
    });

    it('should support custom context fields', () => {
      const context: LogContext = {
        component: 'custom',
        customField: 'custom-value',
        anotherField: 123,
      };
      const logger = new Logger(context);
      expect(() => logger.info('Test with custom context')).not.toThrow();
    });
  });
});
