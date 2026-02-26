import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { onboardingRoutes } from './onboarding';
import * as onboardingService from '../lib/onboarding-service';
import * as feedManager from '../lib/feed-manager';

// Mock the dependencies
vi.mock('../lib/onboarding-service');
vi.mock('../lib/feed-manager');
vi.mock('../middleware/auth', () => ({
  authMiddleware: async (request: any, _reply: any) => {
    // Mock authenticated user
    request.user = { id: 'test-user-id' };
  },
}));

describe('Onboarding Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(onboardingRoutes, { prefix: '/onboarding' });
    vi.clearAllMocks();
  });

  describe('POST /onboarding', () => {
    it('should complete onboarding successfully', async () => {
      vi.mocked(onboardingService.completeOnboarding).mockResolvedValue();

      const response = await app.inject({
        method: 'POST',
        url: '/onboarding',
        payload: {
          topics: ['technology', 'finance'],
          feedIds: ['feed-1', 'feed-2'],
          customFeedUrls: ['https://example.com/rss'],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.user_id).toBe('test-user-id');
      expect(body.preferences.topics).toEqual(['technology', 'finance']);
      expect(body.preferences.onboarding_completed).toBe(true);
      expect(onboardingService.completeOnboarding).toHaveBeenCalledWith(
        'test-user-id',
        ['technology', 'finance'],
        ['feed-1', 'feed-2'],
        ['https://example.com/rss']
      );
    });

    it('should return error when no topics provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/onboarding',
        payload: {
          topics: [],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('MISSING_TOPICS');
      expect(onboardingService.completeOnboarding).not.toHaveBeenCalled();
    });

    it('should return error when topics is not an array', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/onboarding',
        payload: {
          topics: 'technology',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('MISSING_TOPICS');
    });

    it('should handle invalid RSS feed URL error', async () => {
      vi.mocked(onboardingService.completeOnboarding).mockRejectedValue(
        new Error('Invalid RSS feed URL: https://invalid.com')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/onboarding',
        payload: {
          topics: ['technology'],
          customFeedUrls: ['https://invalid.com'],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_FEED_URL');
    });

    it('should handle onboarding service errors', async () => {
      vi.mocked(onboardingService.completeOnboarding).mockRejectedValue(
        new Error('Database error')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/onboarding',
        payload: {
          topics: ['technology'],
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('ONBOARDING_FAILED');
    });
  });

  describe('GET /onboarding/status', () => {
    it('should return onboarding status when completed', async () => {
      vi.mocked(onboardingService.hasCompletedOnboarding).mockResolvedValue(true);

      const response = await app.inject({
        method: 'GET',
        url: '/onboarding/status',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user_id).toBe('test-user-id');
      expect(body.onboardingCompleted).toBe(true);
      expect(onboardingService.hasCompletedOnboarding).toHaveBeenCalledWith('test-user-id');
    });

    it('should return onboarding status when not completed', async () => {
      vi.mocked(onboardingService.hasCompletedOnboarding).mockResolvedValue(false);

      const response = await app.inject({
        method: 'GET',
        url: '/onboarding/status',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user_id).toBe('test-user-id');
      expect(body.onboardingCompleted).toBe(false);
    });

    it('should handle errors when checking status', async () => {
      vi.mocked(onboardingService.hasCompletedOnboarding).mockRejectedValue(
        new Error('Database error')
      );

      const response = await app.inject({
        method: 'GET',
        url: '/onboarding/status',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /onboarding/topics', () => {
    it('should return predefined topics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/onboarding/topics',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.topics).toBeDefined();
      expect(Array.isArray(body.topics)).toBe(true);
      expect(body.topics.length).toBe(8);
      expect(body.topics[0]).toHaveProperty('id');
      expect(body.topics[0]).toHaveProperty('name');
      expect(body.topics[0]).toHaveProperty('description');
      
      // Verify specific topics
      const topicIds = body.topics.map((t: any) => t.id);
      expect(topicIds).toContain('technology');
      expect(topicIds).toContain('finance');
      expect(topicIds).toContain('health');
    });
  });

  describe('GET /onboarding/popular-feeds', () => {
    it('should return popular feeds', async () => {
      const mockFeeds = [
        {
          id: 'feed-1',
          name: 'TechCrunch',
          url: 'https://techcrunch.com/feed/',
          category: 'technology',
          description: 'Tech news and analysis',
        },
        {
          id: 'feed-2',
          name: 'BBC News',
          url: 'https://feeds.bbci.co.uk/news/rss.xml',
          category: 'news',
          description: 'World news',
        },
      ];

      vi.mocked(feedManager.getPopularFeeds).mockResolvedValue(mockFeeds);

      const response = await app.inject({
        method: 'GET',
        url: '/onboarding/popular-feeds',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.feeds).toBeDefined();
      expect(Array.isArray(body.feeds)).toBe(true);
      expect(body.feeds.length).toBe(2);
      expect(body.feeds[0]).toEqual({
        feed_id: 'feed-1',
        name: 'TechCrunch',
        url: 'https://techcrunch.com/feed/',
        category: 'technology',
        description: 'Tech news and analysis',
      });
      expect(feedManager.getPopularFeeds).toHaveBeenCalled();
    });

    it('should handle errors when fetching popular feeds', async () => {
      vi.mocked(feedManager.getPopularFeeds).mockRejectedValue(
        new Error('Database error')
      );

      const response = await app.inject({
        method: 'GET',
        url: '/onboarding/popular-feeds',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
