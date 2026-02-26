import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { prisma } from './prisma';
import { openaiClient } from './openai-client';
import {
  getDurationLimitForTier,
  fetchRecentArticlesForUser,
  generateEpisodeScript,
  generateScriptHash,
  getCachedAudioUrl,
  generateEpisodeScriptWithCache,
  TIER_LIMITS,
} from './episode-script-generation';
import { UserTier } from '@prisma/client';

// Mock dependencies
vi.mock('./prisma', () => ({
  prisma: {
    article: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    episode: {
      findMany: vi.fn(),
    },
    userPreferences: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('./openai-client', () => ({
  openaiClient: {
    generateEpisodeScript: vi.fn(),
  },
}));

describe('episode-script-generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDurationLimitForTier', () => {
    it('should return 12 minutes for free tier', () => {
      const limit = getDurationLimitForTier(UserTier.free);
      expect(limit).toBe(12);
    });

    it('should return 30 minutes for pro tier', () => {
      const limit = getDurationLimitForTier(UserTier.pro);
      expect(limit).toBe(30);
    });

    it('should match TIER_LIMITS constant', () => {
      expect(getDurationLimitForTier(UserTier.free)).toBe(
        TIER_LIMITS.free.maxEpisodeDurationMinutes
      );
      expect(getDurationLimitForTier(UserTier.pro)).toBe(
        TIER_LIMITS.pro.maxEpisodeDurationMinutes
      );
    });
  });

  describe('fetchRecentArticlesForUser', () => {
    it('should fetch articles from last 48 hours by default', async () => {
      const userId = 'user-123';
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Test Article 1',
          summary: 'Summary 1',
          publishedAt: new Date(),
        },
        {
          id: 'article-2',
          title: 'Test Article 2',
          summary: 'Summary 2',
          publishedAt: new Date(),
        },
      ];

      vi.mocked(prisma.userPreferences.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.article.findMany).mockResolvedValue(mockArticles);

      const result = await fetchRecentArticlesForUser(userId);

      expect(result).toEqual(mockArticles);
      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            feed: {
              userId: userId,
            },
            summary: {
              not: null,
            },
            createdAt: {
              gte: expect.any(Date),
            },
          }),
        })
      );
    });

    it('should fetch articles from custom hours back', async () => {
      const userId = 'user-123';
      const hoursBack = 24;

      vi.mocked(prisma.userPreferences.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.article.findMany).mockResolvedValue([]);

      await fetchRecentArticlesForUser(userId, hoursBack);

      const call = vi.mocked(prisma.article.findMany).mock.calls[0][0];
      const cutoffDate = call?.where?.createdAt?.gte as Date;
      
      // Check that cutoff date is approximately 24 hours ago
      const expectedCutoff = new Date();
      expectedCutoff.setHours(expectedCutoff.getHours() - hoursBack);
      
      const timeDiff = Math.abs(cutoffDate.getTime() - expectedCutoff.getTime());
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    it('should filter out articles with null summaries', async () => {
      const userId = 'user-123';
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Test Article 1',
          summary: 'Summary 1',
          publishedAt: new Date(),
        },
        {
          id: 'article-2',
          title: 'Test Article 2',
          summary: null,
          publishedAt: new Date(),
        },
      ];

      vi.mocked(prisma.userPreferences.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.article.findMany).mockResolvedValue(mockArticles as any);

      const result = await fetchRecentArticlesForUser(userId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('article-1');
    });

    it('should order articles by publishedAt descending', async () => {
      const userId = 'user-123';

      vi.mocked(prisma.userPreferences.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.article.findMany).mockResolvedValue([]);

      await fetchRecentArticlesForUser(userId);

      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            publishedAt: 'desc',
          },
        })
      );
    });

    it('should check for user interest profile before fetching articles', async () => {
      const userId = 'user-123';
      const mockPreferences = {
        onboardingCompleted: true,
        interestProfileEmbedding: Buffer.from('mock-embedding'),
      };

      vi.mocked(prisma.userPreferences.findUnique).mockResolvedValue(mockPreferences as any);
      vi.mocked(prisma.article.findMany).mockResolvedValue([]);

      await fetchRecentArticlesForUser(userId);

      expect(prisma.userPreferences.findUnique).toHaveBeenCalledWith({
        where: { userId },
        select: {
          onboardingCompleted: true,
          interestProfileEmbedding: true,
        },
      });
    });

    it('should fetch articles for user without interest profile (fail open)', async () => {
      const userId = 'user-123';
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Test Article 1',
          summary: 'Summary 1',
          publishedAt: new Date(),
        },
      ];

      vi.mocked(prisma.userPreferences.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.article.findMany).mockResolvedValue(mockArticles);

      const result = await fetchRecentArticlesForUser(userId);

      expect(result).toEqual(mockArticles);
    });

    it('should fetch filtered articles for user with completed onboarding', async () => {
      const userId = 'user-123';
      const mockPreferences = {
        onboardingCompleted: true,
        interestProfileEmbedding: Buffer.from('mock-embedding'),
      };
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Filtered Article 1',
          summary: 'Summary 1',
          publishedAt: new Date(),
        },
      ];

      vi.mocked(prisma.userPreferences.findUnique).mockResolvedValue(mockPreferences as any);
      vi.mocked(prisma.article.findMany).mockResolvedValue(mockArticles);

      const result = await fetchRecentArticlesForUser(userId);

      // Articles in DB are already filtered by article-processing-pipeline
      expect(result).toEqual(mockArticles);
    });

    it('should handle user with onboarding completed but no embedding', async () => {
      const userId = 'user-123';
      const mockPreferences = {
        onboardingCompleted: true,
        interestProfileEmbedding: null,
      };
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Test Article 1',
          summary: 'Summary 1',
          publishedAt: new Date(),
        },
      ];

      vi.mocked(prisma.userPreferences.findUnique).mockResolvedValue(mockPreferences as any);
      vi.mocked(prisma.article.findMany).mockResolvedValue(mockArticles);

      const result = await fetchRecentArticlesForUser(userId);

      // Should still fetch articles (fail open)
      expect(result).toEqual(mockArticles);
    });
  });

  describe('generateEpisodeScript', () => {
    it('should generate script for free tier user with 12 minute limit', async () => {
      const userId = 'user-123';
      const mockUser = { tier: UserTier.free };
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Test Article 1',
          summary: 'Summary 1',
          publishedAt: new Date(),
        },
      ];
      const mockScript = 'Welcome to your news briefing...';

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.userPreferences.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.article.findMany).mockResolvedValue(mockArticles);
      vi.mocked(openaiClient.generateEpisodeScript).mockResolvedValue(mockScript);

      const result = await generateEpisodeScript(userId);

      expect(result.scriptText).toBe(mockScript);
      expect(result.articleIds).toEqual(['article-1']);
      expect(result.durationMinutes).toBe(12);
      expect(openaiClient.generateEpisodeScript).toHaveBeenCalledWith(
        [{ title: 'Test Article 1', summary: 'Summary 1' }],
        12
      );
    });

    it('should generate script for pro tier user with 30 minute limit', async () => {
      const userId = 'user-123';
      const mockUser = { tier: UserTier.pro };
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Test Article 1',
          summary: 'Summary 1',
          publishedAt: new Date(),
        },
      ];
      const mockScript = 'Welcome to your extended news briefing...';

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.userPreferences.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.article.findMany).mockResolvedValue(mockArticles);
      vi.mocked(openaiClient.generateEpisodeScript).mockResolvedValue(mockScript);

      const result = await generateEpisodeScript(userId);

      expect(result.durationMinutes).toBe(30);
      expect(openaiClient.generateEpisodeScript).toHaveBeenCalledWith(
        expect.any(Array),
        30
      );
    });

    it('should throw error if user not found', async () => {
      const userId = 'nonexistent-user';

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(generateEpisodeScript(userId)).rejects.toThrow(
        'User not found: nonexistent-user'
      );
    });

    it('should throw error if no recent articles found', async () => {
      const userId = 'user-123';
      const mockUser = { tier: UserTier.free };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.userPreferences.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.article.findMany).mockResolvedValue([]);

      await expect(generateEpisodeScript(userId)).rejects.toThrow(
        'No recent articles found for user'
      );
    });

    it('should handle multiple articles and return all article IDs', async () => {
      const userId = 'user-123';
      const mockUser = { tier: UserTier.free };
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Article 1',
          summary: 'Summary 1',
          publishedAt: new Date(),
        },
        {
          id: 'article-2',
          title: 'Article 2',
          summary: 'Summary 2',
          publishedAt: new Date(),
        },
        {
          id: 'article-3',
          title: 'Article 3',
          summary: 'Summary 3',
          publishedAt: new Date(),
        },
      ];
      const mockScript = 'Multi-article briefing...';

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.userPreferences.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.article.findMany).mockResolvedValue(mockArticles);
      vi.mocked(openaiClient.generateEpisodeScript).mockResolvedValue(mockScript);

      const result = await generateEpisodeScript(userId);

      expect(result.articleIds).toEqual(['article-1', 'article-2', 'article-3']);
      expect(openaiClient.generateEpisodeScript).toHaveBeenCalledWith(
        [
          { title: 'Article 1', summary: 'Summary 1' },
          { title: 'Article 2', summary: 'Summary 2' },
          { title: 'Article 3', summary: 'Summary 3' },
        ],
        12
      );
    });
  });

  describe('generateScriptHash', () => {
    it('should generate consistent SHA-256 hash for same input', () => {
      const scriptText = 'Welcome to your news briefing...';
      const hash1 = generateScriptHash(scriptText);
      const hash2 = generateScriptHash(scriptText);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it('should generate different hashes for different inputs', () => {
      const script1 = 'Welcome to your news briefing...';
      const script2 = 'Welcome to your extended news briefing...';

      const hash1 = generateScriptHash(script1);
      const hash2 = generateScriptHash(script2);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate valid hexadecimal hash', () => {
      const scriptText = 'Test script';
      const hash = generateScriptHash(scriptText);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('getCachedAudioUrl', () => {
    it('should return audio URL if matching script hash found', async () => {
      const scriptText = 'Welcome to your news briefing...';
      const scriptHash = generateScriptHash(scriptText);
      const mockEpisodes = [
        {
          scriptText: scriptText,
          audioUrl: 'https://example.com/audio1.mp3',
        },
      ];

      vi.mocked(prisma.episode.findMany).mockResolvedValue(mockEpisodes as any);

      const result = await getCachedAudioUrl(scriptHash);

      expect(result).toBe('https://example.com/audio1.mp3');
    });

    it('should return null if no matching script hash found', async () => {
      const scriptHash = generateScriptHash('Non-existent script');
      const mockEpisodes = [
        {
          scriptText: 'Different script',
          audioUrl: 'https://example.com/audio1.mp3',
        },
      ];

      vi.mocked(prisma.episode.findMany).mockResolvedValue(mockEpisodes as any);

      const result = await getCachedAudioUrl(scriptHash);

      expect(result).toBeNull();
    });

    it('should return null if no episodes exist', async () => {
      const scriptHash = generateScriptHash('Any script');

      vi.mocked(prisma.episode.findMany).mockResolvedValue([]);

      const result = await getCachedAudioUrl(scriptHash);

      expect(result).toBeNull();
    });

    it('should find matching script among multiple episodes', async () => {
      const targetScript = 'Target script';
      const targetHash = generateScriptHash(targetScript);
      const mockEpisodes = [
        {
          scriptText: 'Script 1',
          audioUrl: 'https://example.com/audio1.mp3',
        },
        {
          scriptText: targetScript,
          audioUrl: 'https://example.com/audio2.mp3',
        },
        {
          scriptText: 'Script 3',
          audioUrl: 'https://example.com/audio3.mp3',
        },
      ];

      vi.mocked(prisma.episode.findMany).mockResolvedValue(mockEpisodes as any);

      const result = await getCachedAudioUrl(targetHash);

      expect(result).toBe('https://example.com/audio2.mp3');
    });
  });

  describe('generateEpisodeScriptWithCache', () => {
    it('should return script with cache info when audio is cached', async () => {
      const userId = 'user-123';
      const scriptText = 'Welcome to your news briefing...';
      const mockUser = { tier: UserTier.free };
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Test Article',
          summary: 'Summary',
          publishedAt: new Date(),
        },
      ];
      const mockEpisodes = [
        {
          scriptText: scriptText,
          audioUrl: 'https://example.com/cached-audio.mp3',
        },
      ];

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.userPreferences.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.article.findMany).mockResolvedValue(mockArticles);
      vi.mocked(openaiClient.generateEpisodeScript).mockResolvedValue(scriptText);
      vi.mocked(prisma.episode.findMany).mockResolvedValue(mockEpisodes as any);

      const result = await generateEpisodeScriptWithCache(userId);

      expect(result.scriptText).toBe(scriptText);
      expect(result.articleIds).toEqual(['article-1']);
      expect(result.durationMinutes).toBe(12);
      expect(result.scriptHash).toBe(generateScriptHash(scriptText));
      expect(result.cachedAudioUrl).toBe('https://example.com/cached-audio.mp3');
    });

    it('should return null cachedAudioUrl when audio is not cached', async () => {
      const userId = 'user-123';
      const scriptText = 'New unique script...';
      const mockUser = { tier: UserTier.free };
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Test Article',
          summary: 'Summary',
          publishedAt: new Date(),
        },
      ];

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.userPreferences.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.article.findMany).mockResolvedValue(mockArticles);
      vi.mocked(openaiClient.generateEpisodeScript).mockResolvedValue(scriptText);
      vi.mocked(prisma.episode.findMany).mockResolvedValue([]);

      const result = await generateEpisodeScriptWithCache(userId);

      expect(result.scriptText).toBe(scriptText);
      expect(result.cachedAudioUrl).toBeNull();
      expect(result.scriptHash).toBe(generateScriptHash(scriptText));
    });
  });
});
