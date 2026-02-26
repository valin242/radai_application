import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recordFilteringStats, getFilteringStats } from './statistics-tracker';
import { prisma } from './prisma';

// Mock prisma
vi.mock('./prisma', () => ({
  prisma: {
    filteringStatistics: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('./logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('Statistics Tracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordFilteringStats', () => {
    it('should record filtering statistics successfully', async () => {
      const userId = 'user-123';
      const included = 10;
      const filtered = 5;

      vi.mocked(prisma.filteringStatistics.create).mockResolvedValue({
        id: 'stat-123',
        userId,
        date: new Date(),
        includedArticles: included,
        filteredOutArticles: filtered,
      });

      await recordFilteringStats(userId, included, filtered);

      expect(prisma.filteringStatistics.create).toHaveBeenCalledWith({
        data: {
          userId,
          date: expect.any(Date),
          includedArticles: included,
          filteredOutArticles: filtered,
        },
      });
    });

    it('should handle recording failures gracefully', async () => {
      const userId = 'user-123';
      const included = 10;
      const filtered = 5;

      vi.mocked(prisma.filteringStatistics.create).mockRejectedValue(
        new Error('Database error')
      );

      // Should not throw
      await expect(recordFilteringStats(userId, included, filtered)).resolves.toBeUndefined();
    });
  });

  describe('getFilteringStats', () => {
    it('should return aggregated statistics for all time', async () => {
      const userId = 'user-123';
      const mockStats = [
        {
          id: 'stat-1',
          userId,
          date: new Date('2024-01-01'),
          includedArticles: 10,
          filteredOutArticles: 5,
        },
        {
          id: 'stat-2',
          userId,
          date: new Date('2024-01-02'),
          includedArticles: 8,
          filteredOutArticles: 2,
        },
      ];

      vi.mocked(prisma.filteringStatistics.findMany).mockResolvedValue(mockStats);

      const result = await getFilteringStats(userId);

      expect(result).toEqual({
        totalArticles: 25,
        includedArticles: 18,
        filteredOutArticles: 7,
        inclusionPercentage: 72,
      });
    });

    it('should filter statistics by last 7 days', async () => {
      const userId = 'user-123';
      const mockStats = [
        {
          id: 'stat-1',
          userId,
          date: new Date(),
          includedArticles: 5,
          filteredOutArticles: 3,
        },
      ];

      vi.mocked(prisma.filteringStatistics.findMany).mockResolvedValue(mockStats);

      await getFilteringStats(userId, 'last_7_days');

      expect(prisma.filteringStatistics.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          date: {
            gte: expect.any(Date),
          },
        },
      });
    });

    it('should filter statistics by last 30 days', async () => {
      const userId = 'user-123';
      const mockStats = [
        {
          id: 'stat-1',
          userId,
          date: new Date(),
          includedArticles: 5,
          filteredOutArticles: 3,
        },
      ];

      vi.mocked(prisma.filteringStatistics.findMany).mockResolvedValue(mockStats);

      await getFilteringStats(userId, 'last_30_days');

      expect(prisma.filteringStatistics.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          date: {
            gte: expect.any(Date),
          },
        },
      });
    });

    it('should handle empty statistics case', async () => {
      const userId = 'user-123';

      vi.mocked(prisma.filteringStatistics.findMany).mockResolvedValue([]);

      const result = await getFilteringStats(userId);

      expect(result).toEqual({
        totalArticles: 0,
        includedArticles: 0,
        filteredOutArticles: 0,
        inclusionPercentage: 0,
      });
    });

    it('should handle 100% filtered case', async () => {
      const userId = 'user-123';
      const mockStats = [
        {
          id: 'stat-1',
          userId,
          date: new Date(),
          includedArticles: 0,
          filteredOutArticles: 10,
        },
      ];

      vi.mocked(prisma.filteringStatistics.findMany).mockResolvedValue(mockStats);

      const result = await getFilteringStats(userId);

      expect(result).toEqual({
        totalArticles: 10,
        includedArticles: 0,
        filteredOutArticles: 10,
        inclusionPercentage: 0,
      });
    });

    it('should handle 100% included case', async () => {
      const userId = 'user-123';
      const mockStats = [
        {
          id: 'stat-1',
          userId,
          date: new Date(),
          includedArticles: 10,
          filteredOutArticles: 0,
        },
      ];

      vi.mocked(prisma.filteringStatistics.findMany).mockResolvedValue(mockStats);

      const result = await getFilteringStats(userId);

      expect(result).toEqual({
        totalArticles: 10,
        includedArticles: 10,
        filteredOutArticles: 0,
        inclusionPercentage: 100,
      });
    });

    it('should handle retrieval errors gracefully', async () => {
      const userId = 'user-123';

      vi.mocked(prisma.filteringStatistics.findMany).mockRejectedValue(
        new Error('Database error')
      );

      const result = await getFilteringStats(userId);

      expect(result).toEqual({
        totalArticles: 0,
        includedArticles: 0,
        filteredOutArticles: 0,
        inclusionPercentage: 0,
      });
    });
  });
});
