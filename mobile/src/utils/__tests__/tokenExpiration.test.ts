/**
 * Token Expiration Handling Tests
 * 
 * These tests verify that token expiration is properly detected and handled
 * according to Requirement 15.3
 */

import { authenticatedFetch, TokenExpiredError, isTokenExpiredError } from '../api';

// Mock Supabase
jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

import { supabase } from '../../config/supabase';

describe('Token Expiration Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('authenticatedFetch', () => {
    it('should throw TokenExpiredError when session is missing', async () => {
      // Mock no session
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(
        authenticatedFetch('https://api.example.com/test')
      ).rejects.toThrow(TokenExpiredError);
    });

    it('should throw TokenExpiredError when session has error', async () => {
      // Mock session error
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: new Error('Session error'),
      });

      await expect(
        authenticatedFetch('https://api.example.com/test')
      ).rejects.toThrow(TokenExpiredError);
    });

    it('should throw TokenExpiredError when token is expired', async () => {
      // Mock expired token (expires_at in the past)
      const expiredTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: {
          session: {
            access_token: 'expired-token',
            expires_at: expiredTime,
          },
        },
        error: null,
      });

      await expect(
        authenticatedFetch('https://api.example.com/test')
      ).rejects.toThrow(TokenExpiredError);

      // Verify signOut was called to clear expired token
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should throw TokenExpiredError on 401 response', async () => {
      // Mock valid session
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: {
          session: {
            access_token: 'valid-token',
            expires_at: futureTime,
          },
        },
        error: null,
      });

      // Mock 401 response from server
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 401,
        ok: false,
      });

      await expect(
        authenticatedFetch('https://api.example.com/test')
      ).rejects.toThrow(TokenExpiredError);

      // Verify signOut was called to clear expired token
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should make successful request with valid token', async () => {
      // Mock valid session
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: {
          session: {
            access_token: 'valid-token',
            expires_at: futureTime,
          },
        },
        error: null,
      });

      // Mock successful response
      const mockResponse = {
        status: 200,
        ok: true,
        json: async () => ({ data: 'test' }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const response = await authenticatedFetch('https://api.example.com/test');

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
          }),
        })
      );
    });
  });

  describe('isTokenExpiredError', () => {
    it('should return true for TokenExpiredError instances', () => {
      const error = new TokenExpiredError();
      expect(isTokenExpiredError(error)).toBe(true);
    });

    it('should return true for errors with TokenExpiredError name', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      expect(isTokenExpiredError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = new Error('Some other error');
      expect(isTokenExpiredError(error)).toBe(false);
    });
  });

  describe('TokenExpiredError', () => {
    it('should have correct name and message', () => {
      const error = new TokenExpiredError();
      expect(error.name).toBe('TokenExpiredError');
      expect(error.message).toBe('Authentication token has expired');
    });

    it('should accept custom message', () => {
      const error = new TokenExpiredError('Custom message');
      expect(error.message).toBe('Custom message');
    });
  });
});
