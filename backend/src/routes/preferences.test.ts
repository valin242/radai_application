import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { preferencesRoutes } from './preferences';
import * as interestProfileManager from '../lib/interest-profile-manager';
import * as userPreferences from '../lib/user-preferences';

// Mock the modules
vi.mock('../lib/interest-profile-manager');
vi.mock('../lib/user-preferences');
vi.mock('../middleware/auth', () => ({
  authMiddleware: async (request: any, _reply: any) => {
    request.user = { id: 'test-user-id' };
  },
}));

describe('Preferences Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(preferencesRoutes, { prefix: '/preferences' });
    vi.clearAllMocks();
  });

  describe('GET /preferences', () => {
    it('should return user preferences', async () => {
      const mockProfile = {
        topics: ['technology', 'finance'],
        keywords: ['AI', 'blockchain'],
        relevanceThreshold: 80,
        embedding: new Array(1536).fill(0.1),
      };

      vi.mocked(interestProfileManager.getUserInterestProfile).mockResolvedValue(mockProfile);

      const response = await app.inject({
        method: 'GET',
        url: '/preferences',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user_id).toBe('test-user-id');
      expect(body.selectedTopics).toEqual(['technology', 'finance']);
      expect(body.customKeywords).toEqual(['AI', 'blockchain']);
      expect(body.relevanceThreshold).toBe(80);
    });

    it('should return 404 when preferences not found', async () => {
      vi.mocked(interestProfileManager.getUserInterestProfile).mockRejectedValue(
        new Error('User preferences not found')
      );

      const response = await app.inject({
        method: 'GET',
        url: '/preferences',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('PREFERENCES_NOT_FOUND');
    });
  });

  describe('PUT /preferences/topics', () => {
    it('should update user topics', async () => {
      const mockProfile = {
        topics: ['technology', 'science'],
        keywords: ['AI'],
        relevanceThreshold: 80,
        embedding: new Array(1536).fill(0.1),
      };

      vi.mocked(interestProfileManager.getUserInterestProfile).mockResolvedValue(mockProfile);
      vi.mocked(interestProfileManager.updateUserInterestProfile).mockResolvedValue();

      const response = await app.inject({
        method: 'PUT',
        url: '/preferences/topics',
        payload: {
          topics: ['technology', 'science'],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.selectedTopics).toEqual(['technology', 'science']);
      expect(vi.mocked(interestProfileManager.updateUserInterestProfile)).toHaveBeenCalledWith(
        'test-user-id',
        ['technology', 'science'],
        ['AI']
      );
    });

    it('should return 400 when topics are missing', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/preferences/topics',
        payload: {
          topics: [],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('MISSING_TOPICS');
    });
  });

  describe('POST /preferences/keywords', () => {
    it('should add a keyword', async () => {
      const mockProfile = {
        topics: ['technology'],
        keywords: ['AI', 'blockchain'],
        relevanceThreshold: 80,
        embedding: new Array(1536).fill(0.1),
      };

      vi.mocked(userPreferences.addKeyword).mockResolvedValue();
      vi.mocked(interestProfileManager.getUserInterestProfile).mockResolvedValue(mockProfile);

      const response = await app.inject({
        method: 'POST',
        url: '/preferences/keywords',
        payload: {
          keyword: 'blockchain',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.customKeywords).toContain('blockchain');
      expect(vi.mocked(userPreferences.addKeyword)).toHaveBeenCalledWith(
        'test-user-id',
        'blockchain'
      );
    });

    it('should return 400 when keyword is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/preferences/keywords',
        payload: {
          keyword: '',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('MISSING_KEYWORD');
    });
  });

  describe('DELETE /preferences/keywords/:keyword', () => {
    it('should remove a keyword', async () => {
      const mockProfile = {
        topics: ['technology'],
        keywords: ['AI'],
        relevanceThreshold: 80,
        embedding: new Array(1536).fill(0.1),
      };

      vi.mocked(userPreferences.removeKeyword).mockResolvedValue();
      vi.mocked(interestProfileManager.getUserInterestProfile).mockResolvedValue(mockProfile);

      const response = await app.inject({
        method: 'DELETE',
        url: '/preferences/keywords/blockchain',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.customKeywords).not.toContain('blockchain');
      expect(vi.mocked(userPreferences.removeKeyword)).toHaveBeenCalledWith(
        'test-user-id',
        'blockchain'
      );
    });

    it('should handle URL-encoded keywords', async () => {
      const mockProfile = {
        topics: ['technology'],
        keywords: ['AI'],
        relevanceThreshold: 80,
        embedding: new Array(1536).fill(0.1),
      };

      vi.mocked(userPreferences.removeKeyword).mockResolvedValue();
      vi.mocked(interestProfileManager.getUserInterestProfile).mockResolvedValue(mockProfile);

      const response = await app.inject({
        method: 'DELETE',
        url: '/preferences/keywords/machine%20learning',
      });

      expect(response.statusCode).toBe(200);
      expect(vi.mocked(userPreferences.removeKeyword)).toHaveBeenCalledWith(
        'test-user-id',
        'machine learning'
      );
    });
  });

  describe('PUT /preferences/threshold', () => {
    it('should update relevance threshold', async () => {
      const mockProfile = {
        topics: ['technology'],
        keywords: ['AI'],
        relevanceThreshold: 90,
        embedding: new Array(1536).fill(0.1),
      };

      vi.mocked(userPreferences.updateRelevanceThreshold).mockResolvedValue();
      vi.mocked(interestProfileManager.getUserInterestProfile).mockResolvedValue(mockProfile);

      const response = await app.inject({
        method: 'PUT',
        url: '/preferences/threshold',
        payload: {
          threshold: 90,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.relevanceThreshold).toBe(90);
      expect(vi.mocked(userPreferences.updateRelevanceThreshold)).toHaveBeenCalledWith(
        'test-user-id',
        90
      );
    });

    it('should return 400 when threshold is out of range', async () => {
      vi.mocked(userPreferences.updateRelevanceThreshold).mockRejectedValue(
        new Error('Relevance threshold must be between 0 and 100, got 150')
      );

      const response = await app.inject({
        method: 'PUT',
        url: '/preferences/threshold',
        payload: {
          threshold: 150,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_THRESHOLD');
    });

    it('should return 400 when threshold is not a number', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/preferences/threshold',
        payload: {
          threshold: 'invalid',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('MISSING_THRESHOLD');
    });
  });
});
