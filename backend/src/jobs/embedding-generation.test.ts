import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../lib/prisma';
import { generateArticleEmbeddingsBatch } from '../lib/article-embedding';

vi.mock('../lib/article-embedding', () => ({
  generateArticleEmbeddingsBatch: vi.fn(),
}));

describe('Embedding Generation Background Job Logic', () => {
  let testUserId: string;
  let testFeedId: string;
  let testArticleIds: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: `test-embed-${Date.now()}@example.com`,
        tier: 'free',
      },
    });
    testUserId = user.id;

    // Create a test feed
    const feed = await prisma.feed.create({
      data: {
        userId: testUserId,
        url: 'https://example.com/feed',
      },
    });
    testFeedId = feed.id;

    // Create test articles with summaries but no embeddings
    const article1 = await prisma.article.create({
      data: {
        feedId: testFeedId,
        title: 'Test Article 1',
        content: 'Content 1',
        summary: 'Summary 1',
      },
    });

    const article2 = await prisma.article.create({
      data: {
        feedId: testFeedId,
        title: 'Test Article 2',
        content: 'Content 2',
        summary: 'Summary 2',
      },
    });

    testArticleIds = [article1.id, article2.id];
  });

  it('should query articles where embedding IS NULL and summary IS NOT NULL', async () => {
    // Query articles that need embeddings using raw SQL
    const articlesToEmbed: Array<{ id: string; summary: string }> =
      await prisma.$queryRaw`
        SELECT id, summary 
        FROM articles 
        WHERE embedding IS NULL 
          AND summary IS NOT NULL
      `;

    expect(articlesToEmbed.length).toBeGreaterThanOrEqual(2);
    expect(articlesToEmbed.every((a) => a.summary !== null)).toBe(true);
  });

  it('should batch articles and generate embeddings', async () => {
    const mockEmbedding1 = new Array(1536).fill(0.1);
    const mockEmbedding2 = new Array(1536).fill(0.2);

    vi.mocked(generateArticleEmbeddingsBatch).mockResolvedValue([
      { id: testArticleIds[0], success: true, embedding: mockEmbedding1 },
      { id: testArticleIds[1], success: true, embedding: mockEmbedding2 },
    ]);

    const articlesToEmbed: Array<{ id: string; summary: string }> =
      await prisma.$queryRaw`
        SELECT id, summary 
        FROM articles 
        WHERE embedding IS NULL 
          AND summary IS NOT NULL
      `;

    const batchSize = 10;
    const batch = articlesToEmbed.slice(0, batchSize);

    const results = await generateArticleEmbeddingsBatch(
      batch.map((article) => ({
        id: article.id,
        summary: article.summary,
      }))
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it('should update article records with pgvector embeddings', async () => {
    const mockEmbedding = new Array(1536).fill(0.5);
    const embeddingJson = JSON.stringify(mockEmbedding);

    // Update article with embedding using raw SQL with proper type casting
    await prisma.$executeRawUnsafe(
      `UPDATE articles SET embedding = $1::vector WHERE id = $2`,
      embeddingJson,
      testArticleIds[0]
    );

    // Verify embedding was stored by checking if it's not null
    const result: Array<{ id: string; has_embedding: boolean }> =
      await prisma.$queryRawUnsafe(
        `SELECT id, (embedding IS NOT NULL) as has_embedding FROM articles WHERE id = $1`,
        testArticleIds[0]
      );

    expect(result.length).toBe(1);
    expect(result[0].has_embedding).toBe(true);
  });

  it('should handle embedding generation errors gracefully', async () => {
    vi.mocked(generateArticleEmbeddingsBatch).mockResolvedValue([
      {
        id: testArticleIds[0],
        success: false,
        error: 'API error',
      },
      {
        id: testArticleIds[1],
        success: false,
        error: 'Rate limit exceeded',
      },
    ]);

    const articlesToEmbed: Array<{ id: string; summary: string }> =
      await prisma.$queryRaw`
        SELECT id, summary 
        FROM articles 
        WHERE embedding IS NULL 
          AND summary IS NOT NULL
      `;

    const results = await generateArticleEmbeddingsBatch(
      articlesToEmbed.map((article) => ({
        id: article.id,
        summary: article.summary,
      }))
    );

    const errors: string[] = [];
    let totalFailed = 0;

    for (const result of results) {
      if (!result.success) {
        totalFailed++;
        errors.push(`Failed to generate embedding: ${result.error}`);
      }
    }

    expect(totalFailed).toBe(2);
    expect(errors.length).toBe(2);
  });

  it('should continue processing after individual failures', async () => {
    const mockEmbedding = new Array(1536).fill(0.3);

    vi.mocked(generateArticleEmbeddingsBatch).mockResolvedValue([
      { id: testArticleIds[0], success: true, embedding: mockEmbedding },
      { id: testArticleIds[1], success: false, error: 'API timeout' },
    ]);

    const articlesToEmbed: Array<{ id: string; summary: string }> =
      await prisma.$queryRaw`
        SELECT id, summary 
        FROM articles 
        WHERE embedding IS NULL 
          AND summary IS NOT NULL
      `;

    const results = await generateArticleEmbeddingsBatch(
      articlesToEmbed.map((article) => ({
        id: article.id,
        summary: article.summary,
      }))
    );

    let totalEmbedded = 0;
    let totalFailed = 0;

    for (const result of results) {
      if (result.success && result.embedding) {
        try {
          const embeddingJson = JSON.stringify(result.embedding);
          await prisma.$executeRawUnsafe(
            `UPDATE articles SET embedding = $1::vector WHERE id = $2`,
            embeddingJson,
            result.id
          );
          totalEmbedded++;
        } catch (error) {
          totalFailed++;
        }
      } else {
        totalFailed++;
      }
    }

    expect(totalEmbedded).toBe(1);
    expect(totalFailed).toBe(1);
  });
});
