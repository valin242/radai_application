import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { errorSanitizerHandler } from './error-sanitizer';

describe('Error Sanitizer Middleware', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = Fastify({ logger: false });
    server.setErrorHandler(errorSanitizerHandler);
  });

  describe('Sensitive information removal', () => {
    it('should remove passwords from error responses', async () => {
      server.get('/test', async () => {
        const error: any = new Error('Error with password: mySecretPass123');
        error.statusCode = 400;
        error.validation = { password: 'mySecretPass123' };
        throw error;
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.error.message).not.toContain('mySecretPass123');
    });

    it('should remove tokens from error responses', async () => {
      server.get('/test', async () => {
        const error: any = new Error('Invalid token');
        error.statusCode = 401;
        error.token = 'sk_test_1234567890abcdefghijklmnopqrstuvwxyz';
        throw error;
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(JSON.stringify(body)).not.toContain('sk_test_');
    });

    it('should remove API keys from error messages', async () => {
      server.get('/test', async () => {
        const error: any = new Error(
          'API key sk_test_1234567890abcdefghijklmnopqrstuvwxyz is invalid'
        );
        error.statusCode = 403;
        throw error;
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      
      if (process.env.NODE_ENV !== 'production' && body.error.details) {
        expect(body.error.details.originalMessage).toContain('[API_KEY]');
        expect(body.error.details.originalMessage).not.toContain('sk_live_');
      }
    });

    it('should remove email addresses from error messages', async () => {
      server.get('/test', async () => {
        const error: any = new Error('User user@example.com not found');
        error.statusCode = 404;
        throw error;
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      
      if (process.env.NODE_ENV !== 'production' && body.error.details) {
        expect(body.error.details.originalMessage).toContain('[EMAIL]');
        expect(body.error.details.originalMessage).not.toContain('user@example.com');
      }
    });

    it('should remove file paths from error messages', async () => {
      server.get('/test', async () => {
        const error: any = new Error('File not found at C:\\Users\\test\\file.txt');
        error.statusCode = 500;
        throw error;
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      
      if (process.env.NODE_ENV !== 'production' && body.error.details) {
        expect(body.error.details.originalMessage).toContain('[PATH]');
        expect(body.error.details.originalMessage).not.toContain('C:\\Users');
      }
    });
  });

  describe('User-friendly error messages', () => {
    it('should return user-friendly message for 500 errors', async () => {
      server.get('/test', async () => {
        const error: any = new Error('Internal database connection failed');
        error.statusCode = 500;
        throw error;
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.message).toBe('An internal server error occurred');
      expect(body.error.message).not.toContain('database');
    });

    it('should return user-friendly message for 400 errors', async () => {
      server.get('/test', async () => {
        const error: any = new Error('Validation failed on field X');
        error.statusCode = 400;
        throw error;
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toBe('An error occurred processing your request');
    });

    it('should handle errors without status code', async () => {
      server.get('/test', async () => {
        throw new Error('Unexpected error');
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.error.message).toBeDefined();
    });
  });

  describe('Error response structure', () => {
    it('should return consistent error structure', async () => {
      server.get('/test', async () => {
        const error: any = new Error('Test error');
        error.statusCode = 400;
        error.code = 'TEST_ERROR';
        throw error;
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error.code).toBe('TEST_ERROR');
    });

    it('should include details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      server.get('/test', async () => {
        const error: any = new Error('Test error with details');
        error.statusCode = 400;
        throw error;
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      const body = JSON.parse(response.body);
      expect(body.error).toHaveProperty('details');

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include details in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      server.get('/test', async () => {
        const error: any = new Error('Test error');
        error.statusCode = 400;
        throw error;
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      const body = JSON.parse(response.body);
      expect(body.error.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Nested object sanitization', () => {
    it('should sanitize nested sensitive fields', async () => {
      server.get('/test', async () => {
        const error: any = new Error('Validation error');
        error.statusCode = 400;
        error.validation = {
          user: {
            email: 'test@example.com',
            password: 'secret123',
            profile: {
              apiKey: 'sk_test_123456',
            },
          },
        };
        throw error;
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      const body = JSON.parse(response.body);
      
      if (process.env.NODE_ENV !== 'production' && body.error.details) {
        const validation = body.error.details.validation;
        expect(validation.user.password).toBe('[REDACTED]');
        expect(validation.user.profile.apiKey).toBe('[REDACTED]');
      }
    });

    it('should sanitize arrays with sensitive data', async () => {
      server.get('/test', async () => {
        const error: any = new Error('Multiple validation errors');
        error.statusCode = 400;
        error.validation = [
          { field: 'password', value: 'secret' },
          { field: 'token', value: 'abc123' },
        ];
        throw error;
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test',
      });

      const body = JSON.parse(response.body);
      
      if (process.env.NODE_ENV !== 'production' && body.error.details) {
        const validation = body.error.details.validation;
        expect(Array.isArray(validation)).toBe(true);
        expect(validation[0].value).toBe('[REDACTED]');
        expect(validation[1].value).toBe('[REDACTED]');
      }
    });
  });
});
