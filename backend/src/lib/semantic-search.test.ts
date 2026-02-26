import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from './prisma';
import { searchArticlesBySimilarity, findSimilarArticles } from './semantic-search';
import { generateArticleEmbedding } from './article-embedding';

vi.mock('./article-embedding', () => ({
  generateArticleEmbedding: vi.fn(),
}));

describe('semantic-search', () => {
  let testUserId: string;
  let testFeedId: string;
  let testArticleIds: string[] = [];
  let testEpisodeId: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-search-${Date.now()}@example.com`,
        tier: 'free',
      },
    });
    testUserId = user.id;

    // Create test feed
    const feed = await prisma.feed.create({
      data: {
        userId: testUserId,
        url: 'https://example.com/feed',
      },
    });
    testFeedId = feed.id;

    // Create test articles with embeddings
    const mockEmbedding1 = new Array(1536).fill(0.1);
    const mockEmbedding2 = new Array(1536).fill(0.2);
    const mockEmbedding3 = new Array(1536).fill(0.3);

    const article1 = await prisma.article.create({
      data: {
        feedId: testFeedId,
        title: 'Article about AI technology',
        content: 'Content about AI',
        summary: 'AI technology advances',
      },
    });

    const article2 = await prisma.article.create({
      data: {
        feedId: testFeedId,
        title: 'Article about machine learning',
        content: 'Content about ML',
        summary: 'Machine learning breakthroughs',
      },
    });

    const article3 = await prisma.article.create({
      data: {
        feedId: testFeedId,
        title: 'Article about cooking',
        content: 'Content about cooking',
        summary: 'Cooking recipes and tips',
      },
    });

    testArticleIds = [article1.id, article2.id, article3.id];

    // Add embeddings to articles
    await prisma.$executeRawUnsafe(
      `UPDATE articles SET embedding = $1::vector WHERE id = $2`,
      JSON.stringify(mockEmbedding1),
      article1.id
    );

    await prisma.$executeRawUnsafe(
      `UPDATE articles SET embedding = $1::vector WHERE id = $2`,
      JSON.stringify(mockEmbedding2),
      article2.id
    );

    await prisma.$executeRawUnsafe(
      `UPDATE articles SET embedding = $1::vector WHERE id = $2`,
      JSON.stringify(mockEmbedding3),
      article3.id
    );

    // Create test episode
    const episode = await prisma.episode.create({
      data: {
        userId: testUserId,
        scriptText: 'Test script',
        audioUrl: 'https://example.com/audio.mp3',
        durationMinutes: 10,
      },
    });
    testEpisodeId = episode.id;

    // Link articles to episode
    await prisma.episodeArticle.createMany({
      data: [
        { episodeId: testEpisodeId, articleId: article1.id },
        { episodeId: testEpisodeId, articleId: article2.id },
      ],
    });
  });

  describe('searchArticlesBySimilarity', () => {
    it('should search articles by semantic similarity', async () => {
      const mockQueryEmbedding = new Array(1536).fill(0.15);
      vi.mocked(generateArticleEmbedding).mockResolvedValue(mockQueryEmbedding);

      const results = await searchArticlesBySimilarity('AI and technology', 3);

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(3);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('title');
      expect(results[0]).toHaveProperty('summary');
      expect(results[0]).toHaveProperty('similarity');
      expect(generateArticleEmbedding).toHaveBeenCalledWith('AI and technology');
    });

    it('should return articles ordered by similarity score', async () => {
      const mockQueryEmbedding = new Array(1536).fill(0.15);
      vi.mocked(generateArticleEmbedding).mockResolvedValue(mockQueryEmbedding);

      const results = await searchArticlesBySimilarity('technology', 3);

      // Verify results are ordered (higher similarity first)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].similarity).toBeGreaterThanOrEqual(
          results[i + 1].similarity
        );
      }
    });

    it('should limit results to topK articles', async () => {
      const mockQueryEmbedding = new Array(1536).fill(0.15);
      vi.mocked(generateArticleEmbedding).mockResolvedValue(mockQueryEmbedding);

      const results = await searchArticlesBySimilarity('test query', 2);

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should filter by episode when episodeId is provided', async () => {
      const mockQueryEmbedding = new Array(1536).fill(0.15);
      vi.mocked(generateArticleEmbedding).mockResolvedValue(mockQueryEmbedding);

      const results = await searchArticlesBySimilarity(
        'test query',
        5,
        testEpisodeId
      );

      // Should only return articles from the episode (2 articles)
      expect(results.length).toBeLessThanOrEqual(2);
      expect(results.every((r) => testArticleIds.includes(r.id))).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(generateArticleEmbedding).mockRejectedValue(
        new Error('Embedding generation failed')
      );

      await expect(
        searchArticlesBySimilarity('test query', 5)
      ).rejects.toThrow('Failed to search articles by similarity');
    });
  });

  describe('findSimilarArticles', () => {
    it('should find similar articles to a given article', async () => {
      const results = await findSimilarArticles(testArticleIds[0], 2);

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(2);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('title');
      expect(results[0]).toHaveProperty('summary');
      expect(results[0]).toHaveProperty('similarity');
      // Should not include the source article
      expect(results.every((r) => r.id !== testArticleIds[0])).toBe(true);
    });

    it('should return articles ordered by similarity', async () => {
      const results = await findSimilarArticles(testArticleIds[0], 2);

      // Verify results are ordered (higher similarity first)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].similarity).toBeGreaterThanOrEqual(
          results[i + 1].similarity
        );
      }
    });

    it('should throw error for article without embedding', async () => {
      // Create article without embedding
      const articleWithoutEmbedding = await prisma.article.create({
        data: {
          feedId: testFeedId,
          title: 'No embedding article',
          content: 'Content',
          summary: 'Summary',
        },
      });

      await expect(
        findSimilarArticles(articleWithoutEmbedding.id, 2)
      ).rejects.toThrow('not found or has no embedding');
    });

    it('should throw error for non-existent article', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(findSimilarArticles(fakeId, 2)).rejects.toThrow(
        'not found or has no embedding'
      );
    });
  });
});
