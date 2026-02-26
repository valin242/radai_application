import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { statisticsRoutes } from './statistics';
import * as statisticsTracker from '../lib/statistics-tracker';

// Mock the modules
vi.mock('../lib/statistics-tracker');
vi.mock('../middleware/auth', () => ({
  authMiddleware: async (request: any, _reply: any) => {
    request.user = { id: 'test-user-id' };
  },
}));

describe('Statistics Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(statisticsRoutes, { prefix: '/statistics' });
    vi.clearAllMocks();
  });

  describe('GET /statistics/filtering', () => {
    it('should return filtering statistics for all time by default', async () => {
      const mockStats = {
        totalArticles: 100,
        includedArticles: 75,
        filteredOutArticles: 25,
        inclusionPercentage: 75,
      };

      vi.mocked(statisticsTracker.getFilteringStats).mockResolvedValue(mockStats);

      const response = await app.inject({
        method: 'GET',
        url: '/statistics/filtering',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user_id).toBe('test-user-id');
      expect(body.time_range).toBe('all_time');
      expect(body.total_articles).toBe(100);
      expect(body.included_articles).toBe(75);
      expect(body.filtered_out_articles).toBe(25);
      expect(body.inclusion_percentage).toBe(75);
      expect(vi.mocked(statisticsTracker.getFilteringStats)).toHaveBeenCalledWith(
        'test-user-id',
        undefined
      );
    });

    it('should return filtering statistics for last 7 days', async () => {
      const mockStats = {
        totalArticles: 50,
        includedArticles: 40,
        filteredOutArticles: 10,
        inclusionPercentage: 80,
      };

      vi.mocked(statisticsTracker.getFilteringStats).mockResolvedValue(mockStats);

      const response = await app.inject({
        method: 'GET',
        url: '/statistics/filtering?timeRange=last_7_days',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.time_range).toBe('last_7_days');
      expect(body.total_articles).toBe(50);
      expect(vi.mocked(statisticsTracker.getFilteringStats)).toHaveBeenCalledWith(
        'test-user-id',
        'last_7_days'
      );
    });

    it('should return filtering statistics for last 30 days', async () => {
      const mockStats = {
        totalArticles: 200,
        includedArticles: 150,
        filteredOutArticles: 50,
        inclusionPercentage: 75,
      };

      vi.mocked(statisticsTracker.getFilteringStats).mockResolvedValue(mockStats);

      const response = await app.inject({
        method: 'GET',
        url: '/statistics/filtering?timeRange=last_30_days',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.time_range).toBe('last_30_days');
      expect(body.total_articles).toBe(200);
      expect(vi.mocked(statisticsTracker.getFilteringStats)).toHaveBeenCalledWith(
        'test-user-id',
        'last_30_days'
      );
    });

    it('should return filtering statistics for all_time explicitly', async () => {
      const mockStats = {
        totalArticles: 300,
        includedArticles: 225,
        filteredOutArticles: 75,
        inclusionPercentage: 75,
      };

      vi.mocked(statisticsTracker.getFilteringStats).mockResolvedValue(mockStats);

      const response = await app.inject({
        method: 'GET',
        url: '/statistics/filtering?timeRange=all_time',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.time_range).toBe('all_time');
      expect(body.total_articles).toBe(300);
      expect(vi.mocked(statisticsTracker.getFilteringStats)).toHaveBeenCalledWith(
        'test-user-id',
        'all_time'
      );
    });

    it('should return 400 for invalid time range', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/statistics/filtering?timeRange=invalid_range',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_TIME_RANGE');
      expect(body.error.message).toContain('Invalid time range');
    });

    it('should return empty statistics when no data exists', async () => {
      const mockStats = {
        totalArticles: 0,
        includedArticles: 0,
        filteredOutArticles: 0,
        inclusionPercentage: 0,
      };

      vi.mocked(statisticsTracker.getFilteringStats).mockResolvedValue(mockStats);

      const response = await app.inject({
        method: 'GET',
        url: '/statistics/filtering',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.total_articles).toBe(0);
      expect(body.included_articles).toBe(0);
      expect(body.filtered_out_articles).toBe(0);
      expect(body.inclusion_percentage).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(statisticsTracker.getFilteringStats).mockRejectedValue(
        new Error('Database error')
      );

      const response = await app.inject({
        method: 'GET',
        url: '/statistics/filtering',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
